import { describe, expect, it } from 'vitest';

import {
	RoutingDecisionEventSchema,
	RoutingFallbackEventSchema,
	RoutingPlanEventSchema,
} from '../routing-events.js';

describe('cortex routing events', () => {
	it('validates routing plan schema', () => {
		const event = RoutingPlanEventSchema.parse({
			event_id: '00000000-0000-4000-8000-000000000001',
			event_type: 'cortex.routing.plan',
			source: 'cortex-orchestration',
			timestamp: new Date().toISOString(),
			requestId: 'req-123',
			interfaceId: 'cli',
			capabilities: ['code_edit'],
			tags: ['dev'],
			candidates: [{ agent: 'packages/agents/dev', score: 90, reasons: ['base'] }],
			appliedRules: [],
		});
		expect(event.candidates[0]?.agent).toBe('packages/agents/dev');
	});

	it('enforces approval structure on decision events', () => {
		const decision = RoutingDecisionEventSchema.parse({
			event_id: '00000000-0000-4000-8000-000000000002',
			event_type: 'cortex.routing.decision',
			source: 'cortex-orchestration',
			timestamp: new Date().toISOString(),
			requestId: 'req-456',
			interfaceId: 'cli',
			policyVersion: '0.4',
			selectedAgent: 'packages/agents/dev',
			candidates: [{ agent: 'packages/agents/dev', score: 95, reasons: ['capability:code_edit'] }],
			appliedRules: [],
			approval: { required: false, approvers: [], policies: [] },
		});
		expect(decision.selectedAgent).toContain('agents');
	});

	it('rejects fallback events missing reason', () => {
		expect(() =>
			RoutingFallbackEventSchema.parse({
				event_id: '00000000-0000-4000-8000-000000000003',
				event_type: 'cortex.routing.fallback',
				source: 'cortex-orchestration',
				timestamp: new Date().toISOString(),
				requestId: 'req-789',
				interfaceId: 'cli',
				agent: 'packages/agents/generalist',
			}),
		).toThrow();
	});
});
