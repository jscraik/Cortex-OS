/**
 * brAInwav MCP Server Pool Manager
 * Implements shared local-memory instances between sessions with lifecycle management
 */

import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export interface MCPServerConfig {
	command: string;
	args: string[];
	maxInstances: number;
	idleTimeout: number;
	memoryLimitMB: number;
	restartOnMemoryLeak: boolean;
}

export interface MCPServerInstance {
	id: string;
	process: ChildProcess;
	port: number;
	createdAt: Date;
	lastUsedAt: Date;
	memoryUsageMB: number;
	isHealthy: boolean;
}

/**
 * brAInwav MCP Server Pool for efficient resource management
 */
export class MCPServerPool extends EventEmitter {
	private instances = new Map<string, MCPServerInstance>();
	private config: MCPServerConfig;
	private healthCheckInterval?: NodeJS.Timeout;
	private cleanupInterval?: NodeJS.Timeout;

	constructor(config: MCPServerConfig) {
		super();
		this.config = config;
		this.startHealthChecks();
	}

	/**
	 * Get or create MCP server instance
	 */
	async getServer(): Promise<MCPServerInstance> {
		// Try to reuse existing healthy instance
		const availableInstance = this.findAvailableInstance();
		if (availableInstance) {
			availableInstance.lastUsedAt = new Date();
			this.emit('server-reused', { instanceId: availableInstance.id });
			return availableInstance;
		}

		// Create new instance if under limit
		if (this.instances.size < this.config.maxInstances) {
			return this.createInstance();
		}

		// Wait for available instance or fail
		throw new Error('[brAInwav] MCP server pool exhausted');
	}

	/**
	 * Release server instance back to pool
	 */
	releaseServer(instanceId: string): void {
		const instance = this.instances.get(instanceId);
		if (instance) {
			instance.lastUsedAt = new Date();
			this.emit('server-released', { instanceId });
		}
	}

	/**
	 * Graceful shutdown of all instances
	 */
	async shutdown(): Promise<void> {
		console.log('[brAInwav] Shutting down MCP server pool...');
		
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}

		const shutdownPromises = Array.from(this.instances.values()).map(
			instance => this.terminateInstance(instance.id)
		);

		await Promise.allSettled(shutdownPromises);
		this.instances.clear();
		this.emit('pool-shutdown');
	}

	private findAvailableInstance(): MCPServerInstance | undefined {
		for (const instance of this.instances.values()) {
			if (instance.isHealthy && this.isInstanceIdle(instance)) {
				return instance;
			}
		}
		return undefined;
	}

	private async createInstance(): Promise<MCPServerInstance> {
		const id = `brAInwav-mcp-${randomUUID()}`;
		const port = await this.findAvailablePort();
		
                const childProcess = spawn(this.config.command, [
                        ...this.config.args,
                        '--port', port.toString()
                ], {
                        stdio: ['pipe', 'pipe', 'pipe'],
                        env: {
                                ...process.env,
                                BRAINWAV_MCP_INSTANCE_ID: id,
                                BRAINWAV_POOL_MANAGED: 'true'
                        }
                });

                const instance: MCPServerInstance = {
                        id,
                        process: childProcess,
			port,
			createdAt: new Date(),
			lastUsedAt: new Date(),
			memoryUsageMB: 0,
			isHealthy: true
		};

                this.instances.set(id, instance);

                // Set up process event handlers
                childProcess.on('exit', (code) => {
                        this.handleInstanceExit(id, code);
                });

                childProcess.on('error', (error) => {
                        console.error(`[brAInwav] MCP instance ${id} error:`, error);
                        instance.isHealthy = false;
                });

		this.emit('server-created', { instanceId: id, port });
		return instance;
	}

	private async terminateInstance(instanceId: string): Promise<void> {
		const instance = this.instances.get(instanceId);
		if (!instance) return;

		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				instance.process.kill('SIGKILL');
				resolve();
			}, 5000);

			instance.process.once('exit', () => {
				clearTimeout(timeout);
				resolve();
			});

			instance.process.kill('SIGTERM');
		});
	}

	private isInstanceIdle(instance: MCPServerInstance): boolean {
		const idleTime = Date.now() - instance.lastUsedAt.getTime();
		return idleTime < this.config.idleTimeout;
	}

	private async findAvailablePort(): Promise<number> {
		// Simple port allocation - in production, use proper port management
		return 3026 + this.instances.size;
	}

	private handleInstanceExit(instanceId: string, code: number | null): void {
		console.log(`[brAInwav] MCP instance ${instanceId} exited with code ${code}`);
		this.instances.delete(instanceId);
		this.emit('server-exited', { instanceId, exitCode: code });
	}

	private startHealthChecks(): void {
		this.healthCheckInterval = setInterval(() => {
			this.performHealthCheck();
		}, 30000); // Every 30 seconds

		this.cleanupInterval = setInterval(() => {
			this.cleanupIdleInstances();
		}, this.config.idleTimeout);
	}

	private performHealthCheck(): void {
		for (const [id, instance] of this.instances) {
			// Check memory usage
			this.checkInstanceMemory(instance).then((memoryMB) => {
				instance.memoryUsageMB = memoryMB;
				
				if (memoryMB > this.config.memoryLimitMB) {
					console.warn(`[brAInwav] Instance ${id} exceeds memory limit: ${memoryMB}MB`);
					
					if (this.config.restartOnMemoryLeak) {
						this.restartInstance(id);
					}
				}
			}).catch(error => {
				console.error(`[brAInwav] Health check failed for ${id}:`, error);
				instance.isHealthy = false;
			});
		}
	}

	private async checkInstanceMemory(instance: MCPServerInstance): Promise<number> {
		return new Promise((resolve, reject) => {
			const { exec } = require('node:child_process');
			exec(`ps -o rss= -p ${instance.process.pid}`, (error: any, stdout: string) => {
				if (error) {
					reject(error);
					return;
				}
				const memoryKB = parseInt(stdout.trim(), 10) || 0;
				resolve(Math.round(memoryKB / 1024));
			});
		});
	}

	private async restartInstance(instanceId: string): Promise<void> {
		console.log(`[brAInwav] Restarting MCP instance ${instanceId}`);
		await this.terminateInstance(instanceId);
		// New instance will be created on next getServer() call
	}

	private cleanupIdleInstances(): void {
		const now = Date.now();
		
		for (const [id, instance] of this.instances) {
			const idleTime = now - instance.lastUsedAt.getTime();
			
			if (idleTime > this.config.idleTimeout && this.instances.size > 1) {
				console.log(`[brAInwav] Cleaning up idle instance ${id}`);
				this.terminateInstance(id);
			}
		}
	}

	/**
	 * Get pool statistics
	 */
	getStats() {
		return {
			totalInstances: this.instances.size,
			healthyInstances: Array.from(this.instances.values()).filter(i => i.isHealthy).length,
			totalMemoryMB: Array.from(this.instances.values()).reduce((sum, i) => sum + i.memoryUsageMB, 0),
			averageMemoryMB: this.instances.size > 0 
				? Array.from(this.instances.values()).reduce((sum, i) => sum + i.memoryUsageMB, 0) / this.instances.size 
				: 0
		};
	}
}