import { randomUUID } from 'node:crypto';
import type { ObservabilityBus } from '@cortex-os/observability';
import { OBSERVABILITY_EVENT_TYPES } from '@cortex-os/observability';

export interface TraceContext {
	traceId: string;
	startTime: number;
}

export function startHttpTrace(
	bus: ObservabilityBus | undefined,
	operationName: string,
	service: string,
	tags: Record<string, string>,
): TraceContext {
	const traceId = randomUUID();
	const startTime = Date.now();
	if (bus) {
		void bus.publish(OBSERVABILITY_EVENT_TYPES.TRACE_CREATED, {
			traceId,
			operationName,
			service,
			startTime: new Date(startTime).toISOString(),
			tags,
		}).catch((error) => {
			console.warn('brAInwav observability: failed to publish TRACE_CREATED', error);
		});
	}
	return { traceId, startTime };
}

export function completeHttpTrace(
	bus: ObservabilityBus | undefined,
	trace: TraceContext,
	durationMs: number,
	success: boolean,
): void {
	if (!bus) return;
	void bus
		.publish(OBSERVABILITY_EVENT_TYPES.TRACE_COMPLETED, {
			traceId: trace.traceId,
			duration: durationMs,
			status: success ? 'success' : 'error',
			completedAt: new Date(trace.startTime + durationMs).toISOString(),
		})
		.catch((error) => {
			console.warn('brAInwav observability: failed to publish TRACE_COMPLETED', error);
		});
}
