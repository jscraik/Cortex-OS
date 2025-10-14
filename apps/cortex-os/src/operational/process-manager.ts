import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'node:child_process';
import { setTimeout, clearTimeout } from 'node:timers';

/**
 * brAInwav Process Manager for reliable process lifecycle management
 * Implements proper process reaping, health monitoring, and auto-restart
 */
export class ProcessManager extends EventEmitter {
	private processes = new Map<string, ManagedProcess>();
	private healthCheckInterval: NodeJS.Timer | null = null;
	private readonly healthCheckPeriod = 30000; // 30 seconds

	constructor() {
		super();
		this.startHealthMonitoring();
		this.setupProcessReaping();
	}

	/**
	 * Start a managed process with health monitoring
	 */
	async startProcess(options: ProcessOptions): Promise<string> {
		const processId = `brAInwav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		
		const child = spawn(options.command, options.args || [], {
			stdio: options.stdio || 'pipe',
			env: { ...process.env, ...options.env },
			detached: false, // Keep attached for proper cleanup
		});

		const managedProcess: ManagedProcess = {
			id: processId,
			child,
			options,
			startTime: Date.now(),
			restartCount: 0,
			lastHealthCheck: Date.now(),
			status: 'starting',
		};

		this.processes.set(processId, managedProcess);

		// Setup process event handlers
		this.setupProcessHandlers(managedProcess);

		// Mark as running once started
		child.on('spawn', () => {
			managedProcess.status = 'running';
			this.emit('processStarted', processId);
		});

		return processId;
	}

	/**
	 * Stop a managed process gracefully
	 */
	async stopProcess(processId: string, force = false): Promise<void> {
		const managed = this.processes.get(processId);
		if (!managed) return;

		managed.status = 'stopping';

		if (force) {
			managed.child.kill('SIGKILL');
		} else {
			// Graceful shutdown
			managed.child.kill('SIGTERM');
			
			// Force kill after timeout
			const forceTimeout = setTimeout(() => {
				if (!managed.child.killed) {
					managed.child.kill('SIGKILL');
				}
			}, 10000); // 10 second timeout

			managed.child.on('exit', () => {
				clearTimeout(forceTimeout);
			});
		}

		this.processes.delete(processId);
	}

	/**
	 * Get process health status
	 */
	getProcessHealth(processId: string): ProcessHealth | null {
		const managed = this.processes.get(processId);
		if (!managed) return null;

		return {
			id: processId,
			status: managed.status,
			pid: managed.child.pid,
			uptime: Date.now() - managed.startTime,
			restartCount: managed.restartCount,
			memoryUsage: process.memoryUsage(), // Approximate
			lastHealthCheck: managed.lastHealthCheck,
		};
	}

	/**
	 * Setup proper process reaping to prevent zombies
	 */
	private setupProcessReaping(): void {
		process.on('SIGTERM', () => this.shutdown());
		process.on('SIGINT', () => this.shutdown());
		process.on('exit', () => this.cleanup());
	}

	/**
	 * Health monitoring for all processes
	 */
	private startHealthMonitoring(): void {
		this.healthCheckInterval = setInterval(() => {
			this.performHealthChecks();
		}, this.healthCheckPeriod);
	}

	/**
	 * Perform health checks and restart unhealthy processes
	 */
	private performHealthChecks(): void {
		for (const [processId, managed] of this.processes) {
			if (managed.status !== 'running') continue;

			// Check if process is still alive
			if (managed.child.killed || managed.child.exitCode !== null) {
				this.handleProcessFailure(processId, managed);
				continue;
			}

			// Update health check timestamp
			managed.lastHealthCheck = Date.now();

			// Emit health status
			this.emit('healthCheck', {
				processId,
				status: 'healthy',
				uptime: Date.now() - managed.startTime,
			});
		}
	}

	/**
	 * Handle process failure and potential restart
	 */
	private async handleProcessFailure(processId: string, managed: ManagedProcess): Promise<void> {
		this.emit('processFailure', processId);

		// Check if should restart
		if (managed.options.autoRestart && managed.restartCount < (managed.options.maxRestarts || 3)) {
			await this.restartProcess(processId, managed);
		} else {
			this.processes.delete(processId);
			this.emit('processTerminated', processId);
		}
	}

	/**
	 * Restart a failed process
	 */
	private async restartProcess(processId: string, managed: ManagedProcess): Promise<void> {
		managed.restartCount++;
		managed.status = 'restarting';

		// Exponential backoff for restarts
		const delay = Math.min(1000 * Math.pow(2, managed.restartCount), 30000);
		
		setTimeout(async () => {
			const newProcessId = await this.startProcess(managed.options);
			this.emit('processRestarted', { oldId: processId, newId: newProcessId });
		}, delay);

		this.processes.delete(processId);
	}

	/**
	 * Setup event handlers for a process
	 */
	private setupProcessHandlers(managed: ManagedProcess): void {
		const { child, id } = managed;

		child.on('error', (error) => {
			this.emit('processError', { processId: id, error });
		});

		child.on('exit', (code, signal) => {
			this.emit('processExit', { processId: id, code, signal });
			if (code !== 0 && managed.status === 'running') {
				this.handleProcessFailure(id, managed);
			}
		});

		// Log output for debugging
		if (child.stdout) {
			child.stdout.on('data', (data) => {
				this.emit('processOutput', { processId: id, type: 'stdout', data: data.toString() });
			});
		}

		if (child.stderr) {
			child.stderr.on('data', (data) => {
				this.emit('processOutput', { processId: id, type: 'stderr', data: data.toString() });
			});
		}
	}

	/**
	 * Graceful shutdown of all processes
	 */
	private async shutdown(): Promise<void> {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}

		const shutdownPromises = Array.from(this.processes.keys()).map(
			(processId) => this.stopProcess(processId)
		);

		await Promise.all(shutdownPromises);
		this.emit('shutdown');
	}

	/**
	 * Cleanup resources
	 */
	private cleanup(): void {
		for (const [processId, managed] of this.processes) {
			if (!managed.child.killed) {
				managed.child.kill('SIGKILL');
			}
		}
		this.processes.clear();
	}
}

export interface ProcessOptions {
	command: string;
	args?: string[];
	env?: Record<string, string>;
	stdio?: 'pipe' | 'ignore' | 'inherit';
	autoRestart?: boolean;
	maxRestarts?: number;
	healthCheckUrl?: string;
}

interface ManagedProcess {
	id: string;
	child: ChildProcess;
	options: ProcessOptions;
	startTime: number;
	restartCount: number;
	lastHealthCheck: number;
	status: 'starting' | 'running' | 'stopping' | 'restarting' | 'failed';
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