import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { cloneEnvelope, createA2AEventEnvelope } from './envelope';

const baseErrorEvent = {
	event_id: randomUUID(),
	event_type: 'github.error' as const,
	source: 'github-client' as const,
	timestamp: new Date().toISOString(),
	error: {
		id: randomUUID(),
		message: 'network failure',
		category: 'network' as const,
		severity: 'medium' as const,
		is_retryable: true,
		context: {
			operation: 'list-repos',
			retry_count: 1,
		},
		timestamp: new Date().toISOString(),
	},
};

describe('createA2AEventEnvelope', () => {
	it('builds an envelope with defaults applied', () => {
		const envelope = createA2AEventEnvelope(baseErrorEvent);

		expect(envelope.event.event_type).toBe('github.error');
		expect(envelope.routing.topic).toBe('github.error');
		expect(envelope.retry_policy.max_attempts).toBe(3);
		expect(envelope.priority).toBe('normal');
	});

	it('cloneEnvelope preserves undefined optional fields', () => {
		const envelope = createA2AEventEnvelope(baseErrorEvent, {
			sourceInfo: { process_id: undefined },
		});

		const cloned = cloneEnvelope(envelope);

		expect(cloned).not.toBe(envelope);
		expect(Object.hasOwn(cloned.source_info, 'process_id')).toBe(true);
		expect(cloned.source_info.process_id).toBeUndefined();
	});
});
