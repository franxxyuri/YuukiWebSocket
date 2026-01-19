/**
 * Metrics Collector Implementation
 * Collects and aggregates system metrics (CPU, memory, latency, bandwidth)
 */

import { EventEmitter } from 'events';
import * as os from 'os';

export interface MetricSnapshot {
  timestamp: number;
  cpu: number; // percentage
  memory: number; // bytes
  memoryPercent: number; // percentage
  latency: number; // milliseconds
  bandwidth: number; // Mbps
  connections: number;
  activeTransfers: number;
  activeScreenMirrors: number;
}

export interface MetricAggregation {
  timestamp: number;
  cpu: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
  memory: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
  latency: {
    current: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  bandwidth: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
}

export class MetricsCollector extends EventEmitter {
  private snapshots: MetricSnapshot[] = [];
  private readonly maxSnapshots: number;
  private cpuUsageHistory: number[] = [];
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCpuTime: number = 0;

  constructor(maxSnapshots: number = 1000) {
    super();
    this.maxSnapshots = maxSnapshots;
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = Date.now();
  }

  /**
   * Collect a metric snapshot
   */
  collectSnapshot(
    latency: number = 0,
    bandwidth: number = 0,
    connections: number = 0,
    activeTransfers: number = 0,
    activeScreenMirrors: number = 0
  ): MetricSnapshot {
    const snapshot: MetricSnapshot = {
      timestamp: Date.now(),
      cpu: this.getCPUUsage(),
      memory: this.getMemoryUsage(),
      memoryPercent: this.getMemoryPercent(),
      latency,
      bandwidth,
      connections,
      activeTransfers,
      activeScreenMirrors,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this.emit('snapshot:collected', snapshot);
    return snapshot;
  }

  /**
   * Get CPU usage percentage
   */
  private getCPUUsage(): number {
    try {
      const cpuUsage = process.cpuUsage();
      const currentTime = Date.now();
      const timeDelta = currentTime - this.lastCpuTime;

      if (!this.lastCpuUsage || timeDelta === 0) {
        this.lastCpuUsage = cpuUsage;
        this.lastCpuTime = currentTime;
        return 0;
      }

      const userDelta = cpuUsage.user - this.lastCpuUsage.user;
      const systemDelta = cpuUsage.system - this.lastCpuUsage.system;
      const totalDelta = userDelta + systemDelta;

      // Convert microseconds to milliseconds and calculate percentage
      const cpuPercent = (totalDelta / (timeDelta * 1000)) * 100;

      this.lastCpuUsage = cpuUsage;
      this.lastCpuTime = currentTime;

      // Clamp to 0-100
      return Math.min(100, Math.max(0, cpuPercent));
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get memory usage in bytes
   */
  private getMemoryUsage(): number {
    try {
      return process.memoryUsage().heapUsed;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryPercent(): number {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      return (usedMemory / totalMemory) * 100;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all snapshots
   */
  getSnapshots(limit?: number): MetricSnapshot[] {
    if (limit === undefined) {
      return [...this.snapshots];
    }
    return this.snapshots.slice(-limit);
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): MetricSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Aggregate metrics over a time window
   */
  aggregateMetrics(windowMs: number = 60000): MetricAggregation | null {
    if (this.snapshots.length === 0) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    // Filter snapshots within the window
    const windowSnapshots = this.snapshots.filter(
      (s) => s.timestamp >= windowStart
    );

    if (windowSnapshots.length === 0) {
      return null;
    }

    // Extract values
    const cpuValues = windowSnapshots.map((s) => s.cpu);
    const memoryValues = windowSnapshots.map((s) => s.memory);
    const latencyValues = windowSnapshots.map((s) => s.latency);
    const bandwidthValues = windowSnapshots.map((s) => s.bandwidth);

    // Calculate statistics
    const aggregation: MetricAggregation = {
      timestamp: now,
      cpu: this.calculateStats(cpuValues),
      memory: this.calculateStats(memoryValues),
      latency: this.calculatePercentileStats(latencyValues),
      bandwidth: this.calculateStats(bandwidthValues),
    };

    return aggregation;
  }

  /**
   * Calculate basic statistics (current, average, min, max)
   */
  private calculateStats(values: number[]): {
    current: number;
    average: number;
    min: number;
    max: number;
  } {
    if (values.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 };
    }

    const current = values[values.length - 1];
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { current, average, min, max };
  }

  /**
   * Calculate statistics with percentiles
   */
  private calculatePercentileStats(values: number[]): {
    current: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    if (values.length === 0) {
      return {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const current = values[values.length - 1];
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const p50 = this.percentile(sorted, 50);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);

    return { current, average, min, max, p50, p95, p99 };
  }

  /**
   * Calculate percentile value
   */
  private percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsInRange(startTime: number, endTime: number): MetricSnapshot[] {
    return this.snapshots.filter(
      (s) => s.timestamp >= startTime && s.timestamp <= endTime
    );
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
    this.cpuUsageHistory = [];
    this.emit('collector:cleared');
  }

  /**
   * Get collector statistics
   */
  getStats(): {
    snapshotCount: number;
    maxSnapshots: number;
    oldestSnapshot: number | null;
    newestSnapshot: number | null;
  } {
    return {
      snapshotCount: this.snapshots.length,
      maxSnapshots: this.maxSnapshots,
      oldestSnapshot:
        this.snapshots.length > 0 ? this.snapshots[0].timestamp : null,
      newestSnapshot:
        this.snapshots.length > 0
          ? this.snapshots[this.snapshots.length - 1].timestamp
          : null,
    };
  }

  /**
   * Destroy the collector
   */
  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}

export default MetricsCollector;
