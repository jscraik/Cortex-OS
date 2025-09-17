import { describe, expect, it } from 'vitest';
import { cloudEventSchema } from '../../src/lib/event-bus.js';

describe('CloudEvents envelope', () => {
	it('validates a properly formed CloudEvent', () => {
		const evt = {
			specversion: '1.0',
			type: 'agents.agent.started',
			source: 'cortex-os://agents/abc',
			id: 'ulid-01H...',
			time: new Date().toISOString(),
			datacontenttype: 'application/json',
			data: {
				agentId: 'abc',
				traceId: 't',
				capability: 'code-analysis',
				timestamp: new Date().toISOString(),
			},
		};
		expect(() => cloudEventSchema.parse(evt)).not.toThrow();
	});
});
