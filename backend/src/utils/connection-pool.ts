/**
 * Connection Pool Implementation
 * Manages a pool of connections with resource management and reuse
 */

import { Connection, ConnectionMetrics } from '../types/services';
import { EventEmitter } from 'events';

export interface PoolConfig {
  maxConnections: number;
  connectionTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
}

export class ConnectionPool extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private config: PoolConfig;
  private idleTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<PoolConfig> = {}) {
    super();
    this.config = {
      maxConnections: config.maxConnections || 100,
      connectionTimeout: config.connectionTimeout || 5000,
      idleTimeout: config.idleTimeout || 300000, // 5 minutes
    };
  }

  /**
   * Add a connection to the pool
   */
  addConnection(connection: Connection): boolean {
    if (this.connections.size >= this.config.maxConnections) {
      return false;
    }

    this.connections.set(connection.connectionId, connection);
    this.emit('connection:added', connection);
    return true;
  }

  /**
   * Get a connection from the pool
   */
  getConnection(connectionId: string): Connection | undefined {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Clear idle timer when connection is accessed
      this.clearIdleTimer(connectionId);
      // Update last activity time
      connection.lastActivityAt = Date.now();
    }
    return connection;
  }

  /**
   * Remove a connection from the pool
   */
  removeConnection(connectionId: string): Connection | undefined {
    this.clearIdleTimer(connectionId);
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.emit('connection:removed', connection);
    }
    return connection;
  }

  /**
   * Get all connections in the pool
   */
  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get active connections (connected state)
   */
  getActiveConnections(): Connection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.state === 'connected'
    );
  }

  /**
   * Check if pool is at capacity
   */
  isFull(): boolean {
    return this.connections.size >= this.config.maxConnections;
  }

  /**
   * Get pool size
   */
  getSize(): number {
    return this.connections.size;
  }

  /**
   * Get available slots
   */
  getAvailableSlots(): number {
    return this.config.maxConnections - this.connections.size;
  }

  /**
   * Update connection state
   */
  updateConnectionState(
    connectionId: string,
    state: Connection['state']
  ): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    const oldState = connection.state;
    connection.state = state;
    connection.lastActivityAt = Date.now();

    this.emit('connection:state-changed', {
      connectionId,
      oldState,
      newState: state,
    });

    return true;
  }

  /**
   * Update connection metrics
   */
  updateConnectionMetrics(
    connectionId: string,
    metrics: Partial<ConnectionMetrics>
  ): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.metrics = {
      ...connection.metrics,
      ...metrics,
    };
    connection.lastActivityAt = Date.now();

    this.emit('connection:metrics-updated', {
      connectionId,
      metrics: connection.metrics,
    });

    return true;
  }

  /**
   * Set idle timer for a connection
   */
  setIdleTimer(connectionId: string): void {
    // Clear existing timer
    this.clearIdleTimer(connectionId);

    // Set new timer
    const timer = setTimeout(() => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        this.emit('connection:idle', connection);
        this.removeConnection(connectionId);
      }
    }, this.config.idleTimeout);

    this.idleTimers.set(connectionId, timer);
  }

  /**
   * Clear idle timer for a connection
   */
  private clearIdleTimer(connectionId: string): void {
    const timer = this.idleTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(connectionId);
    }
  }

  /**
   * Clear all idle timers
   */
  private clearAllIdleTimers(): void {
    for (const timer of this.idleTimers.values()) {
      clearTimeout(timer);
    }
    this.idleTimers.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    active: number;
    connecting: number;
    disconnected: number;
    error: number;
    capacity: number;
    utilization: number;
  } {
    const connections = Array.from(this.connections.values());
    const stats = {
      total: connections.length,
      active: connections.filter((c) => c.state === 'connected').length,
      connecting: connections.filter((c) => c.state === 'connecting').length,
      disconnected: connections.filter((c) => c.state === 'disconnected')
        .length,
      error: connections.filter((c) => c.state === 'error').length,
      capacity: this.config.maxConnections,
      utilization: (connections.length / this.config.maxConnections) * 100,
    };
    return stats;
  }

  /**
   * Clear all connections
   */
  clear(): void {
    this.clearAllIdleTimers();
    this.connections.clear();
    this.emit('pool:cleared');
  }

  /**
   * Destroy the pool
   */
  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}
