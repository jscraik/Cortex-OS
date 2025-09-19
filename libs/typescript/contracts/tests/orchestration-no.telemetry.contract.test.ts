import { describe, expect, it } from 'vitest';
import { NoTelemetryEventSchema } from '../src/orchestration-no/no-telemetry.js';

describe('contract: nO Observability/Telemetry', () => {
	it('should emit structured telemetry for decision points', () => {
		const event = {
			ts: new Date().toISOString(),
			kind: 'scheduler.decision',
			traceparent: '00-11111111111111111111111111111111-2222222222222222-01',
			correlation_id: 'req-123',
			data: {
				decision: 'select-strategy',
				input: { complexity: 0.7 },
				output: { strategy: 'parallel-coordinated' },
				metrics: { durationMs: 12 },
			},
		};
		expect(NoTelemetryEventSchema.safeParse(event).success).toBe(true);
	});

	it('rejects invalid telemetry kind', () => {
		const bad = {
			ts: new Date().toISOString(),
			kind: 'unknown-kind',
			data: {},
		} as { ts: string; kind: string; data: object };
		expect(() => NoTelemetryEventSchema.parse(bad)).toThrow();
	});
});
