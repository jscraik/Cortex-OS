/**
 * @file_path packages/mcp/src/connection-manager.ts
 * @description MCP server discovery and connection pooling for CLI integration
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-15
 * @version 1.0.0
 * @status active
 */

import { createHash } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { EventEmitter } from 'node:events';
import {
  ConnectionState,
  createMcpClient,
  type McpClient,
  type McpClientOptions,
} from './mcp-client.js';

/**
 * Server discovery configuration
 */
export interface ServerDiscoveryConfig {
  /** Local server URLs to check */
  localServers: string[];
  /** Remote server URLs with authentication */
  remoteServers: Array<{
    url: string;
    auth?: { token: string; type: 'bearer' | 'api-key' };
    priority: number;
  }>;
  /** Service discovery via DNS SRV records */
  dnsDiscovery?: {
    enabled: boolean;
    domain: string;
    service: '_mcp';
    protocol: '_tcp';
  };
  /** Discovery timeout in milliseconds */
  discoveryTimeout: number;
  /** Health check interval in milliseconds */
  healthCheckInterval: number;
}

/**
 * Server health status
 */
export interface ServerHealth {
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  capabilities?: string[];
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  failedConnections: number;
  averageResponseTime: number;
  totalRequests: number;
  totalErrors: number;
}

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  /** Maximum number of connections per server */
  maxConnectionsPerServer: number;
  /** Maximum total connections across all servers */
  maxTotalConnections: number;
  /** Connection idle timeout in milliseconds */
  idleTimeout: number;
  /** Connection acquisition timeout in milliseconds */
  acquisitionTimeout: number;
  /** Enable connection validation */
  validateOnAcquire: boolean;
  /** Enable connection validation */
  validateOnReturn: boolean;
}

/**
 * Managed MCP connection with lifecycle tracking
 */
class ManagedConnection {
  public lastUsed: Date = new Date();
  public requestCount: number = 0;
  public isAcquired: boolean = false;
  public createdAt: Date = new Date();

  constructor(
    public client: McpClient,
    public serverId: string
  ) {}

  async acquire(): Promise<void> {
    if (this.isAcquired) {
      throw new Error('Connection already acquired');
    }

    if (!this.client.isReady()) {
      await this.client.connect();
      await this.client.initialize();
    }

    this.isAcquired = true;
    this.lastUsed = new Date();
  }

  release(): void {
    this.isAcquired = false;
    this.lastUsed = new Date();
  }

  async validate(): Promise<boolean> {
    try {
      if (this.client.getState() !== ConnectionState.Initialized) {
        return false;
      }
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.disconnect();
  }

  isIdle(idleTimeout: number): boolean {
    return !this.isAcquired && Date.now() - this.lastUsed.getTime() > idleTimeout;
  }
}

/**
 * MCP connection manager with server discovery and connection pooling
 */
export class McpConnectionManager extends EventEmitter {
  private servers = new Map<string, ServerHealth>();
  private readonly connections = new Map<string, ManagedConnection[]>();
  private discoveryTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly stats: PoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    failedConnections: 0,
    averageResponseTime: 0,
    totalRequests: 0,
    totalErrors: 0,
  };

  constructor(
    private readonly discoveryConfig: ServerDiscoveryConfig,
    private readonly poolConfig: ConnectionPoolConfig,
    private readonly clientOptions: Partial<McpClientOptions> = {}
  ) {
    super();
    this.setupCleanupTimer();
  }

  /**
   * Start server discovery and health monitoring
   */
  async start(): Promise<void> {
    await this.discoverServers();
    this.startDiscoveryTimer();
    this.emit('started');
  }

  /**
   * Stop connection manager and close all connections
   */
  async stop(): Promise<void> {
    this.stopDiscoveryTimer();
    this.stopCleanupTimer();

    // Close all connections
    const closePromises: Promise<void>[] = [];
    for (const [_serverId, connections] of this.connections.entries()) {
      for (const connection of connections) {
        closePromises.push(connection.close());
      }
    }

    await Promise.allSettled(closePromises);
    this.connections.clear();
    this.servers.clear();

    this.emit('stopped');
  }

  /**
   * Acquire a connection to a healthy server
   */
  async acquireConnection(preferredServerId?: string): Promise<{
    connection: McpClient;
    serverId: string;
    release: () => void;
  }> {
    const startTime = Date.now();

    try {
      // Find the best available server
      const serverId = preferredServerId
        ? this.validateServerPreference(preferredServerId)
        : this.selectBestServer();

      if (!serverId) {
        throw new Error('No healthy MCP servers available');
      }

      // Get or create connection
      const managedConnection = await this.getConnection(serverId);
      await managedConnection.acquire();

      this.stats.totalRequests++;
      this.stats.activeConnections++;

      // Track response time
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      return {
        connection: managedConnection.client,
        serverId,
        release: () => {
          managedConnection.release();
          this.stats.activeConnections--;
          this.stats.idleConnections++;
        },
      };
    } catch (error) {
      this.stats.totalErrors++;
      throw error;
    }
  }

  /**
   * Get current server health status
   */
  getServerHealth(): ServerHealth[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get connection pool statistics
   */
  getStats(): PoolStats {
    // Update live stats
    this.stats.totalConnections = Array.from(this.connections.values()).reduce(
      (sum, conns) => sum + conns.length,
      0
    );

    this.stats.idleConnections = Array.from(this.connections.values()).reduce(
      (sum, conns) => sum + conns.filter((c) => !c.isAcquired).length,
      0
    );

    return { ...this.stats };
  }

  /**
   * Force refresh of server discovery
   */
  async refreshDiscovery(): Promise<void> {
    await this.discoverServers();
    this.emit('discovery-refreshed');
  }

  private async discoverServers(): Promise<void> {
    const discoveredServers = new Map<string, ServerHealth>();
    const discoveryPromises: Promise<void>[] = [];

    // Check local servers
    for (const url of this.discoveryConfig.localServers) {
      discoveryPromises.push(this.probeServer(url, discoveredServers));
    }

    // Check remote servers
    for (const server of this.discoveryConfig.remoteServers) {
      discoveryPromises.push(this.probeServer(server.url, discoveredServers));
    }

    // DNS service discovery
    if (this.discoveryConfig.dnsDiscovery?.enabled) {
      discoveryPromises.push(this.discoverViaDns(discoveredServers));
    }

    // Wait for all discovery attempts
    await Promise.allSettled(discoveryPromises);

    // Update server registry
    this.servers = discoveredServers;
    this.emit('servers-discovered', Array.from(discoveredServers.values()));
  }

  private async probeServer(
    url: string,
    discoveredServers: Map<string, ServerHealth>
  ): Promise<void> {
    const serverId = this.getServerId(url);
    const startTime = Date.now();

    try {
      const client = createMcpClient(url, {
        ...this.clientOptions,
        timeout: this.discoveryConfig.discoveryTimeout,
      });

      await client.connect();
      const initResult = await client.initialize();
      const responseTime = Date.now() - startTime;

      await client.disconnect();

      discoveredServers.set(serverId, {
        url,
        status: 'healthy',
        lastCheck: new Date(),
        responseTime,
        capabilities: Object.keys(initResult.capabilities || {}),
      });
    } catch (error) {
      discoveredServers.set(serverId, {
        url,
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async discoverViaDns(discoveredServers: Map<string, ServerHealth>): Promise<void> {
    if (!this.discoveryConfig.dnsDiscovery) return;

    try {
      const { dnsDiscovery } = this.discoveryConfig;
      const srvRecord = `${dnsDiscovery.service}.${dnsDiscovery.protocol}.${dnsDiscovery.domain}`;

      // This is a simplified DNS SRV lookup - in production you'd use a proper DNS library
      const addresses = await dns.resolve(srvRecord);

      for (const address of addresses) {
        const url = `ws://${address}:3001`; // Default MCP port
        await this.probeServer(url, discoveredServers);
      }
    } catch (error) {
      // DNS discovery failed, continue with other methods
      this.emit('dns-discovery-failed', error);
    }
  }

  private validateServerPreference(serverId: string): string | null {
    const server = this.servers.get(serverId);
    return server?.status === 'healthy' ? serverId : null;
  }

  private selectBestServer(): string | null {
    const healthyServers = Array.from(this.servers.entries())
      .filter(([_, server]) => server.status === 'healthy')
      .sort(([_, a], [__, b]) => (a.responseTime || 0) - (b.responseTime || 0));

    return healthyServers.length > 0 ? healthyServers[0][0] : null;
  }

  /**
   * List tools from all healthy servers with fully qualified names.
   * Tool names are qualified as "<serverId>__<tool>" and truncated to 64 chars with a SHA1 suffix if needed.
   */
  async listQualifiedTools(): Promise<
    Record<string, { name: string; description: string; inputSchema?: Record<string, unknown> }>
  > {
    const result: Record<
      string,
      { name: string; description: string; inputSchema?: Record<string, unknown> }
    > = {};
    const healthy = Array.from(this.servers.entries()).filter(([_, s]) => s.status === 'healthy');

    // Query each server sequentially to avoid thundering herd; pool ensures reuse
    for (const [serverId] of healthy) {
      try {
        const { connection, release } = await this.acquireConnection(serverId);
        try {
          const list = await connection.listTools();
          for (const tool of list.tools) {
            const fq = this.qualifyToolName(serverId, tool.name);
            if (!(fq in result)) {
              result[fq] = {
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
              };
            }
          }
        } finally {
          release();
        }
      } catch {
        // Skip servers that fail listing
      }
    }

    return result;
  }

  private qualifyToolName(serverId: string, toolName: string): string {
    const DELIM = '__';
    const MAX = 64;
    const qualified = `${serverId}${DELIM}${toolName}`;
    if (qualified.length <= MAX) return qualified;

    // Truncate and append SHA1 hash to ensure uniqueness and determinism
    const sha1 = createHash('sha1').update(qualified).digest('hex');
    const prefixLen = Math.max(0, MAX - sha1.length);
    return `${qualified.slice(0, prefixLen)}${sha1}`;
  }

  private async getConnection(serverId: string): Promise<ManagedConnection> {
    const serverConnections = this.connections.get(serverId) || [];

    // Try to find an available connection
    for (const connection of serverConnections) {
      if (!connection.isAcquired) {
        if (this.poolConfig.validateOnAcquire) {
          const isValid = await connection.validate();
          if (!isValid) {
            await this.removeConnection(serverId, connection);
            continue;
          }
        }
        return connection;
      }
    }

    // Check connection limits
    if (serverConnections.length >= this.poolConfig.maxConnectionsPerServer) {
      throw new Error(`Maximum connections reached for server: ${serverId}`);
    }

    if (this.stats.totalConnections >= this.poolConfig.maxTotalConnections) {
      throw new Error('Maximum total connections reached');
    }

    // Create new connection
    return await this.createConnection(serverId);
  }

  private async createConnection(serverId: string): Promise<ManagedConnection> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    const client = createMcpClient(server.url, this.clientOptions);
    const managedConnection = new ManagedConnection(client, serverId);

    // Add to connection pool
    const serverConnections = this.connections.get(serverId) || [];
    serverConnections.push(managedConnection);
    this.connections.set(serverId, serverConnections);

    this.stats.totalConnections++;

    return managedConnection;
  }

  private async removeConnection(serverId: string, connection: ManagedConnection): Promise<void> {
    await connection.close();

    const serverConnections = this.connections.get(serverId);
    if (serverConnections) {
      const index = serverConnections.indexOf(connection);
      if (index >= 0) {
        serverConnections.splice(index, 1);
        this.stats.totalConnections--;

        if (serverConnections.length === 0) {
          this.connections.delete(serverId);
        }
      }
    }
  }

  private startDiscoveryTimer(): void {
    if (this.discoveryConfig.healthCheckInterval > 0) {
      this.discoveryTimer = setInterval(() => {
        this.discoverServers().catch((error) => {
          this.emit('discovery-error', error);
        });
      }, this.discoveryConfig.healthCheckInterval);
    }
  }

  private stopDiscoveryTimer(): void {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
  }

  private setupCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Run cleanup every minute
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private async cleanupIdleConnections(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    for (const [serverId, connections] of this.connections.entries()) {
      const idleConnections = connections.filter((c) => c.isIdle(this.poolConfig.idleTimeout));

      for (const connection of idleConnections) {
        cleanupPromises.push(this.removeConnection(serverId, connection));
      }
    }

    await Promise.allSettled(cleanupPromises);
  }

  private getServerId(url: string): string {
    // Simple URL-based server ID generation
    return url.replace(/^ws:\/\//, '').replace(/^wss:\/\//, '');
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.stats.totalRequests;
    const currentAvg = this.stats.averageResponseTime;

    this.stats.averageResponseTime =
      (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
  }
}

/**
 * Factory function to create connection manager with defaults
 */
export function createConnectionManager(
  config: Partial<ServerDiscoveryConfig> = {},
  poolConfig: Partial<ConnectionPoolConfig> = {},
  clientOptions: Partial<McpClientOptions> = {}
): McpConnectionManager {
  const defaultDiscoveryConfig: ServerDiscoveryConfig = {
    localServers: ['ws://localhost:3001'],
    remoteServers: [],
    discoveryTimeout: 5000,
    healthCheckInterval: 30000,
    ...config,
  };

  const defaultPoolConfig: ConnectionPoolConfig = {
    maxConnectionsPerServer: 5,
    maxTotalConnections: 20,
    idleTimeout: 300000, // 5 minutes
    acquisitionTimeout: 10000,
    validateOnAcquire: true,
    validateOnReturn: false,
    ...poolConfig,
  };

  return new McpConnectionManager(defaultDiscoveryConfig, defaultPoolConfig, clientOptions);
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
