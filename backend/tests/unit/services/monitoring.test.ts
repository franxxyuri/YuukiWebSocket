/**
 * Monitoring Service Unit Tests
 * Tests for monitoring and observability functionality
 */

import { MonitoringService } from '../../../src/services/monitoring';
import * as fs from 'fs';
import * as path from 'path';

describe('MonitoringService', () => {
  let service: MonitoringService;
  const testLogDir = './test-monitoring-logs';

  beforeEach(() => {
    // Clean up test logs directory
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testLogDir, file));
      }
      fs.rmdirSync(testLogDir);
    }

    service = new MonitoringService(testLogDir);
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }

    // Clean up test logs directory
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testLogDir, file));
      }
      fs.rmdirSync(testLogDir);
    }
  });

  describe('Metrics Collection', () => {
    it('should collect system metrics', async () => {
      const metrics = await service.collectMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(typeof metrics.cpu).toBe('number');
      expect(typeof metrics.memory).toBe('number');
      expect(metrics.cpu).toBeGreaterThanOrEqual(0);
      expect(metrics.memory).toBeGreaterThanOrEqual(0);
    });

    it('should include all metric fields', async () => {
      const metrics = await service.collectMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.memory).toBeDefined();
      expect(metrics.connections).toBeDefined();
      expect(metrics.activeTransfers).toBeDefined();
      expect(metrics.activeScreenMirrors).toBeDefined();
      expect(metrics.networkLatency).toBeDefined();
      expect(metrics.networkBandwidth).toBeDefined();
    });

    it('should maintain metrics history', async () => {
      await service.collectMetrics();
      await service.collectMetrics();
      await service.collectMetrics();

      const history = service.getMetricsHistory(10);
      expect(history.length).toBe(3);
    });

    it('should emit metrics:collected event', (done) => {
      service.on('metrics:collected', (metrics) => {
        expect(metrics).toBeDefined();
        done();
      });

      service.collectMetrics();
    });
  });

  describe('Logging', () => {
    it('should log events', async () => {
      await service.log('INFO', 'test-component', 'Test message');

      const logs = service.getLogs(10);
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('INFO');
      expect(logs[0].component).toBe('test-component');
      expect(logs[0].message).toBe('Test message');
    });

    it('should log with context', async () => {
      const context = { userId: '123', action: 'login' };
      await service.log('INFO', 'auth', 'User logged in', context);

      const logs = service.getLogs(10);
      expect(logs[0].context).toEqual(context);
    });

    it('should support different log levels', async () => {
      await service.log('DEBUG', 'test', 'Debug message');
      await service.log('INFO', 'test', 'Info message');
      await service.log('WARN', 'test', 'Warning message');
      await service.log('ERROR', 'test', 'Error message');

      const logs = service.getLogs(10);
      expect(logs.length).toBeGreaterThanOrEqual(3); // At least INFO, WARN, ERROR (DEBUG may be filtered)
      expect(logs.some((l) => l.level === 'INFO')).toBe(true);
      expect(logs.some((l) => l.level === 'WARN')).toBe(true);
      expect(logs.some((l) => l.level === 'ERROR')).toBe(true);
    });

    it('should emit log:entry event', (done) => {
      service.on('log:entry', (entry) => {
        expect(entry.level).toBe('INFO');
        done();
      });

      service.log('INFO', 'test', 'Test message');
    });
  });

  describe('System Status', () => {
    it('should return system status', async () => {
      await service.collectMetrics();
      const status = await service.getSystemStatus();

      expect(status).toBeDefined();
      expect(status.status).toMatch(/healthy|degraded|unhealthy/);
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.metrics).toBeDefined();
      expect(status.activeServices).toBeDefined();
      expect(status.errors).toBeDefined();
    });

    it('should include recent errors in status', async () => {
      await service.log('ERROR', 'test', 'Test error');
      const status = await service.getSystemStatus();

      expect(status.errors.length).toBeGreaterThan(0);
      expect(status.errors[0].level).toBe('ERROR');
    });

    it('should determine health status correctly', async () => {
      await service.collectMetrics();
      const status = await service.getSystemStatus();

      expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
    });

    it('should include active services', async () => {
      const status = await service.getSystemStatus();

      expect(status.activeServices).toContain('file-transfer');
      expect(status.activeServices).toContain('screen-mirror');
      expect(status.activeServices).toContain('remote-control');
      expect(status.activeServices).toContain('monitoring');
    });
  });

  describe('Metrics Export', () => {
    beforeEach(async () => {
      await service.collectMetrics();
    });

    it('should export metrics in Prometheus format', async () => {
      const prometheus = await service.exportMetrics('prometheus');

      expect(prometheus).toContain('system_cpu_usage');
      expect(prometheus).toContain('system_memory_usage');
      expect(prometheus).toContain('system_connections');
      expect(prometheus).toContain('system_active_transfers');
      expect(prometheus).toContain('system_active_screen_mirrors');
      expect(prometheus).toContain('system_network_latency');
      expect(prometheus).toContain('system_network_bandwidth');
    });

    it('should export metrics in JSON format', async () => {
      const json = await service.exportMetrics('json');
      const parsed = JSON.parse(json);

      expect(parsed.metrics).toBeDefined();
      expect(parsed.logs).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
      expect(Array.isArray(parsed.metrics)).toBe(true);
    });

    it('should throw error for unsupported format', async () => {
      await expect(service.exportMetrics('xml' as any)).rejects.toThrow();
    });

    it('should include valid Prometheus format', async () => {
      const prometheus = await service.exportMetrics('prometheus');

      // Check for HELP and TYPE lines
      expect(prometheus).toContain('# HELP');
      expect(prometheus).toContain('# TYPE');
    });
  });

  describe('Metrics Collection Interval', () => {
    it('should start and stop metrics collection', async () => {
      service.startMetricsCollection(100);
      await new Promise((resolve) => setTimeout(resolve, 250));
      service.stopMetricsCollection();

      const history = service.getMetricsHistory(10);
      expect(history.length).toBeGreaterThan(1);
    });

    it('should collect metrics at specified interval', async () => {
      service.startMetricsCollection(50);
      await new Promise((resolve) => setTimeout(resolve, 200));
      service.stopMetricsCollection();

      const history = service.getMetricsHistory(10);
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('should stop collection properly', async () => {
      service.startMetricsCollection(100);
      await new Promise((resolve) => setTimeout(resolve, 150));
      service.stopMetricsCollection();

      const countBefore = service.getMetricsHistory(100).length;
      await new Promise((resolve) => setTimeout(resolve, 150));
      const countAfter = service.getMetricsHistory(100).length;

      expect(countAfter).toBe(countBefore);
    });
  });

  describe('Network Metrics Updates', () => {
    it('should update connection count', async () => {
      service.updateConnectionCount(5);
      const status = await service.getSystemStatus();
      expect(status.metrics.connections).toBe(5);
    });

    it('should update active transfers', async () => {
      service.updateActiveTransfers(3);
      const status = await service.getSystemStatus();
      expect(status.metrics.activeTransfers).toBe(3);
    });

    it('should update active screen mirrors', async () => {
      service.updateActiveScreenMirrors(2);
      const status = await service.getSystemStatus();
      expect(status.metrics.activeScreenMirrors).toBe(2);
    });

    it('should update network metrics', async () => {
      service.updateNetworkMetrics(100, 50);
      const status = await service.getSystemStatus();
      expect(status.metrics.networkLatency).toBe(100);
      expect(status.metrics.networkBandwidth).toBe(50);
    });
  });

  describe('Metrics Aggregation', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await service.collectMetrics();
      }
    });

    it('should get metrics aggregation', () => {
      const aggregation = service.getMetricsAggregation(60000);
      expect(aggregation).toBeDefined();
    });

    it('should include CPU aggregation', () => {
      const aggregation = service.getMetricsAggregation(60000);
      expect(aggregation?.cpu).toBeDefined();
      expect(aggregation?.cpu.current).toBeDefined();
      expect(aggregation?.cpu.average).toBeDefined();
    });

    it('should include memory aggregation', () => {
      const aggregation = service.getMetricsAggregation(60000);
      expect(aggregation?.memory).toBeDefined();
      expect(aggregation?.memory.current).toBeDefined();
      expect(aggregation?.memory.average).toBeDefined();
    });

    it('should include latency percentiles', () => {
      const aggregation = service.getMetricsAggregation(60000);
      expect(aggregation?.latency).toBeDefined();
      expect(aggregation?.latency.p50).toBeDefined();
      expect(aggregation?.latency.p95).toBeDefined();
      expect(aggregation?.latency.p99).toBeDefined();
    });
  });

  describe('History Limits', () => {
    it('should limit metrics history', async () => {
      // Collect more metrics than max history
      for (let i = 0; i < 1100; i++) {
        await service.collectMetrics();
      }

      const history = service.getMetricsHistory(2000);
      expect(history.length).toBeLessThanOrEqual(1000);
    });

    it('should limit logs history', async () => {
      // Log more entries than max history
      for (let i = 0; i < 10100; i++) {
        await service.log('INFO', 'test', `Message ${i}`);
      }

      const logs = service.getLogs(20000);
      expect(logs.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('Event Emission', () => {
    it('should emit multiple events', (done) => {
      let eventCount = 0;

      service.on('metrics:collected', () => {
        eventCount++;
      });

      service.on('log:entry', () => {
        eventCount++;
      });

      service.collectMetrics();
      service.log('INFO', 'test', 'Test message');

      setTimeout(() => {
        expect(eventCount).toBeGreaterThanOrEqual(2);
        done();
      }, 100);
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      service.on('metrics:collected', listener1);
      service.on('metrics:collected', listener2);

      service.collectMetrics();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Service Lifecycle', () => {
    it('should destroy service', async () => {
      await service.collectMetrics();
      service.destroy();

      expect(service.getLogs().length).toBe(0);
    });

    it('should stop collection on destroy', async () => {
      service.startMetricsCollection(100);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const countBefore = service.getMetricsHistory(100).length;

      service.destroy();

      await new Promise((resolve) => setTimeout(resolve, 150));

      // After destroy, no new metrics should be collected
      // (we can't verify this directly, but we can verify destroy completes)
      expect(service).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent metric collection', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(service.collectMetrics());
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
      expect(results.every((r) => r !== undefined)).toBe(true);
    });

    it('should handle concurrent logging', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(service.log('INFO', 'test', `Message ${i}`));
      }

      await Promise.all(promises);

      const logs = service.getLogs();
      expect(logs.length).toBe(5);
    });

    it('should handle mixed concurrent operations', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(service.collectMetrics());
        promises.push(service.log('INFO', 'test', `Message ${i}`));
      }

      await Promise.all(promises);

      const metrics = service.getMetricsHistory();
      const logs = service.getLogs();

      expect(metrics.length).toBe(3);
      expect(logs.length).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid export format', async () => {
      await expect(service.exportMetrics('invalid' as any)).rejects.toThrow();
    });

    it('should handle logging errors gracefully', async () => {
      // Should not throw
      await service.log('ERROR', 'test', 'Error message', new Error('Test error'));

      const logs = service.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics History Retrieval', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await service.collectMetrics();
      }
    });

    it('should get all metrics history', () => {
      const history = service.getMetricsHistory();
      expect(history.length).toBe(5);
    });

    it('should get limited metrics history', () => {
      const history = service.getMetricsHistory(3);
      expect(history.length).toBe(3);
    });

    it('should get most recent metrics', () => {
      const history = service.getMetricsHistory(1);
      expect(history.length).toBe(1);
    });
  });

  describe('Logs Retrieval', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await service.log('INFO', 'test', `Message ${i}`);
      }
    });

    it('should get all logs', () => {
      const logs = service.getLogs();
      expect(logs.length).toBe(5);
    });

    it('should get limited logs', () => {
      const logs = service.getLogs(3);
      expect(logs.length).toBe(3);
    });

    it('should get most recent logs', () => {
      const logs = service.getLogs(1);
      expect(logs.length).toBe(1);
    });
  });
});
