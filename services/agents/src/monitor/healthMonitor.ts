import { performance } from 'node:perf_hooks';

export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthCheckResult {
        id: string;
        status: HealthStatus;
        latencyMs: number;
        detail?: string;
}

export interface DependencyCheck {
        id: string;
        check(): Promise<HealthStatus | HealthCheckResult>;
}

export interface HealthMonitorReport {
        status: HealthStatus;
        checks: HealthCheckResult[];
}

const normaliseResult = async (dependency: DependencyCheck): Promise<HealthCheckResult> => {
        const started = performance.now();
        const raw = await dependency.check();
        const latencyMs = performance.now() - started;

        if (typeof raw === 'string') {
                return {
                        id: dependency.id,
                        status: raw,
                        latencyMs,
                } satisfies HealthCheckResult;
        }

        return {
                        ...raw,
                        latencyMs,
                } satisfies HealthCheckResult;
};

export class HealthMonitor {
        constructor(private readonly dependencies: DependencyCheck[]) {
                if (!dependencies.length) {
                        throw new Error('brAInwav health monitor requires at least one dependency');
                }
        }

        async run(): Promise<HealthMonitorReport> {
                const checks = await Promise.all(this.dependencies.map((dependency) => normaliseResult(dependency)));

                const hasDown = checks.some((check) => check.status === 'down');
                const hasDegraded = checks.some((check) => check.status === 'degraded');
                let status: HealthStatus = 'ok';

                if (hasDown) {
                        status = 'down';
                } else if (hasDegraded) {
                        status = 'degraded';
                }

                console.info('brAInwav health monitor report generated', {
                        status,
                        checks,
                });

                return {
                        status,
                        checks,
                };
        }
}
