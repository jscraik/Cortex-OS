import { EventEmitter } from 'node:events';
import { ProcessManager } from './process-manager.js';
import { McpServerPool } from './mcp-server-pool.js';
import { NxCacheManager } from './nx-cache-manager.js';
import { SessionManager } from './session-manager.js';

/**
 * brAInwav Operational Service - Centralized performance and reliability management
 * Integrates process management, MCP pooling, cache optimization, and session lifecycle
 */
export class OperationalService extends EventEmitter {
	private readonly processManager: ProcessManager;
	private readonly mcpPool: McpServerPool;
	private readonly cacheManager: NxCacheManager;
	private readonly sessionManager: SessionManager;
	private readonly healthCheckInterval: NodeJS.Timer;

	constructor(options: OperationalOptions = {}) {
		super();
		
		this.processManager = new ProcessManager();
		this.mcpPool = new McpServerPool();
		this.cacheManager = new NxCacheManager(options.cache);
		this.sessionManager = new SessionManager();
		
		this.setupEventForwarding();
		this.healthCheckInterval = setInterval(() => {
			this.performHealthCheck();
		}, options.healthCheckInterval || 60000); // 1 minute default
	}

	/**
	 * Get comprehensive system health status
	 */
	getSystemHealth(): SystemHealth {
		const processStats = this.getProcessStats();
		const poolStats = this.mcpPool.getPoolStats();
		const cacheStats = this.cacheManager.getCacheStats();
		const sessionStats = this.sessionManager.getSessionStats();

		return {
			timestamp: new Date().toISOString(),
			brAInwav: 'system-health-check',
			processes: {
				total: processStats.length,
				healthy: processStats.filter(p => p.status === 'running').length,
				failed: processStats.filter(p => p.status === 'failed').length,
			},
			mcpPools: Object.keys(poolStats).length,
			cache: {
				sizeGB: cacheStats.sizeBytes / (1024 ** 3),
				utilizationPercent: cacheStats.utilizationPercent,
				fileCount: cacheStats.fileCount,
			},
			sessions: {
				active: sessionStats.activeSessions,
				expired: sessionStats.expiredSessions,
				totalResources: sessionStats.totalResources,
			},
			overall: this.calculateOverallHealth(processStats, poolStats, cacheStats, sessionStats),
		};
	}

	/**
	 * Start a managed MCP server process
	 */
	async startMcpServer(config: McpServerConfig): Promise<string> {
		const sessionId = this.sessionManager.createSession({
			type: 'mcp-server',
			timeout: config.timeout || 30 * 60 * 1000,
			metadata: { serverType: config.serverType, port: config.port },
		});

		const processId = await this.processManager.startProcess({
			command: config.command,
			args: config.args,
			env: { 
				...config.env,
				MCP_SESSION_ID: sessionId,
				BRAINWAV_SERVER_TYPE: config.serverType,
			},
			autoRestart: config.autoRestart !== false,
			maxRestarts: config.maxRestarts || 3,
		});

		// Register process as session resource
		this.sessionManager.registerResource(sessionId, {
			id: processId,
			type: 'process',
			data: { processId, serverType: config.serverType },
			cleanup: async () => {
				await this.processManager.stopProcess(processId);
			},
		});

		this.emit('mcpServerStarted', {
			sessionId,
			processId,
			serverType: config.serverType,
		});

		return sessionId;
	}

	/**
	 * Get MCP connection from pool
	 */
	async getMcpConnection(serverType: string, sessionId?: string) {
		this.sessionManager.touchSession(sessionId || 'default');
		return this.mcpPool.getConnection(serverType, sessionId);
	}

	/**
	 * Release MCP connection back to pool
	 */
	async releaseMcpConnection(connection: any): Promise<void> {
		return this.mcpPool.releaseConnection(connection);
	}

	/**
	 * Perform cache maintenance
	 */
	async performCacheMaintenance(): Promise<void> {
		const stats = this.cacheManager.getCacheStats();
		
		if (stats.utilizationPercent > 80) {
			console.log('[brAInwav] Cache utilization high, performing cleanup...');
			const result = await this.cacheManager.cleanCache();
			
			this.emit('cacheCleanup', {
				spaceSaved: result.spaceSaved,
				filesRemoved: result.filesRemoved,
				strategy: result.strategy,
			});
		}
	}

	/**
	 * Restart MCP server session
	 */
	async restartMcpServer(sessionId: string): Promise<string> {
		const session = this.sessionManager.getSession(sessionId);
		if (!session) {
			throw new Error(`[brAInwav] Session ${sessionId} not found`);
		}

		const newSessionId = await this.sessionManager.restartSession(sessionId, {
			type: 'mcp-server',
			metadata: session.metadata,
		});

		// Restart the MCP server process with new session
		if (session.metadata.serverType) {
			await this.startMcpServer({
				serverType: session.metadata.serverType as string,
				command: 'node', // Would be derived from original config
				args: ['--version'], // Placeholder
			});
		}

		this.emit('mcpServerRestarted', {
			oldSessionId: sessionId,
			newSessionId,
		});

		return newSessionId;
	}

	/**
	 * Graceful shutdown of all operational components
	 */
	async shutdown(): Promise<void> {
		clearInterval(this.healthCheckInterval);
		
		console.log('[brAInwav] Initiating operational service shutdown...');
		
		// Stop services in reverse dependency order
		await this.sessionManager.cleanup();
		await this.mcpPool.cleanup();
		this.cacheManager.stopAutoCleanup();
		// ProcessManager cleanup is handled by session manager
		
		this.emit('shutdown');
	}

	/**
	 * Get process statistics
	 */
	private getProcessStats(): ProcessHealth[] {
		// This would integrate with ProcessManager.getProcessHealth
		// For now, return empty array as ProcessManager doesn't expose all processes
		return [];
	}

	/**
	 * Setup event forwarding from sub-components
	 */
	private setupEventForwarding(): void {
		// Forward critical events from process manager
		this.processManager.on('processFailure', (processId) => {
			this.emit('processFailure', { processId, component: 'ProcessManager' });
		});

		this.processManager.on('processRestarted', (data) => {
			this.emit('processRestarted', { ...data, component: 'ProcessManager' });
		});

		// Forward pool events
		this.mcpPool.on('connectionCreated', (data) => {
			this.emit('mcpConnectionCreated', data);
		});

		this.mcpPool.on('poolHealthCheck', (data) => {
			this.emit('mcpPoolHealthCheck', data);
		});

		// Forward session events
		this.sessionManager.on('sessionTerminated', (data) => {
			this.emit('sessionTerminated', data);
		});

		this.sessionManager.on('cleanupCycle', (data) => {
			this.emit('sessionCleanupCycle', data);
		});
	}

	/**
	 * Perform comprehensive health check
	 */
	private performHealthCheck(): void {
		const health = this.getSystemHealth();
		this.emit('healthCheck', health);

		// Trigger maintenance if needed
		if (health.cache.utilizationPercent > 80) {
			this.performCacheMaintenance().catch(error => {
				console.error('[brAInwav] Cache maintenance failed:', error);
			});
		}
	}

	/**
	 * Calculate overall system health score
	 */
	private calculateOverallHealth(
		processes: ProcessHealth[],
		pools: Record<string, any>,
		cache: any,
		sessions: any
	): HealthStatus {
		let score = 100;

		// Process health impact
		const totalProcesses = processes.length;
		const healthyProcesses = processes.filter(p => p.status === 'running').length;
		if (totalProcesses > 0) {
			score -= (totalProcesses - healthyProcesses) / totalProcesses * 30;
		}

		// Cache utilization impact
		if (cache.utilizationPercent > 90) score -= 20;
		else if (cache.utilizationPercent > 80) score -= 10;

		// Session health impact
		if (sessions.expiredSessions > sessions.activeSessions * 0.2) score -= 15;

		if (score >= 90) return 'excellent';
		if (score >= 75) return 'good';
		if (score >= 60) return 'fair';
		if (score >= 40) return 'poor';
		return 'critical';
	}
}

export interface OperationalOptions {
	healthCheckInterval?: number;
	cache?: {
		cacheDir?: string;
		maxSizeBytes?: number;
		maxAgeMs?: number;
		autoCleanup?: boolean;
		cleanupInterval?: number;
	};
}

export interface McpServerConfig {
	serverType: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	port?: number;
	timeout?: number;
	autoRestart?: boolean;
	maxRestarts?: number;
}

export interface SystemHealth {
	timestamp: string;
	brAInwav: string;
	processes: {
		total: number;
		healthy: number;
		failed: number;
	};
	mcpPools: number;
	cache: {
		sizeGB: number;
		utilizationPercent: number;
		fileCount: number;
	};
	sessions: {
		active: number;
		expired: number;
		totalResources: number;
	};
	overall: HealthStatus;
}

export interface ProcessHealth {
	id: string;
	status: string;
	pid?: number;
	uptime: number;
	restartCount: number;
	memoryUsage: NodeJS.MemoryUsage;
	lastHealthCheck: number;
}

type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';