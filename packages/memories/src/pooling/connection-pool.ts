import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  /** Maximum number of connections in the pool */
  maxConnections?: number;
  /** Minimum number of connections to keep alive */
  minConnections?: number;
  /** Connection acquisition timeout in milliseconds */
  acquireTimeoutMs?: number;
  /** Connection idle timeout in milliseconds */
  idleTimeoutMs?: number;
  /** Maximum lifetime of a connection in milliseconds */
  maxLifetimeMs?: number;
  /** Health check interval in milliseconds */
  healthCheckIntervalMs?: number;
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  /** Total number of connections */
  total: number;
  /** Number of active connections */
  active: number;
  /** Number of idle connections */
  idle: number;
  /** Number of pending connection requests */
  pending: number;
  /** Total connection acquisitions */
  totalAcquired: number;
  /** Total connection releases */
  totalReleased: number;
  /** Total connection creations */
  totalCreated: number;
  /** Total connection closures */
  totalClosed: number;
  /** Average wait time for connections in milliseconds */
  avgWaitTimeMs: number;
}

/**
 * Pooled connection wrapper
 */
interface PooledConnection {
  /** The underlying store connection */
  connection: MemoryStore;
  /** Timestamp when the connection was created */
  createdAt: number;
  /** Timestamp when the connection was last acquired */
  lastAcquiredAt: number;
  /** Timestamp when the connection was last released */
  lastReleasedAt: number;
  /** Whether the connection is currently active */
  active: boolean;
  /** Whether the connection has been marked for closure */
  closing: boolean;
  /** Number of times this connection has been acquired */
  acquireCount: number;
}

/**
 * Connection Pool for MemoryStore
 *
 * Provides connection pooling for any MemoryStore implementation,
 * improving performance by reusing connections and managing
 * connection lifecycle efficiently.
 */
export class ConnectionPool implements MemoryStore {
  private config: Required<ConnectionPoolConfig>;
  private pool: PooledConnection[] = [];
  private pendingQueue: Array<{
    resolve: (connection: MemoryStore) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private acquiring = false;
  private stats: PoolStats = {
    total: 0,
    active: 0,
    idle: 0,
    pending: 0,
    totalAcquired: 0,
    totalReleased: 0,
    totalCreated: 0,
    totalClosed: 0,
    avgWaitTimeMs: 0,
  };
  private healthCheckInterval?: NodeJS.Timeout;
  private waitTimes: number[] = [];
  private readonly maxWaitTimeSamples = 100;

  constructor(
    private readonly storeFactory: () => Promise<MemoryStore>,
    config: ConnectionPoolConfig = {},
  ) {
    this.config = {
      maxConnections: 10,
      minConnections: 2,
      acquireTimeoutMs: 5000,
      idleTimeoutMs: 300000, // 5 minutes
      maxLifetimeMs: 3600000, // 1 hour
      healthCheckIntervalMs: 60000, // 1 minute
      ...config,
    };

    // Start health check interval
    this.startHealthCheck();
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * Acquire a connection from the pool
   */
  private async acquire(): Promise<MemoryStore> {
    const startTime = Date.now();

    // Use synchronization to prevent race conditions
    while (this.acquiring) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }

    try {
      this.acquiring = true;

      // Try to find an idle connection
      const idleConnection = this.pool.find((conn) => !conn.active && !conn.closing);
      if (idleConnection) {
        idleConnection.active = true;
        idleConnection.lastAcquiredAt = Date.now();
        idleConnection.acquireCount++;

        this.updateStats('acquire');
        this.recordWaitTime(Date.now() - startTime);

        return idleConnection.connection;
      }

      // Check if we can create a new connection
      if (this.pool.length < this.config.maxConnections) {
        const connection = await this.createConnection(true);
        // Don't call updateStats again - createConnection already did it
        this.recordWaitTime(Date.now() - startTime);
        return connection;
      }

      // Wait for a connection to be released
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = this.pendingQueue.findIndex((p) => p.resolve === resolve);
          if (index !== -1) {
            this.pendingQueue.splice(index, 1);
            this.stats.pending--;
          }
          reject(new Error('Connection acquisition timeout'));
        }, this.config.acquireTimeoutMs);

        this.pendingQueue.push({
          resolve: (connection) => {
            clearTimeout(timeout);
            this.recordWaitTime(Date.now() - startTime);
            resolve(connection);
          },
          reject: (error) => {
            clearTimeout(timeout);
            reject(error);
          },
          timestamp: startTime,
        });

        this.stats.pending++;
      });
    } finally {
      this.acquiring = false;
    }
  }

  /**
   * Release a connection back to the pool
   */
  private release(connection: MemoryStore): void {
    const pooledConnection = this.pool.find((conn) => conn.connection === connection);
    if (!pooledConnection) {
      return;
    }

    // Check if there are pending requests
    if (this.pendingQueue.length > 0) {
      const pending = this.pendingQueue.shift();
      if (pending) {
        this.stats.pending = Math.max(0, this.stats.pending - 1);
        // Transfer directly to pending request - don't update stats
        pooledConnection.lastAcquiredAt = Date.now();
        pooledConnection.acquireCount++;
        pending.resolve(pooledConnection.connection);
      }
    } else {
      // Actually release back to pool
      pooledConnection.active = false;
      pooledConnection.lastReleasedAt = Date.now();
      this.updateStats('release');
    }
  }

  /**
   * Create a new connection
   */
  private async createConnection(active = true): Promise<MemoryStore> {
    const connection = await this.storeFactory();
    const pooledConnection: PooledConnection = {
      connection,
      createdAt: Date.now(),
      lastAcquiredAt: active ? Date.now() : 0,
      lastReleasedAt: 0,
      active,
      closing: false,
      acquireCount: active ? 1 : 0,
    };

    this.pool.push(pooledConnection);
    this.updateStats('create');
    if (active) {
      this.updateStats('acquire');
    }

    return connection;
  }

  /**
   * Close a connection
   */
  private async closeConnection(pooledConnection: PooledConnection): Promise<void> {
    // Note: We don't actually close MemoryStore connections as they don't have a close method.
    // This is a no-op but preserves structure for future store types that might need it.

    const index = this.pool.indexOf(pooledConnection);
    if (index !== -1) {
      this.pool.splice(index, 1);
      // Only update stats if not draining (drain handles stats separately)
      if (!this.pool.some((conn) => conn.closing)) {
        this.updateStats('close');
      }
    }
  }

  /**
   * Update statistics
   */
  private updateStats(action: 'acquire' | 'release' | 'create' | 'close'): void {
    switch (action) {
      case 'acquire':
        this.stats.totalAcquired++;
        this.stats.active++;
        this.updateIdleCount();
        break;
      case 'release':
        this.stats.totalReleased++;
        this.stats.active--;
        this.updateIdleCount();
        break;
      case 'create':
        this.stats.totalCreated++;
        this.stats.total = this.pool.length;
        this.updateIdleCount();
        break;
      case 'close':
        this.stats.totalClosed++;
        this.stats.total = this.pool.length;
        this.stats.active = this.pool.filter((c) => c.active).length;
        this.updateIdleCount();
        break;
    }
  }

  private updateIdleCount(): void {
    this.stats.idle = this.pool.filter((c) => !c.active && !c.closing).length;
  }

  /**
   * Record wait time for connection acquisition
   */
  private recordWaitTime(waitTime: number): void {
    this.waitTimes.push(waitTime);
    if (this.waitTimes.length > this.maxWaitTimeSamples) {
      this.waitTimes.shift();
    }

    this.stats.avgWaitTimeMs =
      this.waitTimes.reduce((sum, time) => sum + time, 0) / this.waitTimes.length;
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Perform health check and cleanup
   */
  private performHealthCheck(): void {
    const now = Date.now();
    const connectionsToClose: PooledConnection[] = [];

    // Check for idle connections that have exceeded timeout
    for (const connection of this.pool) {
      if (connection.active || connection.closing) {
        continue;
      }

      // Check idle timeout
      if (
        connection.lastReleasedAt > 0 &&
        now - connection.lastReleasedAt > this.config.idleTimeoutMs
      ) {
        connectionsToClose.push(connection);
        continue;
      }

      // Check max lifetime
      if (now - connection.createdAt > this.config.maxLifetimeMs) {
        connectionsToClose.push(connection);
      }
    }

    // Close expired connections while maintaining minimum
    for (const connection of connectionsToClose) {
      if (this.pool.length - connectionsToClose.length >= this.config.minConnections) {
        connection.closing = true;
        this.closeConnection(connection);
      }
    }

    // Ensure minimum connections
    while (this.pool.length < this.config.minConnections) {
      this.createConnection().catch((error) => {
        console.error('Failed to create minimum connection:', error);
      });
    }
  }

  /**
   * Initialize the pool with minimum connections
   */
  async initialize(): Promise<void> {
    const promises = [];
    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(this.createConnection(false));
    }
    await Promise.all(promises);
  }

  /**
   * Drain the pool and close all connections
   */
  async drain(): Promise<void> {
    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Mark all connections as closing
    for (const conn of this.pool) {
      conn.closing = true;
    }

    // Close all connections
    const closePromises = this.pool.map((conn) => this.closeConnection(conn));
    await Promise.all(closePromises);

    // Reset stats
    this.stats = {
      total: 0,
      active: 0,
      idle: 0,
      pending: 0,
      totalAcquired: this.stats.totalAcquired,
      totalReleased: this.stats.totalReleased,
      totalCreated: this.stats.totalCreated,
      totalClosed: this.stats.totalClosed + this.pool.length,
      avgWaitTimeMs: this.stats.avgWaitTimeMs,
    };

    // Reject all pending requests
    for (const pending of this.pendingQueue) {
      pending.reject(new Error('Pool is draining'));
    }
    this.pendingQueue = [];
  }

  // MemoryStore interface implementation
  async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
    const connection = await this.acquire();
    try {
      return await connection.upsert(memory, namespace);
    } finally {
      this.release(connection);
    }
  }

  async get(id: string, namespace = 'default'): Promise<Memory | null> {
    const connection = await this.acquire();
    try {
      return await connection.get(id, namespace);
    } finally {
      this.release(connection);
    }
  }

  async delete(id: string, namespace = 'default'): Promise<void> {
    const connection = await this.acquire();
    try {
      return await connection.delete(id, namespace);
    } finally {
      this.release(connection);
    }
  }

  async searchByText(query: TextQuery, namespace = 'default'): Promise<Memory[]> {
    const connection = await this.acquire();
    try {
      return await connection.searchByText(query, namespace);
    } finally {
      this.release(connection);
    }
  }

  async searchByVector(query: VectorQuery, namespace = 'default'): Promise<(Memory & { score: number })[]> {
    const connection = await this.acquire();
    try {
      const res = await connection.searchByVector(query, namespace);
      return res.map((r) => {
        const maybe = r as unknown as Partial<Memory> & Record<string, unknown>;
        const score = typeof maybe.score === 'number' ? maybe.score : 0;
        return { ...(maybe as Memory), score };
      });
    } finally {
      this.release(connection);
    }
  }

  async list(namespace = 'default'): Promise<Memory[]> {
    const connection = await this.acquire();
    try {
      return await connection.list(namespace);
    } finally {
      this.release(connection);
    }
  }

  async purgeExpired(nowISO: string, namespace = 'default'): Promise<number> {
    const connection = await this.acquire();
    try {
      return await connection.purgeExpired(nowISO, namespace);
    } finally {
      this.release(connection);
    }
  }
}
