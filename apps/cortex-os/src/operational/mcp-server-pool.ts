import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

/**
 * brAInwav MCP Server Pool for efficient resource sharing
 * Implements connection pooling and session management for MCP servers
 */
export class McpServerPool extends EventEmitter {
	private pools = new Map<string, McpPool>();
	private readonly defaultPoolConfig: PoolConfig = {
		minConnections: 2,
		maxConnections: 10,
		maxIdleTime: 300000, // 5 minutes
		healthCheckInterval: 60000, // 1 minute
		connectionTimeout: 10000, // 10 seconds
	};

	/**
	 * Get or create a connection pool for a specific MCP server type
	 */
	getPool(serverType: string, config?: Partial<PoolConfig>): McpPool {
		if (!this.pools.has(serverType)) {
			const poolConfig = { ...this.defaultPoolConfig, ...config };
			const pool = new McpPool(serverType, poolConfig);
			this.pools.set(serverType, pool);
			
			// Forward pool events
			pool.on('connectionCreated', (data) => this.emit('connectionCreated', data));
			pool.on('connectionClosed', (data) => this.emit('connectionClosed', data));
			pool.on('poolHealthCheck', (data) => this.emit('poolHealthCheck', data));
		}
		
		return this.pools.get(serverType)!;
	}

	/**
	 * Get a connection from the pool
	 */
	async getConnection(serverType: string, sessionId?: string): Promise<McpConnection> {
		const pool = this.getPool(serverType);
		return pool.getConnection(sessionId);
	}

	/**
	 * Return a connection to the pool
	 */
	async releaseConnection(connection: McpConnection): Promise<void> {
		const pool = this.pools.get(connection.serverType);
		if (pool) {
			await pool.releaseConnection(connection);
		}
	}

	/**
	 * Get pool statistics
	 */
	getPoolStats(): Record<string, PoolStats> {
		const stats: Record<string, PoolStats> = {};
		for (const [serverType, pool] of this.pools) {
			stats[serverType] = pool.getStats();
		}
		return stats;
	}

	/**
	 * Cleanup all pools
	 */
	async cleanup(): Promise<void> {
		const cleanupPromises = Array.from(this.pools.values()).map(pool => pool.cleanup());
		await Promise.all(cleanupPromises);
		this.pools.clear();
	}
}

/**
 * Individual MCP connection pool
 */
class McpPool extends EventEmitter {
	private connections = new Map<string, McpConnection>();
	private availableConnections = new Set<string>();
	private healthCheckTimer: NodeJS.Timer | null = null;

	constructor(
		private readonly serverType: string,
		private readonly config: PoolConfig
	) {
		super();
		this.startHealthMonitoring();
		this.initializeMinConnections();
	}

	/**
	 * Get a connection from the pool
	 */
	async getConnection(sessionId?: string): Promise<McpConnection> {
		// Try to reuse existing connection for session
		if (sessionId) {
			const existingConnection = this.findConnectionBySession(sessionId);
			if (existingConnection && existingConnection.isHealthy()) {
				return existingConnection;
			}
		}

		// Get available connection
		let connection = this.getAvailableConnection();
		
		if (!connection) {
			// Create new connection if under max limit
			if (this.connections.size < this.config.maxConnections) {
				connection = await this.createConnection();
			} else {
				// Wait for connection to become available
				connection = await this.waitForConnection();
			}
		}

		// Assign to session if provided
		if (sessionId) {
			connection.assignToSession(sessionId);
		}

		this.availableConnections.delete(connection.id);
		connection.markInUse();

		return connection;
	}

	/**
	 * Release a connection back to the pool
	 */
	async releaseConnection(connection: McpConnection): Promise<void> {
		if (!this.connections.has(connection.id)) return;

		connection.markAvailable();
		
		// Keep connection if healthy and within limits
		if (connection.isHealthy() && this.connections.size <= this.config.maxConnections) {
			this.availableConnections.add(connection.id);
		} else {
			await this.closeConnection(connection.id);
		}
	}

	/**
	 * Get pool statistics
	 */
	getStats(): PoolStats {
		const connections = Array.from(this.connections.values());
		return {
			serverType: this.serverType,
			totalConnections: this.connections.size,
			availableConnections: this.availableConnections.size,
			activeConnections: connections.filter(c => c.inUse).length,
			healthyConnections: connections.filter(c => c.isHealthy()).length,
			averageIdleTime: this.calculateAverageIdleTime(),
			config: this.config,
		};
	}

	/**
	 * Initialize minimum connections
	 */
	private async initializeMinConnections(): Promise<void> {
		const createPromises: Promise<McpConnection>[] = [];
		for (let i = 0; i < this.config.minConnections; i++) {
			createPromises.push(this.createConnection());
		}
		
		const connections = await Promise.allSettled(createPromises);
		connections.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				this.availableConnections.add(result.value.id);
			} else {
				console.error(`[brAInwav] Failed to create initial connection ${index}:`, result.reason);
			}
		});
	}

	/**
	 * Create a new MCP connection
	 */
	private async createConnection(): Promise<McpConnection> {
		const connectionId = `brAInwav-mcp-${randomUUID()}`;
		
		// Simulate MCP connection creation
		// In real implementation, this would create actual MCP client
		const connection = new McpConnection(
			connectionId,
			this.serverType,
			this.config.connectionTimeout
		);

		this.connections.set(connectionId, connection);
		
		// Setup connection event handlers
		connection.on('closed', () => {
			this.connections.delete(connectionId);
			this.availableConnections.delete(connectionId);
		});

		connection.on('error', (error) => {
			console.error(`[brAInwav] MCP connection error:`, error);
			this.closeConnection(connectionId);
		});

		this.emit('connectionCreated', {
			connectionId,
			serverType: this.serverType,
			poolSize: this.connections.size,
		});

		return connection;
	}

	/**
	 * Close a connection
	 */
	private async closeConnection(connectionId: string): Promise<void> {
		const connection = this.connections.get(connectionId);
		if (connection) {
			await connection.close();
			this.connections.delete(connectionId);
			this.availableConnections.delete(connectionId);
			
			this.emit('connectionClosed', {
				connectionId,
				serverType: this.serverType,
				poolSize: this.connections.size,
			});
		}
	}

	/**
	 * Get an available connection
	 */
	private getAvailableConnection(): McpConnection | null {
		for (const connectionId of this.availableConnections) {
			const connection = this.connections.get(connectionId);
			if (connection && connection.isHealthy()) {
				return connection;
			}
		}
		return null;
	}

	/**
	 * Find connection by session ID
	 */
	private findConnectionBySession(sessionId: string): McpConnection | null {
		for (const connection of this.connections.values()) {
			if (connection.sessionId === sessionId) {
				return connection;
			}
		}
		return null;
	}

	/**
	 * Wait for a connection to become available
	 */
	private async waitForConnection(): Promise<McpConnection> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('[brAInwav] Connection pool timeout'));
			}, this.config.connectionTimeout);

			const checkForConnection = () => {
				const connection = this.getAvailableConnection();
				if (connection) {
					clearTimeout(timeout);
					resolve(connection);
				} else {
					setTimeout(checkForConnection, 100);
				}
			};

			checkForConnection();
		});
	}

	/**
	 * Start health monitoring
	 */
	private startHealthMonitoring(): void {
		this.healthCheckTimer = setInterval(() => {
			this.performHealthChecks();
		}, this.config.healthCheckInterval);
	}

	/**
	 * Perform health checks on all connections
	 */
	private performHealthChecks(): void {
		const now = Date.now();
		const connectionsToClose: string[] = [];

		for (const [connectionId, connection] of this.connections) {
			// Check if connection is idle too long
			if (
				!connection.inUse &&
				now - connection.lastUsed > this.config.maxIdleTime
			) {
				connectionsToClose.push(connectionId);
				continue;
			}

			// Perform health check
			if (!connection.isHealthy()) {
				connectionsToClose.push(connectionId);
			}
		}

		// Close unhealthy or idle connections
		connectionsToClose.forEach(connectionId => {
			this.closeConnection(connectionId);
		});

		// Ensure minimum connections
		const deficit = this.config.minConnections - this.connections.size;
		if (deficit > 0) {
			for (let i = 0; i < deficit; i++) {
				this.createConnection().then(connection => {
					this.availableConnections.add(connection.id);
				}).catch(error => {
					console.error('[brAInwav] Failed to create replacement connection:', error);
				});
			}
		}

		this.emit('poolHealthCheck', {
			serverType: this.serverType,
			stats: this.getStats(),
		});
	}

	/**
	 * Calculate average idle time
	 */
	private calculateAverageIdleTime(): number {
		const idleConnections = Array.from(this.connections.values())
			.filter(c => !c.inUse);
		
		if (idleConnections.length === 0) return 0;

		const totalIdleTime = idleConnections.reduce(
			(sum, connection) => sum + (Date.now() - connection.lastUsed),
			0
		);

		return totalIdleTime / idleConnections.length;
	}

	/**
	 * Cleanup the pool
	 */
	async cleanup(): Promise<void> {
		if (this.healthCheckTimer) {
			clearInterval(this.healthCheckTimer);
		}

		const closePromises = Array.from(this.connections.keys())
			.map(connectionId => this.closeConnection(connectionId));
		
		await Promise.all(closePromises);
	}
}

/**
 * MCP Connection wrapper
 */
class McpConnection extends EventEmitter {
	public readonly lastUsed: number = Date.now();
	public inUse = false;
	public sessionId?: string;
	private closed = false;

	constructor(
		public readonly id: string,
		public readonly serverType: string,
		private readonly timeout: number
	) {
		super();
	}

	/**
	 * Check if connection is healthy
	 */
	isHealthy(): boolean {
		return !this.closed && Date.now() - this.lastUsed < 600000; // 10 minutes
	}

	/**
	 * Assign connection to a session
	 */
	assignToSession(sessionId: string): void {
		this.sessionId = sessionId;
	}

	/**
	 * Mark connection as in use
	 */
	markInUse(): void {
		this.inUse = true;
		(this as any).lastUsed = Date.now();
	}

	/**
	 * Mark connection as available
	 */
	markAvailable(): void {
		this.inUse = false;
		this.sessionId = undefined;
		(this as any).lastUsed = Date.now();
	}

	/**
	 * Close the connection
	 */
	async close(): Promise<void> {
		if (this.closed) return;
		
		this.closed = true;
		this.emit('closed');
	}
}

export interface PoolConfig {
	minConnections: number;
	maxConnections: number;
	maxIdleTime: number;
	healthCheckInterval: number;
	connectionTimeout: number;
}

export interface PoolStats {
	serverType: string;
	totalConnections: number;
	availableConnections: number;
	activeConnections: number;
	healthyConnections: number;
	averageIdleTime: number;
	config: PoolConfig;
}