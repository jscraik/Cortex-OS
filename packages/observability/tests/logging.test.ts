import { describe, expect, it, vi } from 'vitest';
import { createLogEntry, logEvidence } from '../src/logging/index.js';
import { generateRunId } from '../src/ulids.js';

describe('logging', () => {
	it('redacts sensitive fields in extra data', () => {
		const runId = generateRunId();
		const entry = createLogEntry('component', 'info', 'message', runId, undefined, {
			password: 'secret',
			nested: { token: 'abc', safe: 'ok' },
		});

		expect(entry.extra?.password).toBe('[REDACTED]');
		const nested = entry.extra?.nested as { token: string; safe: string };
		expect(nested.token).toBe('[REDACTED]');
		expect(nested.safe).toBe('ok');
	});

	it('logs evidence pointers', () => {
		const logger = { info: vi.fn() } as any;
		const runId = generateRunId();
		logEvidence(logger, runId, 'screenshot', { url: 'http://example.com' });
		expect(logger.info).toHaveBeenCalledWith(
			{
				runId,
				evidenceType: 'screenshot',
				evidence: { url: 'http://example.com' },
			},
			'Evidence attached: screenshot',
		);
	});
});
