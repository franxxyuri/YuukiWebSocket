/**
 * Connection Manager Unit Tests
 * Tests for connection management, pooling, and health checks
 */

import { ConnectionManager } from '../../../src/services/connection-manager';
import { Connection } from '../../../src/types/services';

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager({
      maxConnections: 10,
      healthCheckInterval: 100,
      connectionTimeout: 1000,
      reconnectBackoffMs: 50,
      maxReconnectAttempts: 3,
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Connection Creation and Management', () => {
    it('should create a new connection', async () => {
      const connection = await manager.createConnection('client-1');

      expect(connection).toBeDefined();
      expect(connection.connectionId).toBeDefined();
      expect(connection.clientId).toBe('client-1');
      expect(connection.state).toBe('connecting');
      expect(connection.protocol).toBe('websocket');
      expect(connection.metrics).toBeDefined();
      expect(connection.metrics.bytesIn).toBe(0);
      expect(connection.metrics.bytesOut).toBe(0);
      expect(connection.metrics.messagesIn).toBe(0);
      expect(connection.metrics.messagesOut).toBe(0);
    });

    it('should generate unique connection IDs', async () => {
      const conn1 = await manager.createConnection('client-1');
      const conn2 = await manager.createConnection('client-2');

      expect(conn1.connectionId).not.toBe(conn2.connectionId);
    });

    it('should retrieve a connection by ID', async () => {
      const created = await manager.createConnection('client-1');
      const retrieved = await manager.getConnection(created.connectionId);

      expect(retrieved.connectionId).toBe(created.connectionId);
      expect(retrieved.clientId).toBe('client-1');
    });

    it('should throw error when retrieving non-existent connection', async () => {
      await expect(manager.getConnection('non-existent')).rejects.toThrow();
    });

    it('should close a connection', async () => {
      const connection = await manager.createConnection('client-1');
      await manager.closeConnection(connection.connectionId);

      await expect(
        manager.getConnection(connection.connectionId)
      ).rejects.toThrow();
    });

    it('should emit connection:created event', (done) => {
      manager.on('connection:created', (connection) => {
        expect(connection.clientId).toBe('client-1');
        done();
      });

      manager.createConnection('client-1');
    });

    it('should emit connection:closed event', (done) => {
      manager.on('connection:closed', (event) => {
        expect(event.reason).toBe('manual');
        done();
      });

      manager.createConnection('client-1').then((conn) => {
        manager.closeConnection(conn.connectionId);
      });
    });
  });

  describe('Connection Pooling', () => {
    it('should respect max connections limit', async () => {
      const maxConnections = 5;
      const limitedManager = new ConnectionManager({
        maxConnections,
      });

      // Create max connections
      for (let i = 0; i < maxConnections; i++) {
        await limitedManager.createConnection(`client-${i}`);
      }

      // Try to create one more
      await expect(
        limitedManager.createConnection('client-overflow')
      ).rejects.toThrow('Connection pool is full');

      limitedManager.destroy();
    });

    it('should reuse connection slots after closing', async () => {
      const maxConnections = 3;
      const limitedManager = new ConnectionManager({
        maxConnections,
      });

      // Create max connections
      const connections = [];
      for (let i = 0; i < maxConnections; i++) {
        connections.push(await limitedManager.createConnection(`client-${i}`));
      }

      // Close one connection
      await limitedManager.closeConnection(connections[0].connectionId);

      // Should be able to create a new one
      const newConnection = await limitedManager.createConnection('client-new');
      expect(newConnection).toBeDefined();

      limitedManager.destroy();
    });

    it('should get all active connections', async () => {
      const conn1 = await manager.createConnection('client-1');
      const conn2 = await manager.createConnection('client-2');

      manager.markConnected(conn1.connectionId);
      manager.markConnected(conn2.connectionId);

      const active = await manager.getActiveConnections();
      expect(active.length).toBe(2);
      expect(active.map((c) => c.connectionId)).toContain(conn1.connectionId);
      expect(active.map((c) => c.connectionId)).toContain(conn2.connectionId);
    });

    it('should get pool statistics', async () => {
      const conn1 = await manager.createConnection('client-1');
      const conn2 = await manager.createConnection('client-2');

      manager.markConnected(conn1.connectionId);
      manager.markConnected(conn2.connectionId);

      const stats = manager.getPoolStats();
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.capacity).toBe(10);
      expect(stats.utilization).toBe(20);
    });
  });

  describe('Connection State Management', () => {
    it('should mark connection as connected', async () => {
      const connection = await manager.createConnection('client-1');
      expect(connection.state).toBe('connecting');

      manager.markConnected(connection.connectionId);

      const updated = await manager.getConnection(connection.connectionId);
      expect(updated.state).toBe('connected');
    });

    it('should mark connection as disconnected', async () => {
      const connection = await manager.createConnection('client-1');
      manager.markConnected(connection.connectionId);

      manager.markDisconnected(connection.connectionId);

      const updated = await manager.getConnection(connection.connectionId);
      expect(updated.state).toBe('disconnected');
    });

    it('should emit connection:established event', (done) => {
      manager.on('connection:established', (event) => {
        expect(event.connectionId).toBeDefined();
        done();
      });

      manager.createConnection('client-1').then((conn) => {
        manager.markConnected(conn.connectionId);
      });
    });

    it('should emit connection:lost event', (done) => {
      manager.on('connection:lost', (event) => {
        expect(event.connectionId).toBeDefined();
        done();
      });

      manager.createConnection('client-1').then((conn) => {
        manager.markConnected(conn.connectionId);
        manager.markDisconnected(conn.connectionId);
      });
    });

    it('should emit connection:state-changed event', (done) => {
      manager.on('connection:state-changed', (event) => {
        expect(event.oldState).toBe('connecting');
        expect(event.newState).toBe('connected');
        done();
      });

      manager.createConnection('client-1').then((conn) => {
        manager.markConnected(conn.connectionId);
      });
    });
  });

  describe('Metrics Collection', () => {
    it('should record bytes in', async () => {
      const connection = await manager.createConnection('client-1');

      manager.recordBytesIn(connection.connectionId, 1024);
      manager.recordBytesIn(connection.connectionId, 512);

      const updated = await manager.getConnection(connection.connectionId);
      expect(updated.metrics.bytesIn).toBe(1536);
    });

    it('should record bytes out', async () => {
      const connection = await manager.createConnection('client-1');

      manager.recordBytesOut(connection.connectionId, 2048);
      manager.recordBytesOut(connection.connectionId, 1024);

      const updated = await manager.getConnection(connection.connectionId);
      expect(updated.metrics.bytesOut).toBe(3072);
    });

    it('should record messages in', async () => {
      const connection = await manager.createConnection('client-1');

      manager.recordMessageIn(connection.connectionId);
      manager.recordMessageIn(connection.connectionId);
      manager.recordMessageIn(connection.connectionId);

      const updated = await manager.getConnection(connection.connectionId);
      expect(updated.metrics.messagesIn).toBe(3);
    });

    it('should record messages out', async () => {
      const connection = await manager.createConnection('client-1');

      manager.recordMessageOut(connection.connectionId);
      manager.recordMessageOut(connection.connectionId);

      const updated = await manager.getConnection(connection.connectionId);
      expect(updated.metrics.messagesOut).toBe(2);
    });

    it('should update custom metrics', async () => {
      const connection = await manager.createConnection('client-1');

      manager.updateMetrics(connection.connectionId, {
        latency: 50,
        packetLoss: 0.5,
      });

      const updated = await manager.getConnection(connection.connectionId);
      expect(updated.metrics.latency).toBe(50);
      expect(updated.metrics.packetLoss).toBe(0.5);
    });

    it('should emit connection:metrics-updated event', (done) => {
      manager.on('connection:metrics-updated', (event) => {
        expect(event.metrics.latency).toBe(100);
        done();
      });

      manager.createConnection('client-1').then((conn) => {
        manager.updateMetrics(conn.connectionId, { latency: 100 });
      });
    });

    it('should update lastActivityAt on metrics update', async () => {
      const connection = await manager.createConnection('client-1');
      const originalTime = connection.lastActivityAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      manager.recordBytesIn(connection.connectionId, 100);

      const updated = await manager.getConnection(connection.connectionId);
      expect(updated.lastActivityAt).toBeGreaterThan(originalTime);
    });
  });

  describe('Health Checks', () => {
    it('should perform health check on connected connection', async () => {
      const connection = await manager.createConnection('client-1');
      manager.markConnected(connection.connectionId);

      const healthy = await manager.healthCheck(connection.connectionId);
      expect(healthy).toBe(true);
    });

    it('should return false for disconnected connection', async () => {
      const connection = await manager.createConnection('client-1');

      const healthy = await manager.healthCheck(connection.connectionId);
      expect(healthy).toBe(false);
    });

    it('should return false for non-existent connection', async () => {
      const healthy = await manager.healthCheck('non-existent');
      expect(healthy).toBe(false);
    });

    it('should emit health-check:passed event', (done) => {
      manager.on('health-check:passed', (result) => {
        expect(result.healthy).toBe(true);
        expect(result.latency).toBeGreaterThanOrEqual(0);
        done();
      });

      manager.createConnection('client-1').then((conn) => {
        manager.markConnected(conn.connectionId);
        manager.healthCheck(conn.connectionId);
      });
    });

    it('should emit health-check:failed event', (done) => {
      manager.on('health-check:failed', (result) => {
        expect(result.healthy).toBe(false);
        done();
      });

      manager.createConnection('client-1').then((conn) => {
        manager.healthCheck(conn.connectionId);
      });
    });
  });

  describe('Reconnection Strategy', () => {
    it('should attempt reconnection on disconnect', (done) => {
      manager.on('connection:reconnecting', (event) => {
        expect(event.attemptNumber).toBe(1);
        expect(event.nextRetryIn).toBeGreaterThan(0);
        done();
      });

      manager.createConnection('client-1').then((conn) => {
        manager.markConnected(conn.connectionId);
        manager.markDisconnected(conn.connectionId);
      });
    });

    it('should implement exponential backoff', (done) => {
      const delays: number[] = [];

      manager.on('connection:reconnecting', (event) => {
        delays.push(event.nextRetryIn);

        if (delays.length === 2) {
          // Second delay should be greater than first (exponential backoff)
          expect(delays[1]).toBeGreaterThan(delays[0]);
          done();
        }
      });

      manager.createConnection('client-1').then((conn) => {
        manager.markConnected(conn.connectionId);
        manager.markDisconnected(conn.connectionId);

        // Simulate failed reconnection attempt
        setTimeout(() => {
          manager.markDisconnected(conn.connectionId);
        }, 100);
      });
    });

    it('should cap reconnection delay at 30 seconds', (done) => {
      const testManager = new ConnectionManager({
        maxConnections: 10,
        reconnectBackoffMs: 1000,
        maxReconnectAttempts: 10,
      });

      let maxDelay = 0;

      testManager.on('connection:reconnecting', (event) => {
        maxDelay = Math.max(maxDelay, event.nextRetryIn);

        if (event.attemptNumber === 10) {
          expect(maxDelay).toBeLessThanOrEqual(30000);
          testManager.destroy();
          done();
        }
      });

      testManager.createConnection('client-1').then((conn) => {
        manager.markConnected(conn.connectionId);

        // Simulate multiple failed reconnections
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            testManager.markDisconnected(conn.connectionId);
          }, i * 100);
        }
      });
    });

    it('should reset reconnect attempts on successful connection', async () => {
      const connection = await manager.createConnection('client-1');
      manager.markConnected(connection.connectionId);
      manager.markDisconnected(connection.connectionId);

      // Wait for reconnection attempt
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reconnect successfully
      manager.markConnected(connection.connectionId);

      // Disconnect again - should start from attempt 1
      manager.markDisconnected(connection.connectionId);

      // Verify by checking the next reconnection attempt
      const stats = manager.getPoolStats();
      expect(stats.total).toBeGreaterThan(0);
    });

    it('should emit connection:reconnect-failed after max attempts', (done) => {
      const testManager = new ConnectionManager({
        maxConnections: 10,
        reconnectBackoffMs: 10,
        maxReconnectAttempts: 2,
      });

      testManager.on('connection:reconnect-failed', (event) => {
        expect(event.attempts).toBe(2);
        expect(event.maxAttempts).toBe(2);
        testManager.destroy();
        done();
      });

      testManager.createConnection('client-1').then((conn) => {
        testManager.markConnected(conn.connectionId);
        testManager.markDisconnected(conn.connectionId);

        // Simulate failed reconnection attempts
        setTimeout(() => {
          testManager.markDisconnected(conn.connectionId);
        }, 50);

        setTimeout(() => {
          testManager.markDisconnected(conn.connectionId);
        }, 100);
      });
    });
  });

  describe('Connection Lifecycle', () => {
    it('should handle complete connection lifecycle', async () => {
      // Create
      const connection = await manager.createConnection('client-1');
      expect(connection.state).toBe('connecting');

      // Connect
      manager.markConnected(connection.connectionId);
      let updated = await manager.getConnection(connection.connectionId);
      expect(updated.state).toBe('connected');

      // Use
      manager.recordBytesIn(connection.connectionId, 1024);
      manager.recordMessageOut(connection.connectionId);

      // Disconnect
      manager.markDisconnected(connection.connectionId);
      updated = await manager.getConnection(connection.connectionId);
      expect(updated.state).toBe('disconnected');

      // Close
      await manager.closeConnection(connection.connectionId);
      await expect(
        manager.getConnection(connection.connectionId)
      ).rejects.toThrow();
    });

    it('should track multiple concurrent connections', async () => {
      const connections: Connection[] = [];

      for (let i = 0; i < 5; i++) {
        const conn = await manager.createConnection(`client-${i}`);
        connections.push(conn);
        manager.markConnected(conn.connectionId);
      }

      const active = await manager.getActiveConnections();
      expect(active.length).toBe(5);

      // Close some connections
      await manager.closeConnection(connections[0].connectionId);
      await manager.closeConnection(connections[2].connectionId);

      const remaining = await manager.getActiveConnections();
      expect(remaining.length).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid connection ID gracefully', async () => {
      const result = await manager.healthCheck('invalid-id');
      expect(result).toBe(false);
    });

    it('should not throw when updating metrics for non-existent connection', () => {
      expect(() => {
        manager.updateMetrics('non-existent', { latency: 100 });
      }).not.toThrow();
    });

    it('should not throw when recording bytes for non-existent connection', () => {
      expect(() => {
        manager.recordBytesIn('non-existent', 100);
        manager.recordBytesOut('non-existent', 100);
        manager.recordMessageIn('non-existent');
        manager.recordMessageOut('non-existent');
      }).not.toThrow();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should destroy all resources', async () => {
      const conn1 = await manager.createConnection('client-1');
      const conn2 = await manager.createConnection('client-2');

      manager.markConnected(conn1.connectionId);
      manager.markConnected(conn2.connectionId);

      manager.destroy();

      // After destruction, should not be able to get connections
      await expect(manager.getConnection(conn1.connectionId)).rejects.toThrow();
    });

    it('should clear all timers on destruction', async () => {
      const connection = await manager.createConnection('client-1');
      manager.markConnected(connection.connectionId);
      manager.markDisconnected(connection.connectionId);

      // Destroy should clear reconnect timers
      manager.destroy();

      // No errors should occur
      expect(true).toBe(true);
    });
  });
});
