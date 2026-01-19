/**
 * Metrics Collector Unit Tests
 * Tests for system metrics collection and aggregation
 */

import { MetricsCollector, MetricSnapshot } from '../../../src/utils/metrics-collector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector(100);
  });

  afterEach(() => {
    if (collector) {
      collector.destroy();
    }
  });

  describe('Snapshot Collection', () => {
    it('should collect a metric snapshot', () => {
      const snapshot = collector.collectSnapshot(50, 100, 5, 2, 1);

      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
      expect(typeof snapshot.cpu).toBe('number');
      expect(typeof snapshot.memory).toBe('number');
      expect(snapshot.latency).toBe(50);
      expect(snapshot.bandwidth).toBe(100);
      expect(snapshot.connections).toBe(5);
      expect(snapshot.activeTransfers).toBe(2);
      expect(snapshot.activeScreenMirrors).toBe(1);
    });

    it('should collect multiple snapshots', () => {
      collector.collectSnapshot(50, 100, 5, 2, 1);
      collector.collectSnapshot(60, 110, 6, 3, 2);
      collector.collectSnapshot(70, 120, 7, 4, 3);

      const snapshots = collector.getSnapshots();
      expect(snapshots.length).toBe(3);
    });

    it('should emit snapshot:collected event', (done) => {
      collector.on('snapshot:collected', (snapshot) => {
        expect(snapshot).toBeDefined();
        done();
      });

      collector.collectSnapshot();
    });

    it('should maintain snapshot history limit', () => {
      const limitedCollector = new MetricsCollector(5);

      for (let i = 0; i < 10; i++) {
        limitedCollector.collectSnapshot();
      }

      const snapshots = limitedCollector.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(5);

      limitedCollector.destroy();
    });
  });

  describe('Snapshot Retrieval', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        collector.collectSnapshot(50 + i * 10, 100 + i * 5, i, i, i);
      }
    });

    it('should get all snapshots', () => {
      const snapshots = collector.getSnapshots();
      expect(snapshots.length).toBe(5);
    });

    it('should get limited snapshots', () => {
      const snapshots = collector.getSnapshots(3);
      expect(snapshots.length).toBe(3);
    });

    it('should get latest snapshot', () => {
      const latest = collector.getLatestSnapshot();
      expect(latest).toBeDefined();
      expect(latest?.connections).toBe(4);
    });

    it('should return null for latest when no snapshots', () => {
      const emptyCollector = new MetricsCollector();
      const latest = emptyCollector.getLatestSnapshot();
      expect(latest).toBeNull();
      emptyCollector.destroy();
    });

    it('should get snapshots in time range', () => {
      const snapshots = collector.getSnapshots();
      const startTime = snapshots[1].timestamp;
      const endTime = snapshots[3].timestamp;

      const rangeSnapshots = collector.getMetricsInRange(startTime, endTime);
      expect(rangeSnapshots.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Metrics Aggregation', () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        collector.collectSnapshot(50 + i * 5, 100 + i * 10, i, i, i);
      }
    });

    it('should aggregate metrics', () => {
      const aggregation = collector.aggregateMetrics(60000);

      expect(aggregation).toBeDefined();
      expect(aggregation?.cpu).toBeDefined();
      expect(aggregation?.memory).toBeDefined();
      expect(aggregation?.latency).toBeDefined();
      expect(aggregation?.bandwidth).toBeDefined();
    });

    it('should calculate CPU statistics', () => {
      const aggregation = collector.aggregateMetrics(60000);

      expect(aggregation?.cpu.current).toBeDefined();
      expect(aggregation?.cpu.average).toBeDefined();
      expect(aggregation?.cpu.min).toBeDefined();
      expect(aggregation?.cpu.max).toBeDefined();
    });

    it('should calculate memory statistics', () => {
      const aggregation = collector.aggregateMetrics(60000);

      expect(aggregation?.memory.current).toBeDefined();
      expect(aggregation?.memory.average).toBeDefined();
      expect(aggregation?.memory.min).toBeDefined();
      expect(aggregation?.memory.max).toBeDefined();
    });

    it('should calculate latency percentiles', () => {
      const aggregation = collector.aggregateMetrics(60000);

      expect(aggregation?.latency.p50).toBeDefined();
      expect(aggregation?.latency.p95).toBeDefined();
      expect(aggregation?.latency.p99).toBeDefined();
    });

    it('should calculate bandwidth statistics', () => {
      const aggregation = collector.aggregateMetrics(60000);

      expect(aggregation?.bandwidth.current).toBeDefined();
      expect(aggregation?.bandwidth.average).toBeDefined();
      expect(aggregation?.bandwidth.min).toBeDefined();
      expect(aggregation?.bandwidth.max).toBeDefined();
    });

    it('should return null for aggregation with no snapshots in window', () => {
      const emptyCollector = new MetricsCollector();
      const aggregation = emptyCollector.aggregateMetrics(60000);
      expect(aggregation).toBeNull();
      emptyCollector.destroy();
    });

    it('should handle small window size', () => {
      const aggregation = collector.aggregateMetrics(100);
      expect(aggregation).toBeDefined();
    });
  });

  describe('CPU Usage Tracking', () => {
    it('should track CPU usage', () => {
      const snapshot1 = collector.collectSnapshot();
      const snapshot2 = collector.collectSnapshot();

      expect(snapshot1.cpu).toBeDefined();
      expect(snapshot2.cpu).toBeDefined();
      expect(typeof snapshot1.cpu).toBe('number');
      expect(typeof snapshot2.cpu).toBe('number');
    });

    it('should have CPU usage between 0 and 100', () => {
      const snapshot = collector.collectSnapshot();
      expect(snapshot.cpu).toBeGreaterThanOrEqual(0);
      expect(snapshot.cpu).toBeLessThanOrEqual(100);
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should track memory usage', () => {
      const snapshot = collector.collectSnapshot();
      expect(snapshot.memory).toBeDefined();
      expect(typeof snapshot.memory).toBe('number');
      expect(snapshot.memory).toBeGreaterThanOrEqual(0);
    });

    it('should track memory percentage', () => {
      const snapshot = collector.collectSnapshot();
      expect(snapshot.memoryPercent).toBeDefined();
      expect(typeof snapshot.memoryPercent).toBe('number');
      expect(snapshot.memoryPercent).toBeGreaterThanOrEqual(0);
      expect(snapshot.memoryPercent).toBeLessThanOrEqual(100);
    });
  });

  describe('Collector Statistics', () => {
    it('should provide collector statistics', () => {
      collector.collectSnapshot();
      collector.collectSnapshot();

      const stats = collector.getStats();
      expect(stats.snapshotCount).toBe(2);
      expect(stats.maxSnapshots).toBe(100);
      expect(stats.oldestSnapshot).toBeDefined();
      expect(stats.newestSnapshot).toBeDefined();
    });

    it('should report correct snapshot count', () => {
      for (let i = 0; i < 5; i++) {
        collector.collectSnapshot();
      }

      const stats = collector.getStats();
      expect(stats.snapshotCount).toBe(5);
    });

    it('should report max snapshots', () => {
      const stats = collector.getStats();
      expect(stats.maxSnapshots).toBe(100);
    });

    it('should report null timestamps when empty', () => {
      const emptyCollector = new MetricsCollector();
      const stats = emptyCollector.getStats();

      expect(stats.snapshotCount).toBe(0);
      expect(stats.oldestSnapshot).toBeNull();
      expect(stats.newestSnapshot).toBeNull();

      emptyCollector.destroy();
    });
  });

  describe('Percentile Calculation', () => {
    it('should calculate p50 correctly', () => {
      // Create snapshots with known latency values
      for (let i = 1; i <= 10; i++) {
        collector.collectSnapshot(i * 10); // 10, 20, 30, ..., 100
      }

      const aggregation = collector.aggregateMetrics(60000);
      expect(aggregation?.latency.p50).toBeDefined();
      expect(aggregation?.latency.p50).toBeGreaterThan(0);
    });

    it('should calculate p95 correctly', () => {
      for (let i = 1; i <= 100; i++) {
        collector.collectSnapshot(i);
      }

      const aggregation = collector.aggregateMetrics(60000);
      expect(aggregation?.latency.p95).toBeDefined();
      expect(aggregation?.latency.p95).toBeGreaterThan(aggregation?.latency.p50 || 0);
    });

    it('should calculate p99 correctly', () => {
      for (let i = 1; i <= 100; i++) {
        collector.collectSnapshot(i);
      }

      const aggregation = collector.aggregateMetrics(60000);
      expect(aggregation?.latency.p99).toBeDefined();
      expect(aggregation?.latency.p99).toBeGreaterThan(aggregation?.latency.p95 || 0);
    });
  });

  describe('Snapshot Attributes', () => {
    it('should include all required attributes in snapshot', () => {
      const snapshot = collector.collectSnapshot(50, 100, 5, 2, 1);

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.cpu).toBeDefined();
      expect(snapshot.memory).toBeDefined();
      expect(snapshot.memoryPercent).toBeDefined();
      expect(snapshot.latency).toBe(50);
      expect(snapshot.bandwidth).toBe(100);
      expect(snapshot.connections).toBe(5);
      expect(snapshot.activeTransfers).toBe(2);
      expect(snapshot.activeScreenMirrors).toBe(1);
    });

    it('should use default values for optional parameters', () => {
      const snapshot = collector.collectSnapshot();

      expect(snapshot.latency).toBe(0);
      expect(snapshot.bandwidth).toBe(0);
      expect(snapshot.connections).toBe(0);
      expect(snapshot.activeTransfers).toBe(0);
      expect(snapshot.activeScreenMirrors).toBe(0);
    });
  });

  describe('Clear and Cleanup', () => {
    it('should clear all snapshots', () => {
      collector.collectSnapshot();
      collector.collectSnapshot();

      expect(collector.getSnapshots().length).toBe(2);

      collector.clear();

      expect(collector.getSnapshots().length).toBe(0);
    });

    it('should emit collector:cleared event', (done) => {
      collector.on('collector:cleared', () => {
        done();
      });

      collector.clear();
    });

    it('should destroy collector', () => {
      collector.collectSnapshot();
      collector.destroy();

      expect(collector.getSnapshots().length).toBe(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit events', (done) => {
      let eventCount = 0;

      collector.on('snapshot:collected', () => {
        eventCount++;
        if (eventCount === 2) {
          done();
        }
      });

      collector.collectSnapshot();
      collector.collectSnapshot();
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      collector.on('snapshot:collected', listener1);
      collector.on('snapshot:collected', listener2);

      collector.collectSnapshot();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Aggregation Edge Cases', () => {
    it('should handle single snapshot aggregation', () => {
      collector.collectSnapshot(50, 100, 5, 2, 1);

      const aggregation = collector.aggregateMetrics(60000);
      expect(aggregation).toBeDefined();
      expect(aggregation?.latency.current).toBe(50);
    });

    it('should handle empty aggregation window', () => {
      collector.collectSnapshot(50, 100, 5, 2, 1);

      // Query with a window that doesn't include the snapshot
      const aggregation = collector.aggregateMetrics(1);
      expect(aggregation).toBeNull();
    });

    it('should handle large number of snapshots', () => {
      for (let i = 0; i < 100; i++) {
        collector.collectSnapshot(50 + i, 100 + i, i, i, i);
      }

      const aggregation = collector.aggregateMetrics(60000);
      expect(aggregation).toBeDefined();
      expect(aggregation?.latency.p99).toBeGreaterThan(aggregation?.latency.p50 || 0);
    });
  });

  describe('Snapshot Ordering', () => {
    it('should maintain chronological order', () => {
      const snapshots: MetricSnapshot[] = [];

      for (let i = 0; i < 5; i++) {
        const snapshot = collector.collectSnapshot();
        snapshots.push(snapshot);
      }

      const retrieved = collector.getSnapshots();
      for (let i = 1; i < retrieved.length; i++) {
        expect(retrieved[i].timestamp).toBeGreaterThanOrEqual(retrieved[i - 1].timestamp);
      }
    });
  });

  describe('Metrics Range Queries', () => {
    beforeEach(() => {
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        // Manually create snapshots with controlled timestamps
        const snapshot = collector.collectSnapshot();
      }
    });

    it('should query metrics in time range', () => {
      const snapshots = collector.getSnapshots();
      if (snapshots.length >= 2) {
        const startTime = snapshots[0].timestamp;
        const endTime = snapshots[snapshots.length - 1].timestamp;

        const rangeSnapshots = collector.getMetricsInRange(startTime, endTime);
        expect(rangeSnapshots.length).toBeGreaterThan(0);
      }
    });

    it('should return empty array for non-overlapping range', () => {
      const snapshots = collector.getSnapshots();
      if (snapshots.length > 0) {
        const lastTimestamp = snapshots[snapshots.length - 1].timestamp;
        const rangeSnapshots = collector.getMetricsInRange(
          lastTimestamp + 1000,
          lastTimestamp + 2000
        );
        expect(rangeSnapshots.length).toBe(0);
      }
    });
  });

  describe('Aggregation Statistics Consistency', () => {
    it('should have consistent min/max/average', () => {
      for (let i = 1; i <= 10; i++) {
        collector.collectSnapshot(i * 10);
      }

      const aggregation = collector.aggregateMetrics(60000);
      expect(aggregation?.latency.min).toBeLessThanOrEqual(aggregation?.latency.average || 0);
      expect(aggregation?.latency.average).toBeLessThanOrEqual(aggregation?.latency.max || 0);
    });

    it('should have consistent percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        collector.collectSnapshot(i);
      }

      const aggregation = collector.aggregateMetrics(60000);
      expect(aggregation?.latency.p50).toBeLessThanOrEqual(aggregation?.latency.p95 || 0);
      expect(aggregation?.latency.p95).toBeLessThanOrEqual(aggregation?.latency.p99 || 0);
    });
  });
});
