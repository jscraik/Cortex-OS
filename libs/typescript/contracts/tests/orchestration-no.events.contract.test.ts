import { describe, expect, it } from 'vitest';
import {
	AgentCoordinationStartedEventSchema,
	ScheduleAdjustedEventSchema,
	ToolLayerInvokedEventSchema,
} from '../src/orchestration-no/no-events.js';

describe('contract: nO Event Schemas', () => {
	it('validates agent coordination started event', () => {
		const sample = { coordinationId: 'c1', planId: 'p1', startedAt: new Date().toISOString() };
		expect(AgentCoordinationStartedEventSchema.safeParse(sample).success).toBe(true);
	});

	it('validates schedule adjusted event', () => {
		const sample = {
			planId: 'p1',
			reason: 'resource-constraints',
			adjustedAt: new Date().toISOString(),
		};
		expect(ScheduleAdjustedEventSchema.safeParse(sample).success).toBe(true);
	});

	it('validates tool layer invoked event', () => {
		const sample = {
			tool: 'visualize-execution-graph',
			level: 'dashboard',
			ts: new Date().toISOString(),
		};
		expect(ToolLayerInvokedEventSchema.safeParse(sample).success).toBe(true);
	});
});
