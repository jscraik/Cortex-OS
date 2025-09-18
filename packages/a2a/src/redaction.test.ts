import { describe, expect, it } from 'vitest';
import { createRedactor } from './redaction.js';

describe('Redaction', () => {
	it('redacts configured fields', () => {
		const redactor = createRedactor({
			redactPaths: ['user.token', 'credentials.password'],
		});
		const original = {
			user: { id: 'u1', token: 'secret-token' },
			credentials: { password: 'p@ss', note: 'keep' },
		};
		const redacted = redactor.redact(original);
		expect(redacted.user.token).toBe('***');
		expect(redacted.credentials.password).toBe('***');
		expect(redacted.credentials.note).toBe('keep');
		expect(original.user.token).toBe('secret-token');
	});
});
