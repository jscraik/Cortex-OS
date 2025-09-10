import { describe, expect, it } from 'vitest';
import { agentEventCatalog } from '../../src/events/agent-events.js';

describe('Event timestamp contracts', () => {
	it('accepts ISO-8601 timestamps', () => {
		const evt = {
			type: 'agent.started',
			data: {
				agentId: 'a',
				traceId: 't',
				capability: 'code-analysis',
				input: {},
				timestamp: new Date().toISOString(),
			},
		};
		expect(() => agentEventCatalog['agent.started'].parse(evt)).not.toThrow();
	});

	it('rejects non-ISO timestamps', () => {
		const bad = {
			type: 'agent.started',
			data: {
				agentId: 'a',
				traceId: 't',
				capability: 'code-analysis',
				input: {},
				timestamp: 'not-a-timestamp',
			},
		};
		expect(() => agentEventCatalog['agent.started'].parse(bad)).toThrow();
	});
});
