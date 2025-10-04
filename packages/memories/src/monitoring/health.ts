import { safeFetch } from '@cortex-os/utils';
import { resolveStoreKindFromEnv } from '../config/store-from-env.js';

export interface HealthStatus {
	healthy: boolean;
	latency?: number;
	error?: string;
	timestamp: string;
	details?: Record<string, unknown>;
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
					error: 'brAInwav MLX service URL not configured',
					timestamp: new Date().toISOString(),
				};
			}

			const url = new URL('/health', baseUrl);
			const response = await safeFetch(url.toString(), {
				allowedHosts: [url.hostname.toLowerCase()],
				allowedProtocols: [url.protocol],
				allowLocalhost: true,
				timeout: 5000,
			});

			if (!response.ok) {
				return {
					healthy: false,
					error: `brAInwav MLX service health check failed: ${response.status}`,
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
				error:
					error instanceof Error
						? `brAInwav MLX error: ${error.message}`
						: 'brAInwav MLX encountered unknown error',
				timestamp: new Date().toISOString(),
			};
		}
	}

	async checkOllama(): Promise<HealthStatus> {
		const start = Date.now();

		try {
			const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
			const url = new URL('/api/tags', baseUrl);
			const response = await safeFetch(url.toString(), {
				allowedHosts: [url.hostname.toLowerCase()],
				allowedProtocols: [url.protocol],
				allowLocalhost: true,
				timeout: 5000,
			});

			if (!response.ok) {
				return {
					healthy: false,
					error: `brAInwav Ollama health check failed: ${response.status}`,
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
				error:
					error instanceof Error
						? `brAInwav Ollama error: ${error.message}`
						: 'brAInwav Ollama encountered unknown error',
				timestamp: new Date().toISOString(),
			};
		}
	}

	async checkDatabase(): Promise<HealthStatus> {
		const start = Date.now();

		try {
			const adapter = resolveStoreKindFromEnv();
			return {
				healthy: true,
				latency: Date.now() - start,
				timestamp: new Date().toISOString(),
				details: { adapter },
			};
		} catch (error) {
			return {
				healthy: false,
				error:
					error instanceof Error
						? `brAInwav database error: ${error.message}`
						: 'brAInwav database encountered unknown error',
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
