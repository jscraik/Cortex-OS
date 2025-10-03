import type { N0Session } from './n0-state.js';
interface DispatchSnapshot {
	started: number;
	active: number;
	outcomes: Record<'fulfilled' | 'rejected' | 'skipped', number>;
	tokens: number;
}
export declare function recordDispatchStart(
	tool: string,
	metadata: Record<string, unknown> | undefined,
	session: N0Session,
): void;
export declare function recordDispatchSkip(
	tool: string,
	metadata: Record<string, unknown> | undefined,
	session: N0Session,
): void;
export declare function recordDispatchOutcome(
	tool: string,
	outcome: 'fulfilled' | 'rejected' | 'skipped',
	durationMs: number | undefined,
	tokensUsed: number | undefined,
	metadata: Record<string, unknown> | undefined,
	session: N0Session,
): void;
export declare function getDispatchMetricsSnapshot(): DispatchSnapshot;
export declare function resetDispatchMetricsSnapshot(): void;
//# sourceMappingURL=tool-dispatch-metrics.d.ts.map
