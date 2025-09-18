import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

describe('Simple Test', () => {
	it('should pass', () => {
		expect(1 + 1).toBe(2);
	});

	it('should create signature', () => {
		const payload = 'test';
		const secret = 'secret';
		const signature = createHmac('sha256', secret).update(payload).digest('hex');
		expect(signature).toBeDefined();
		expect(typeof signature).toBe('string');
	});
});
