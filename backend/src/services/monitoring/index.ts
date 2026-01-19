/**
 * Monitoring and Observability Service
 * Collects metrics, logs, and provides system health status
 */

import { EventEmitter } from 'events';
import { SystemMetrics, LogEntry, MonitoringService as IMonitoringService, SystemStatus } from '../../types/services';
import { MetricsCollector, MetricSnapshot } from '../../utils/metrics-collector';
import { Logger, LogLevel } from '../../utils/logger';

export class MonitoringService extends EventEmitter implements IMonitoringService {
  private metricsCollector: MetricsCollector;
  private logger: Logger;
  private readonly maxMetricsHistory: number = 1000;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private currentMetrics: SystemMetrics | null = null;

  constructor(logDir: string = './logs') {
    super();
    this.metricsCollector = new MetricsCollector(this.maxMetricsHistory);
    this.logger = new Logger({
      logDir,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxRetentionDays: 30,
      enableConsole: true,
      enableFile: true,
      logLevel: 'INFO',
    });

    // Forward events
    this.metricsCollector.on('snapshot:collected', (snapshot) => {
      this.currentMetrics = this.snapshotToSystemMetrics(snapshot);
      this.emit('metrics:collected', this.currentMetrics);
    });

    this.logger.on('log:entry', (entry) => {
      this.emit('log:entry', entry);
    });
  }

  /**
   * Collect system metrics
   */
  async collectMetrics(): Promise<SystemMetrics> {
    const snapshot = this.metricsCollector.collectSnapshot();
    const metrics = this.snapshotToSystemMetrics(snapshot);
    this.currentMetrics = metrics;
    return metrics;
  }

  /**
   * Convert MetricSnapshot to SystemMetrics
   */
  private snapshotToSystemMetrics(snapshot: MetricSnapshot): SystemMetrics {
    return {
      timestamp: snapshot.timestamp,
      cpu: snapshot.cpu,
      memory: snapshot.memory,
      connections: snapshot.connections,
      activeTransfers: snapshot.activeTransfers,
      activeScreenMirrors: snapshot.activeScreenMirrors,
      networkLatency: snapshot.latency,
      networkBandwidth: snapshot.bandwidth,
    };
  }

  /**
   * Log an event
   */
  async log(level: string, component: string, message: string, context?: any): Promise<void> {
    this.logger.log(level as LogLevel, component, message, context);
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const latestMetrics = this.currentMetrics || {
      timestamp: Date.now(),
      cpu: 0,
      memory: 0,
      connections: 0,
      activeTransfers: 0,
      activeScreenMirrors: 0,
      networkLatency: 0,
      networkBandwidth: 0,
    };

    const recentErrors = this.logger.getLogsByLevel('ERROR', 10);

    const status: SystemStatus = {
      status: this.determineHealthStatus(latestMetrics),
      uptime: process.uptime(),
      metrics: latestMetrics,
      activeServices: ['file-transfer', 'screen-mirror', 'remote-control', 'monitoring'],
      errors: recentErrors,
    };

    return status;
  }

  /**
   * Export metrics in specified format
   */
  async exportMetrics(format: 'prometheus' | 'json'): Promise<string> {
    if (format === 'prometheus') {
      return this.exportPrometheus();
    } else if (format === 'json') {
      return this.exportJSON();
    }
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection(intervalMs: number = 10000): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    this.metricsCollectionInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 100): SystemMetrics[] {
    return this.metricsCollector.getSnapshots(limit).map((s) => this.snapshotToSystemMetrics(s));
  }

  /**
   * Get logs
   */
  getLogs(limit: number = 100): LogEntry[] {
    return this.logger.getLogs(limit);
  }

  /**
   * Update connection count
   */
  updateConnectionCount(count: number): void {
    let latest = this.metricsCollector.getLatestSnapshot();
    if (!latest) {
      // Initialize with first snapshot if none exists
      this.metricsCollector.collectSnapshot(0, 0, count, 0, 0);
      latest = this.metricsCollector.getLatestSnapshot();
    }
    if (latest) {
      this.metricsCollector.collectSnapshot(
        latest.latency,
        latest.bandwidth,
        count,
        latest.activeTransfers,
        latest.activeScreenMirrors
      );
      this.currentMetrics = this.snapshotToSystemMetrics(
        this.metricsCollector.getLatestSnapshot()!
      );
    }
  }

  /**
   * Update active transfers count
   */
  updateActiveTransfers(count: number): void {
    let latest = this.metricsCollector.getLatestSnapshot();
    if (!latest) {
      // Initialize with first snapshot if none exists
      this.metricsCollector.collectSnapshot(0, 0, 0, count, 0);
      latest = this.metricsCollector.getLatestSnapshot();
    }
    if (latest) {
      this.metricsCollector.collectSnapshot(
        latest.latency,
        latest.bandwidth,
        latest.connections,
        count,
        latest.activeScreenMirrors
      );
      this.currentMetrics = this.snapshotToSystemMetrics(
        this.metricsCollector.getLatestSnapshot()!
      );
    }
  }

  /**
   * Update active screen mirrors count
   */
  updateActiveScreenMirrors(count: number): void {
    let latest = this.metricsCollector.getLatestSnapshot();
    if (!latest) {
      // Initialize with first snapshot if none exists
      this.metricsCollector.collectSnapshot(0, 0, 0, 0, count);
      latest = this.metricsCollector.getLatestSnapshot();
    }
    if (latest) {
      this.metricsCollector.collectSnapshot(
        latest.latency,
        latest.bandwidth,
        latest.connections,
        latest.activeTransfers,
        count
      );
      this.currentMetrics = this.snapshotToSystemMetrics(
        this.metricsCollector.getLatestSnapshot()!
      );
    }
  }

  /**
   * Update network metrics
   */
  updateNetworkMetrics(latency: number, bandwidth: number): void {
    let latest = this.metricsCollector.getLatestSnapshot();
    if (!latest) {
      // Initialize with first snapshot if none exists
      this.metricsCollector.collectSnapshot(latency, bandwidth, 0, 0, 0);
      latest = this.metricsCollector.getLatestSnapshot();
    }
    if (latest) {
      this.metricsCollector.collectSnapshot(
        latency,
        bandwidth,
        latest.connections,
        latest.activeTransfers,
        latest.activeScreenMirrors
      );
      this.currentMetrics = this.snapshotToSystemMetrics(
        this.metricsCollector.getLatestSnapshot()!
      );
    }
  }

  /**
   * Determine system health status
   */
  private determineHealthStatus(metrics: SystemMetrics | null): 'healthy' | 'degraded' | 'unhealthy' {
    if (!metrics) {
      return 'unhealthy';
    }

    if (metrics.cpu > 80 || metrics.memory > 1024 * 1024 * 1024) {
      return 'unhealthy';
    }

    if (metrics.cpu > 60 || metrics.networkLatency > 1000) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Export metrics in Prometheus format
   */
  private exportPrometheus(): string {
    let output = '';
    const latestMetrics = this.currentMetrics;

    if (latestMetrics) {
      output += `# HELP system_cpu_usage CPU usage percentage\n`;
      output += `# TYPE system_cpu_usage gauge\n`;
      output += `system_cpu_usage ${latestMetrics.cpu}\n\n`;

      output += `# HELP system_memory_usage Memory usage in bytes\n`;
      output += `# TYPE system_memory_usage gauge\n`;
      output += `system_memory_usage ${latestMetrics.memory}\n\n`;

      output += `# HELP system_connections Active connections\n`;
      output += `# TYPE system_connections gauge\n`;
      output += `system_connections ${latestMetrics.connections}\n\n`;

      output += `# HELP system_active_transfers Active file transfers\n`;
      output += `# TYPE system_active_transfers gauge\n`;
      output += `system_active_transfers ${latestMetrics.activeTransfers}\n\n`;

      output += `# HELP system_active_screen_mirrors Active screen mirrors\n`;
      output += `# TYPE system_active_screen_mirrors gauge\n`;
      output += `system_active_screen_mirrors ${latestMetrics.activeScreenMirrors}\n\n`;

      output += `# HELP system_network_latency Network latency in milliseconds\n`;
      output += `# TYPE system_network_latency gauge\n`;
      output += `system_network_latency ${latestMetrics.networkLatency}\n\n`;

      output += `# HELP system_network_bandwidth Network bandwidth in Mbps\n`;
      output += `# TYPE system_network_bandwidth gauge\n`;
      output += `system_network_bandwidth ${latestMetrics.networkBandwidth}\n\n`;
    }

    return output;
  }

  /**
   * Export metrics in JSON format
   */
  private exportJSON(): string {
    const snapshots = this.metricsCollector.getSnapshots();
    const logs = this.logger.getLogs();

    return JSON.stringify(
      {
        metrics: snapshots.map((s) => this.snapshotToSystemMetrics(s)),
        logs,
        exportedAt: Date.now(),
      },
      null,
      2
    );
  }

  /**
   * Get metrics aggregation
   */
  getMetricsAggregation(windowMs: number = 60000) {
    return this.metricsCollector.aggregateMetrics(windowMs);
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    this.stopMetricsCollection();
    this.metricsCollector.destroy();
    this.logger.destroy();
    this.removeAllListeners();
  }
}

export default MonitoringService;
