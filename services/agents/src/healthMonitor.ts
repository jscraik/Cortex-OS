export interface HealthCheckResult {
	name: string;
	healthy: boolean;
	details?: Record<string, unknown>;
}

export type HealthCheck = () => Promise<HealthCheckResult>;

export class HealthMonitor {
	private readonly checks: HealthCheck[];

	constructor(checks: HealthCheck[]) {
		if (checks.length === 0) {
			throw new Error('brAInwav agent health monitor requires at least one check');
		}

		this.checks = checks;
	}

	async run(): Promise<HealthCheckResult[]> {
		const results = await Promise.all(this.checks.map(async (check) => check()));
		return results;
	}
}
