export interface HealthStatus {
	healthy: boolean;
	latency?: number;
	error?: string;
	timestamp: string;
}

export interface SystemHealth {
	isHealthy: boolean;
	mlx: HealthStatus;
	ollama: HealthStatus;
	database: HealthStatus;
	timestamp: string;
	uptime: number;
}

export class HealthMonitor {
	private startTime = Date.now();

	async checkMLX(): Promise<HealthStatus> {
		const start = Date.now();

		try {
			// Check if MLX service is available
			const baseUrl = process.env.MLX_EMBED_BASE_URL || process.env.MLX_SERVICE_URL;
			if (!baseUrl) {
				return {
					healthy: false,
					error: 'MLX service URL not configured',
					timestamp: new Date().toISOString(),
				};
			}

			const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) {
				return {
					healthy: false,
					error: `MLX service health check failed: ${response.status}`,
					timestamp: new Date().toISOString(),
				};
			}

			return {
				healthy: true,
				latency: Date.now() - start,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			return {
				healthy: false,
				error: error instanceof Error ? error.message : 'Unknown MLX error',
				timestamp: new Date().toISOString(),
			};
		}
	}

	async checkOllama(): Promise<HealthStatus> {
		const start = Date.now();

		try {
			const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
			const response = await fetch(`${baseUrl}/api/tags`, {
				method: 'GET',
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) {
				return {
					healthy: false,
					error: `Ollama health check failed: ${response.status}`,
					timestamp: new Date().toISOString(),
				};
			}

			return {
				healthy: true,
				latency: Date.now() - start,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			return {
				healthy: false,
				error: error instanceof Error ? error.message : 'Unknown Ollama error',
				timestamp: new Date().toISOString(),
			};
		}
	}

	async checkDatabase(): Promise<HealthStatus> {
		const start = Date.now();

		try {
			// This will be implemented based on the active store adapter
			// For now, just check if we can connect to SQLite
			const adapter = process.env.MEMORIES_STORE_ADAPTER || 'memory';

			if (adapter === 'memory') {
				return {
					healthy: true,
					latency: Date.now() - start,
					timestamp: new Date().toISOString(),
				};
			}

			// TODO: Add actual database health checks for SQLite and Prisma
			return {
				healthy: true,
				latency: Date.now() - start,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			return {
				healthy: false,
				error: error instanceof Error ? error.message : 'Unknown database error',
				timestamp: new Date().toISOString(),
			};
		}
	}

	async checkAll(): Promise<SystemHealth> {
		const [mlx, ollama, database] = await Promise.all([
			this.checkMLX(),
			this.checkOllama(),
			this.checkDatabase(),
		]);

		const isHealthy = mlx.healthy && ollama.healthy && database.healthy;

		return {
			isHealthy,
			mlx,
			ollama,
			database,
			timestamp: new Date().toISOString(),
			uptime: Date.now() - this.startTime,
		};
	}
}

export const healthMonitor = new HealthMonitor();
