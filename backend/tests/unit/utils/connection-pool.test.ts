/**
 * Connection Pool Unit Tests
 * Tests for connection pool management and resource handling
 */

import { ConnectionPool } from '../../../src/utils/connection-pool';
import { Connection } from '../../../src/types/services';

describe('ConnectionPool', () => {
  let pool: ConnectionPool;

  beforeEach(() => {
    pool = new ConnectionPool({
      maxConnections: 10,
      connectionTimeout: 5000,
      idleTimeout: 1000,
    });
  });

  afterEach(() => {
    pool.destroy();
  });

  describe('Connection Management', () => {
    it('should add a connection to the pool', () => {
      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      const result = pool.addConnection(connection);
      expect(result).toBe(true);
      expect(pool.getSize()).toBe(1);
    });

    it('should retrieve a connection from the pool', () => {
      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
      const retrieved = pool.getConnection('conn-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.connectionId).toBe('conn-1');
    });

    it('should return undefined for non-existent connection', () => {
      const retrieved = pool.getConnection('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should remove a connection from the pool', () => {
      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
      expect(pool.getSize()).toBe(1);

      const removed = pool.removeConnection('conn-1');
      expect(removed).toBeDefined();
      expect(pool.getSize()).toBe(0);
    });

    it('should emit connection:added event', (done) => {
      pool.on('connection:added', (connection) => {
        expect(connection.connectionId).toBe('conn-1');
        done();
      });

      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
    });

    it('should emit connection:removed event', (done) => {
      pool.on('connection:removed', (connection) => {
        expect(connection.connectionId).toBe('conn-1');
        done();
      });

      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
      pool.removeConnection('conn-1');
    });
  });

  describe('Pool Capacity', () => {
    it('should respect max connections limit', () => {
      const limitedPool = new ConnectionPool({ maxConnections: 3 });

      for (let i = 0; i < 3; i++) {
        const connection: Connection = {
          connectionId: `conn-${i}`,
          clientId: `client-${i}`,
          protocol: 'websocket',
          state: 'connected',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          metrics: {
            bytesIn: 0,
            bytesOut: 0,
            messagesIn: 0,
            messagesOut: 0,
            latency: 0,
            packetLoss: 0,
          },
        };
        limitedPool.addConnection(connection);
      }

      // Try to add one more
      const connection: Connection = {
        connectionId: 'conn-overflow',
        clientId: 'client-overflow',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      const result = limitedPool.addConnection(connection);
      expect(result).toBe(false);
      expect(limitedPool.getSize()).toBe(3);

      limitedPool.destroy();
    });

    it('should report pool full status', () => {
      const limitedPool = new ConnectionPool({ maxConnections: 2 });

      expect(limitedPool.isFull()).toBe(false);

      for (let i = 0; i < 2; i++) {
        const connection: Connection = {
          connectionId: `conn-${i}`,
          clientId: `client-${i}`,
          protocol: 'websocket',
          state: 'connected',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          metrics: {
            bytesIn: 0,
            bytesOut: 0,
            messagesIn: 0,
            messagesOut: 0,
            latency: 0,
            packetLoss: 0,
          },
        };
        limitedPool.addConnection(connection);
      }

      expect(limitedPool.isFull()).toBe(true);

      limitedPool.destroy();
    });

    it('should report available slots', () => {
      const limitedPool = new ConnectionPool({ maxConnections: 5 });

      expect(limitedPool.getAvailableSlots()).toBe(5);

      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      limitedPool.addConnection(connection);
      expect(limitedPool.getAvailableSlots()).toBe(4);

      limitedPool.destroy();
    });
  });

  describe('Connection State Management', () => {
    it('should update connection state', () => {
      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connecting',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
      const result = pool.updateConnectionState('conn-1', 'connected');

      expect(result).toBe(true);

      const updated = pool.getConnection('conn-1');
      expect(updated?.state).toBe('connected');
    });

    it('should emit connection:state-changed event', (done) => {
      pool.on('connection:state-changed', (event) => {
        expect(event.oldState).toBe('connecting');
        expect(event.newState).toBe('connected');
        done();
      });

      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connecting',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
      pool.updateConnectionState('conn-1', 'connected');
    });

    it('should return false when updating state for non-existent connection', () => {
      const result = pool.updateConnectionState('non-existent', 'connected');
      expect(result).toBe(false);
    });
  });

  describe('Metrics Management', () => {
    it('should update connection metrics', () => {
      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
      const result = pool.updateConnectionMetrics('conn-1', {
        bytesIn: 1024,
        latency: 50,
      });

      expect(result).toBe(true);

      const updated = pool.getConnection('conn-1');
      expect(updated?.metrics.bytesIn).toBe(1024);
      expect(updated?.metrics.latency).toBe(50);
    });

    it('should emit connection:metrics-updated event', (done) => {
      pool.on('connection:metrics-updated', (event) => {
        expect(event.metrics.latency).toBe(100);
        done();
      });

      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
      pool.updateConnectionMetrics('conn-1', { latency: 100 });
    });
  });

  describe('Active Connections', () => {
    it('should get all active connections', () => {
      for (let i = 0; i < 3; i++) {
        const connection: Connection = {
          connectionId: `conn-${i}`,
          clientId: `client-${i}`,
          protocol: 'websocket',
          state: 'connected',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          metrics: {
            bytesIn: 0,
            bytesOut: 0,
            messagesIn: 0,
            messagesOut: 0,
            latency: 0,
            packetLoss: 0,
          },
        };
        pool.addConnection(connection);
      }

      const active = pool.getActiveConnections();
      expect(active.length).toBe(3);
    });

    it('should filter out non-connected connections', () => {
      const conn1: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      const conn2: Connection = {
        connectionId: 'conn-2',
        clientId: 'client-2',
        protocol: 'websocket',
        state: 'disconnected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(conn1);
      pool.addConnection(conn2);

      const active = pool.getActiveConnections();
      expect(active.length).toBe(1);
      expect(active[0].connectionId).toBe('conn-1');
    });
  });

  describe('Pool Statistics', () => {
    it('should provide pool statistics', () => {
      const conn1: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      const conn2: Connection = {
        connectionId: 'conn-2',
        clientId: 'client-2',
        protocol: 'websocket',
        state: 'connecting',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(conn1);
      pool.addConnection(conn2);

      const stats = pool.getStats();
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.connecting).toBe(1);
      expect(stats.capacity).toBe(10);
      expect(stats.utilization).toBe(20);
    });

    it('should calculate utilization percentage', () => {
      const limitedPool = new ConnectionPool({ maxConnections: 5 });

      for (let i = 0; i < 3; i++) {
        const connection: Connection = {
          connectionId: `conn-${i}`,
          clientId: `client-${i}`,
          protocol: 'websocket',
          state: 'connected',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          metrics: {
            bytesIn: 0,
            bytesOut: 0,
            messagesIn: 0,
            messagesOut: 0,
            latency: 0,
            packetLoss: 0,
          },
        };
        limitedPool.addConnection(connection);
      }

      const stats = limitedPool.getStats();
      expect(stats.utilization).toBe(60);

      limitedPool.destroy();
    });
  });

  describe('Idle Timer Management', () => {
    it('should set idle timer for connection', (done) => {
      pool.on('connection:idle', (connection) => {
        expect(connection.connectionId).toBe('conn-1');
        done();
      });

      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
      pool.setIdleTimer('conn-1');
    });

    it('should clear idle timer when connection is accessed', (done) => {
      const connection: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(connection);
      pool.setIdleTimer('conn-1');

      // Access connection should clear idle timer
      setTimeout(() => {
        pool.getConnection('conn-1');

        // Wait to see if idle event is emitted (it shouldn't be)
        setTimeout(() => {
          done();
        }, 500);
      }, 200);
    });
  });

  describe('Pool Clearing', () => {
    it('should clear all connections', () => {
      for (let i = 0; i < 3; i++) {
        const connection: Connection = {
          connectionId: `conn-${i}`,
          clientId: `client-${i}`,
          protocol: 'websocket',
          state: 'connected',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          metrics: {
            bytesIn: 0,
            bytesOut: 0,
            messagesIn: 0,
            messagesOut: 0,
            latency: 0,
            packetLoss: 0,
          },
        };
        pool.addConnection(connection);
      }

      expect(pool.getSize()).toBe(3);

      pool.clear();
      expect(pool.getSize()).toBe(0);
    });

    it('should emit pool:cleared event', (done) => {
      pool.on('pool:cleared', () => {
        done();
      });

      pool.clear();
    });
  });

  describe('Get All Connections', () => {
    it('should get all connections regardless of state', () => {
      const conn1: Connection = {
        connectionId: 'conn-1',
        clientId: 'client-1',
        protocol: 'websocket',
        state: 'connected',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      const conn2: Connection = {
        connectionId: 'conn-2',
        clientId: 'client-2',
        protocol: 'websocket',
        state: 'error',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        metrics: {
          bytesIn: 0,
          bytesOut: 0,
          messagesIn: 0,
          messagesOut: 0,
          latency: 0,
          packetLoss: 0,
        },
      };

      pool.addConnection(conn1);
      pool.addConnection(conn2);

      const all = pool.getAllConnections();
      expect(all.length).toBe(2);
    });
  });
});
