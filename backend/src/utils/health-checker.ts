/**
 * Health Checker Implementation
 * Performs periodic health checks on connections
 */

import { EventEmitter } from 'events';

export interface HealthCheckConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  maxFailures: number;
}

export interface HealthCheckResult {
  connectionId: string;
  healthy: boolean;
  latency: number;
  timestamp: number;
  error?: string;
}

export type HealthCheckFn = (connectionId: string) => Promise<boolean>;

export class HealthChecker extends EventEmitter {
  private config: HealthCheckConfig;
  private checkFn: HealthCheckFn;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private failureCount: Map<string, number> = new Map();
  private lastCheckTime: Map<string, number> = new Map();
  private isRunning: boolean = false;

  constructor(checkFn: HealthCheckFn, config: Partial<HealthCheckConfig> = {}) {
    super();
    this.checkFn = checkFn;
    this.config = {
      interval: config.interval || 30000, // 30 seconds
      timeout: config.timeout || 5000, // 5 seconds
      maxFailures: config.maxFailures || 3,
    };
  }

  /**
   * Start health check for a connection
   */
  startCheck(connectionId: string): void {
    // Clear existing timer
    this.stopCheck(connectionId);

    // Initialize failure count
    if (!this.failureCount.has(connectionId)) {
      this.failureCount.set(connectionId, 0);
    }

    // Schedule first check
    this.scheduleCheck(connectionId);
  }

  /**
   * Stop health check for a connection
   */
  stopCheck(connectionId: string): void {
    const timer = this.timers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(connectionId);
    }
  }

  /**
   * Schedule next health check
   */
  private scheduleCheck(connectionId: string): void {
    const timer = setTimeout(() => {
      this.performCheck(connectionId);
    }, this.config.interval);

    this.timers.set(connectionId, timer);
  }

  /**
   * Perform a single health check
   */
  private async performCheck(connectionId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Health check timeout'));
        }, this.config.timeout);
      });

      // Race between check function and timeout
      const healthy = await Promise.race([
        this.checkFn(connectionId),
        timeoutPromise,
      ]);

      const latency = Date.now() - startTime;

      if (healthy) {
        // Reset failure count on success
        this.failureCount.set(connectionId, 0);

        const result: HealthCheckResult = {
          connectionId,
          healthy: true,
          latency,
          timestamp: Date.now(),
        };

        this.emit('health-check:passed', result);
      } else {
        this.handleCheckFailure(connectionId, 'Health check returned false');
      }
    } catch (error) {
      this.handleCheckFailure(
        connectionId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Schedule next check
    this.scheduleCheck(connectionId);
  }

  /**
   * Handle health check failure
   */
  private handleCheckFailure(connectionId: string, error: string): void {
    const failures = (this.failureCount.get(connectionId) || 0) + 1;
    this.failureCount.set(connectionId, failures);

    const result: HealthCheckResult = {
      connectionId,
      healthy: false,
      latency: 0,
      timestamp: Date.now(),
      error,
    };

    this.emit('health-check:failed', result);

    if (failures >= this.config.maxFailures) {
      this.emit('health-check:unhealthy', {
        connectionId,
        failures,
        maxFailures: this.config.maxFailures,
      });
    }
  }

  /**
   * Get health status for a connection
   */
  getHealthStatus(connectionId: string): {
    healthy: boolean;
    failures: number;
    lastCheckTime: number | null;
  } {
    const failures = this.failureCount.get(connectionId) || 0;
    const lastCheckTime = this.lastCheckTime.get(connectionId) || null;

    return {
      healthy: failures < this.config.maxFailures,
      failures,
      lastCheckTime,
    };
  }

  /**
   * Reset failure count for a connection
   */
  resetFailureCount(connectionId: string): void {
    this.failureCount.set(connectionId, 0);
  }

  /**
   * Stop all health checks
   */
  stopAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.isRunning = false;
  }

  /**
   * Get all monitored connections
   */
  getMonitoredConnections(): string[] {
    return Array.from(this.timers.keys());
  }

  /**
   * Destroy the health checker
   */
  destroy(): void {
    this.stopAll();
    this.failureCount.clear();
    this.lastCheckTime.clear();
    this.removeAllListeners();
  }
}
