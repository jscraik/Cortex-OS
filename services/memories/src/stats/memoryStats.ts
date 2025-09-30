import type { MemoryHealthChecker, MemoryHealthStatus } from '../health/memoryHealth.js';

export interface MemoryStats {
	backendId: string;
	health: {
		status: MemoryHealthStatus;
		latencyMs: number;
	};
	metadata: Record<string, unknown>;
}

export class MemoryStatsService {
	constructor(private readonly checker: MemoryHealthChecker) {}

	async collect(): Promise<MemoryStats> {
		const health = await this.checker.checkActiveBackend();
		const metadata = this.checker.describeActiveBackend();

		const stats: MemoryStats = {
			backendId: health.backendId,
			health: {
				status: health.status,
				latencyMs: health.latencyMs,
			},
			metadata: metadata.details,
		};

		return stats;
	}
}
