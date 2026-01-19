/**
 * Connection Manager Service
 * Manages WebSocket connections, connection pooling, and health checks
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import {
  Connection,
  ConnectionManager as IConnectionManager,
  ConnectionMetrics,
} from '../../types/services';
import { ConnectionPool } from '../../utils/connection-pool';
import { HealthChecker } from '../../utils/health-checker';

export interface ConnectionManagerConfig {
  maxConnections?: number;
  healthCheckInterval?: number; // milliseconds
  connectionTimeout?: number; // milliseconds
  reconnectBackoffMs?: number; // milliseconds
  maxReconnectAttempts?: number;
}

export class ConnectionManager extends EventEmitter implements IConnectionManager {
  private pool: ConnectionPool;
  private healthChecker: HealthChecker;
  private config: Required<ConnectionManagerConfig>;
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: ConnectionManagerConfig = {}) {
    super();

    this.config = {
      maxConnections: config.maxConnections || 100,
      healthCheckInterval: config.healthCheckInterval || 30000,
      connectionTimeout: config.connectionTimeout || 5000,
      reconnectBackoffMs: config.reconnectBackoffMs || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 30,
    };

    // Initialize connection pool
    this.pool = new ConnectionPool({
      maxConnections: this.config.maxConnections,
      connectionTimeout: this.config.connectionTimeout,
      idleTimeout: 300000, // 5 minutes
    });

    // Initialize health checker
    this.healthChecker = new HealthChecker(
      (connectionId) => this.performHealthCheck(connectionId),
      {
        interval: this.config.healthCheckInterval,
        timeout: this.config.connectionTimeout,
        maxFailures: 3,
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Pool events
    this.pool.on('connection:added', (connection) => {
      this.emit('connection:added', connection);
    });

    this.pool.on('connection:removed', (connection) => {
      this.emit('connection:removed', connection);
      this.healthChecker.stopCheck(connection.connectionId);
    });

    this.pool.on('connection:state-changed', (event) => {
      this.emit('connection:state-changed', event);
    });

    this.pool.on('connection:metrics-updated', (event) => {
      this.emit('connection:metrics-updated', event);
    });

    // Health checker events
    this.healthChecker.on('health-check:passed', (result) => {
      this.emit('health-check:passed', result);
    });

    this.healthChecker.on('health-check:failed', (result) => {
      this.emit('health-check:failed', result);
    });

    this.healthChecker.on('health-check:unhealthy', (event) => {
      this.emit('health-check:unhealthy', event);
      this.handleUnhealthyConnection(event.connectionId);
    });
  }

  /**
   * Create a new connection
   */
  async createConnection(clientId: string): Promise<Connection> {
    // Check if pool is full
    if (this.pool.isFull()) {
      throw new Error('Connection pool is full');
    }

    const connectionId = randomUUID();
    const now = Date.now();

    const connection: Connection = {
      connectionId,
      clientId,
      protocol: 'websocket',
      state: 'connecting',
      createdAt: now,
      lastActivityAt: now,
      metrics: {
        bytesIn: 0,
        bytesOut: 0,
        messagesIn: 0,
        messagesOut: 0,
        latency: 0,
        packetLoss: 0,
      },
    };

    // Add to pool
    if (!this.pool.addConnection(connection)) {
      throw new Error('Failed to add connection to pool');
    }

    // Initialize reconnect attempts
    this.reconnectAttempts.set(connectionId, 0);

    // Start health check
    this.healthChecker.startCheck(connectionId);

    this.emit('connection:created', connection);

    return connection;
  }

  /**
   * Get a connection
   */
  async getConnection(connectionId: string): Promise<Connection> {
    const connection = this.pool.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    return connection;
  }

  /**
   * Close a connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.pool.removeConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // Clear reconnect timer
    this.clearReconnectTimer(connectionId);

    // Clear reconnect attempts
    this.reconnectAttempts.delete(connectionId);

    this.emit('connection:closed', {
      connectionId,
      reason: 'manual',
      timestamp: Date.now(),
    });
  }

  /**
   * Perform health check on a connection
   */
  private async performHealthCheck(connectionId: string): Promise<boolean> {
    try {
      const connection = this.pool.getConnection(connectionId);
      if (!connection) {
        return false;
      }

      // For now, consider connected state as healthy
      // In a real implementation, this would send a ping/pong message
      return connection.state === 'connected';
    } catch (error) {
      return false;
    }
  }

  /**
   * Health check for a connection (public method)
   */
  async healthCheck(connectionId: string): Promise<boolean> {
    try {
      const connection = this.pool.getConnection(connectionId);
      if (!connection) {
        return false;
      }

      // Perform actual health check
      const result = await this.performHealthCheck(connectionId);

      if (result) {
        // Reset failure count on success
        this.healthChecker.resetFailureCount(connectionId);
      }

      return result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle unhealthy connection
   */
  private handleUnhealthyConnection(connectionId: string): void {
    const connection = this.pool.getConnection(connectionId);
    if (!connection) {
      return;
    }

    // Update connection state to error
    this.pool.updateConnectionState(connectionId, 'error');

    // Attempt reconnection
    this.attemptReconnection(connectionId);
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(connectionId: string): void {
    const attempts = this.reconnectAttempts.get(connectionId) || 0;

    if (attempts >= this.config.maxReconnectAttempts) {
      // Max attempts reached, close connection
      this.pool.removeConnection(connectionId);
      this.emit('connection:reconnect-failed', {
        connectionId,
        attempts,
        maxAttempts: this.config.maxReconnectAttempts,
        timestamp: Date.now(),
      });
      return;
    }

    // Calculate backoff delay with exponential backoff
    // Formula: min(initialDelay * 2^attempt, maxDelay)
    const delay = Math.min(
      this.config.reconnectBackoffMs * Math.pow(2, attempts),
      30000 // max 30 seconds
    );

    this.reconnectAttempts.set(connectionId, attempts + 1);

    this.emit('connection:reconnecting', {
      connectionId,
      attemptNumber: attempts + 1,
      nextRetryIn: delay,
      timestamp: Date.now(),
    });

    // Schedule reconnection attempt
    const timer = setTimeout(() => {
      this.pool.updateConnectionState(connectionId, 'connecting');
      this.emit('connection:reconnect-attempt', {
        connectionId,
        attemptNumber: attempts + 1,
        timestamp: Date.now(),
      });
    }, delay);

    this.reconnectTimers.set(connectionId, timer);
  }

  /**
   * Mark connection as connected
   */
  markConnected(connectionId: string): void {
    const connection = this.pool.getConnection(connectionId);
    if (!connection) {
      return;
    }

    this.pool.updateConnectionState(connectionId, 'connected');

    // Reset reconnect attempts on successful connection
    this.reconnectAttempts.set(connectionId, 0);

    // Clear reconnect timer
    this.clearReconnectTimer(connectionId);

    this.emit('connection:established', {
      connectionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Mark connection as disconnected
   */
  markDisconnected(connectionId: string): void {
    const connection = this.pool.getConnection(connectionId);
    if (!connection) {
      return;
    }

    this.pool.updateConnectionState(connectionId, 'disconnected');

    this.emit('connection:lost', {
      connectionId,
      timestamp: Date.now(),
    });

    // Attempt reconnection
    this.attemptReconnection(connectionId);
  }

  /**
   * Update connection metrics
   */
  updateMetrics(
    connectionId: string,
    metrics: Partial<ConnectionMetrics>
  ): void {
    this.pool.updateConnectionMetrics(connectionId, metrics);
  }

  /**
   * Record bytes in
   */
  recordBytesIn(connectionId: string, bytes: number): void {
    const connection = this.pool.getConnection(connectionId);
    if (connection) {
      connection.metrics.bytesIn += bytes;
      connection.lastActivityAt = Date.now();
    }
  }

  /**
   * Record bytes out
   */
  recordBytesOut(connectionId: string, bytes: number): void {
    const connection = this.pool.getConnection(connectionId);
    if (connection) {
      connection.metrics.bytesOut += bytes;
      connection.lastActivityAt = Date.now();
    }
  }

  /**
   * Record message in
   */
  recordMessageIn(connectionId: string): void {
    const connection = this.pool.getConnection(connectionId);
    if (connection) {
      connection.metrics.messagesIn += 1;
      connection.lastActivityAt = Date.now();
    }
  }

  /**
   * Record message out
   */
  recordMessageOut(connectionId: string): void {
    const connection = this.pool.getConnection(connectionId);
    if (connection) {
      connection.metrics.messagesOut += 1;
      connection.lastActivityAt = Date.now();
    }
  }

  /**
   * Get all active connections
   */
  async getActiveConnections(): Promise<Connection[]> {
    return this.pool.getActiveConnections();
  }

  /**
   * Get all connections
   */
  getAllConnections(): Connection[] {
    return this.pool.getAllConnections();
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    total: number;
    active: number;
    connecting: number;
    disconnected: number;
    error: number;
    capacity: number;
    utilization: number;
  } {
    return this.pool.getStats();
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(connectionId: string): void {
    const timer = this.reconnectTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(connectionId);
    }
  }

  /**
   * Destroy the connection manager
   */
  destroy(): void {
    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Destroy health checker
    this.healthChecker.destroy();

    // Destroy pool
    this.pool.destroy();

    // Clear maps
    this.reconnectAttempts.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}
