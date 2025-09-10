import { describe, expect, it } from 'vitest';
import {
	CloudEvent,
	isValidCloudEvent,
} from '../src/integrations/cloudevents.js';
import { auditEvent } from '../src/lib/audit.js';

describe('auditEvent CloudEvents', () => {
	it('creates a valid CloudEvent', () => {
		const evt = auditEvent(
			'tool',
			'action',
			{ runId: 'r1', traceId: 't1' },
			{ foo: 'bar' },
		);
		expect(evt).toBeInstanceOf(CloudEvent);
		expect(isValidCloudEvent(evt)).toBe(true);
		expect(evt.type).toBe('com.cortex.tool.action');
	});
});
