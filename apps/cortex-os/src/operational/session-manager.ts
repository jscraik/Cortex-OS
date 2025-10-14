import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

/**
 * brAInwav Session Manager for graceful MCP server lifecycle management
 * Implements proper session tracking, cleanup, and restart capabilities
 */
export class SessionManager extends EventEmitter {
	private sessions = new Map<string, SessionInfo>();
	private cleanupTimer: NodeJS.Timer | null = null;
	private readonly defaultSessionTimeout = 30 * 60 * 1000; // 30 minutes
	private readonly cleanupInterval = 5 * 60 * 1000; // 5 minutes

	constructor() {
		super();
		this.startCleanupMonitoring();
		this.setupGracefulShutdown();
	}

	/**
	 * Create a new session
	 */
	createSession(options: SessionOptions = {}): string {
		const sessionId = `brAInwav-session-${randomUUID()}`;
		
		const session: SessionInfo = {
			id: sessionId,
			type: options.type || 'mcp',
			createdAt: Date.now(),
			lastActivity: Date.now(),
			timeout: options.timeout || this.defaultSessionTimeout,
			resources: new Set(),
			status: 'active',
			metadata: options.metadata || {},
		};

		this.sessions.set(sessionId, session);
		
		this.emit('sessionCreated', {
			sessionId,
			type: session.type,
			timeout: session.timeout,
		});

		return sessionId;
	}

	/**
	 * Update session activity
	 */
	touchSession(sessionId: string): boolean {
		const session = this.sessions.get(sessionId);
		if (!session) return false;

		session.lastActivity = Date.now();
		
		this.emit('sessionActivity', {
			sessionId,
			lastActivity: session.lastActivity,
		});

		return true;
	}

	/**
	 * Register a resource with a session
	 */
	registerResource(sessionId: string, resource: SessionResource): boolean {
		const session = this.sessions.get(sessionId);
		if (!session) return false;

		session.resources.add(resource);
		
		this.emit('resourceRegistered', {
			sessionId,
			resource: resource.id,
			type: resource.type,
		});

		return true;
	}

	/**
	 * Gracefully shutdown a session
	 */
	async shutdownSession(sessionId: string, force = false): Promise<boolean> {
		const session = this.sessions.get(sessionId);
		if (!session) return false;

		session.status = 'shutting-down';
		
		try {
			// Cleanup resources in reverse order
			const resources = Array.from(session.resources).reverse();
			
			for (const resource of resources) {
				try {
					if (force) {
						await this.forceCleanupResource(resource);
					} else {
						await this.gracefulCleanupResource(resource);
					}
				} catch (error) {
					console.error(`[brAInwav] Failed to cleanup resource ${resource.id}:`, error);
				}
			}

			session.status = 'terminated';
			this.sessions.delete(sessionId);
			
			this.emit('sessionTerminated', {
				sessionId,
				resourceCount: resources.length,
				forced: force,
			});

			return true;
		} catch (error) {
			console.error(`[brAInwav] Session shutdown failed for ${sessionId}:`, error);
			session.status = 'error';
			return false;
		}
	}

	/**
	 * Restart a session with new configuration
	 */
	async restartSession(sessionId: string, options: SessionOptions = {}): Promise<string> {
		const oldSession = this.sessions.get(sessionId);
		if (!oldSession) {
			throw new Error(`[brAInwav] Session ${sessionId} not found`);
		}

		// Preserve metadata if not overridden
		const newOptions: SessionOptions = {
			...options,
			metadata: { ...oldSession.metadata, ...options.metadata },
		};

		// Shutdown old session
		await this.shutdownSession(sessionId, false);
		
		// Create new session
		const newSessionId = this.createSession(newOptions);
		
		this.emit('sessionRestarted', {
			oldSessionId: sessionId,
			newSessionId,
			type: newOptions.type || 'mcp',
		});

		return newSessionId;
	}

	/**
	 * Get session information
	 */
	getSession(sessionId: string): SessionInfo | null {
		return this.sessions.get(sessionId) || null;
	}

	/**
	 * Get all active sessions
	 */
	getActiveSessions(): SessionInfo[] {
		return Array.from(this.sessions.values()).filter(s => s.status === 'active');
	}

	/**
	 * Get session statistics
	 */
	getSessionStats(): SessionStats {
		const sessions = Array.from(this.sessions.values());
		const now = Date.now();

		return {
			totalSessions: sessions.length,
			activeSessions: sessions.filter(s => s.status === 'active').length,
			expiredSessions: sessions.filter(s => this.isSessionExpired(s, now)).length,
			averageAge: this.calculateAverageAge(sessions, now),
			totalResources: sessions.reduce((sum, s) => sum + s.resources.size, 0),
			sessionTypes: this.getSessionTypeBreakdown(sessions),
		};
	}

	/**
	 * Force cleanup all sessions
	 */
	async cleanup(): Promise<void> {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}

		const sessionIds = Array.from(this.sessions.keys());
		
		const shutdownPromises = sessionIds.map(sessionId => 
			this.shutdownSession(sessionId, true)
		);

		await Promise.allSettled(shutdownPromises);
		this.sessions.clear();
		
		this.emit('cleanup', { sessionsTerminated: sessionIds.length });
	}

	/**
	 * Start automatic cleanup monitoring
	 */
	private startCleanupMonitoring(): void {
		this.cleanupTimer = setInterval(() => {
			this.performCleanup();
		}, this.cleanupInterval);
	}

	/**
	 * Perform cleanup of expired sessions
	 */
	private async performCleanup(): Promise<void> {
		const now = Date.now();
		const expiredSessions: string[] = [];

		for (const [sessionId, session] of this.sessions) {
			if (this.isSessionExpired(session, now)) {
				expiredSessions.push(sessionId);
			}
		}

		if (expiredSessions.length > 0) {
			console.log(`[brAInwav] Cleaning up ${expiredSessions.length} expired sessions`);
			
			const cleanupPromises = expiredSessions.map(sessionId => 
				this.shutdownSession(sessionId, false)
			);
			
			await Promise.allSettled(cleanupPromises);
		}

		this.emit('cleanupCycle', {
			expiredSessions: expiredSessions.length,
			activeSessions: this.getActiveSessions().length,
		});
	}

	/**
	 * Check if a session is expired
	 */
	private isSessionExpired(session: SessionInfo, now: number): boolean {
		return session.status === 'active' && 
			   (now - session.lastActivity) > session.timeout;
	}

	/**
	 * Graceful resource cleanup
	 */
	private async gracefulCleanupResource(resource: SessionResource): Promise<void> {
		if (resource.cleanup) {
			await resource.cleanup();
		} else {
			// Default cleanup based on resource type
			switch (resource.type) {
				case 'mcp-connection':
					await this.cleanupMcpConnection(resource);
					break;
				case 'process':
					await this.cleanupProcess(resource);
					break;
				case 'file-handle':
					await this.cleanupFileHandle(resource);
					break;
				default:
					console.warn(`[brAInwav] Unknown resource type: ${resource.type}`);
			}
		}
	}

	/**
	 * Force resource cleanup
	 */
	private async forceCleanupResource(resource: SessionResource): Promise<void> {
		try {
			// Try graceful first
			await this.gracefulCleanupResource(resource);
		} catch {
			// Force cleanup
			switch (resource.type) {
				case 'process':
					// Force kill process
					if (resource.data?.pid) {
						try {
							process.kill(resource.data.pid, 'SIGKILL');
						} catch {
							// Process already dead
						}
					}
					break;
				case 'file-handle':
					// Force close file handle
					if (resource.data?.fd) {
						try {
							require('fs').closeSync(resource.data.fd);
						} catch {
							// Already closed
						}
					}
					break;
			}
		}
	}

	/**
	 * Default MCP connection cleanup
	 */
	private async cleanupMcpConnection(resource: SessionResource): Promise<void> {
		// Implementation would depend on actual MCP client
		console.log(`[brAInwav] Cleaning up MCP connection: ${resource.id}`);
	}

	/**
	 * Default process cleanup
	 */
	private async cleanupProcess(resource: SessionResource): Promise<void> {
		if (resource.data?.pid) {
			try {
				process.kill(resource.data.pid, 'SIGTERM');
				
				// Wait for graceful shutdown
				setTimeout(() => {
					try {
						process.kill(resource.data.pid, 'SIGKILL');
					} catch {
						// Process already terminated
					}
				}, 5000);
			} catch {
				// Process already dead
			}
		}
	}

	/**
	 * Default file handle cleanup
	 */
	private async cleanupFileHandle(resource: SessionResource): Promise<void> {
		if (resource.data?.fd) {
			try {
				require('fs').close(resource.data.fd, () => {});
			} catch {
				// Already closed
			}
		}
	}

	/**
	 * Calculate average session age
	 */
	private calculateAverageAge(sessions: SessionInfo[], now: number): number {
		if (sessions.length === 0) return 0;
		
		const totalAge = sessions.reduce((sum, session) => {
			return sum + (now - session.createdAt);
		}, 0);
		
		return totalAge / sessions.length;
	}

	/**
	 * Get session type breakdown
	 */
	private getSessionTypeBreakdown(sessions: SessionInfo[]): Record<string, number> {
		const breakdown: Record<string, number> = {};
		
		for (const session of sessions) {
			breakdown[session.type] = (breakdown[session.type] || 0) + 1;
		}
		
		return breakdown;
	}

	/**
	 * Setup graceful shutdown handlers
	 */
	private setupGracefulShutdown(): void {
		const shutdown = async () => {
			console.log('[brAInwav] Initiating graceful session cleanup...');
			await this.cleanup();
			process.exit(0);
		};

		process.on('SIGTERM', shutdown);
		process.on('SIGINT', shutdown);
	}
}

export interface SessionOptions {
	type?: string;
	timeout?: number;
	metadata?: Record<string, unknown>;
}

export interface SessionInfo {
	id: string;
	type: string;
	createdAt: number;
	lastActivity: number;
	timeout: number;
	resources: Set<SessionResource>;
	status: 'active' | 'shutting-down' | 'terminated' | 'error';
	metadata: Record<string, unknown>;
}

export interface SessionResource {
	id: string;
	type: 'mcp-connection' | 'process' | 'file-handle' | 'custom';
	data?: Record<string, unknown>;
	cleanup?: () => Promise<void>;
}

export interface SessionStats {
	totalSessions: number;
	activeSessions: number;
	expiredSessions: number;
	averageAge: number;
	totalResources: number;
	sessionTypes: Record<string, number>;
}