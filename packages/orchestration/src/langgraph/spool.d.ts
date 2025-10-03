type TaskExecutor<T> = () => Promise<T>;
export interface SpoolTask<T> {
	id: string;
	name?: string;
	estimateTokens?: number;
	execute: TaskExecutor<T>;
}
export interface SpoolRunOptions {
	ms?: number;
	tokens?: number;
	concurrency?: number;
	signal?: AbortSignal;
	onStart?: (task: SpoolTask<unknown>) => void;
	onSettle?: (result: SpoolResult<unknown>) => void;
	integrationMetrics?: IntegrationMetricOptions;
}
export type SpoolStatus = 'fulfilled' | 'rejected' | 'skipped';
export interface SpoolResult<T> {
	id: string;
	status: SpoolStatus;
	value?: T;
	reason?: Error;
	durationMs: number;
	tokensUsed: number;
	started: boolean;
}
export interface IntegrationMetricOptions {
	enabled?: boolean;
	attributes?: Record<string, string>;
	onRecord?: (durationMs: number, attributes: Record<string, string>) => void;
}
export declare function runSpool<T>(
	tasks: SpoolTask<T>[],
	opts?: SpoolRunOptions,
): Promise<SpoolResult<T>[]>;
//# sourceMappingURL=spool.d.ts.map
