import { describe, expect, it } from 'vitest';
import { AgentError, ProviderError, ValidationError } from '../../../src/lib/types.js';

/**
 * FINAL CLEAN VERSION (file fully rewritten)
 */
describe('error classes', () => {
	it('AgentError carries code/details', () => {
		const e = new AgentError('msg', 'E_CODE', { a: 1 });
		expect(e.code).toBe('E_CODE');
	});
	it('ProviderError carries provider/details', () => {
		const e = new ProviderError('pmsg', 'mlx');
		expect(e.provider).toBe('mlx');
	});
	it('ValidationError carries field/value', () => {
		const e = new ValidationError('v', 'f', 10);
		expect(e.field).toBe('f');
	});
});

// EOF
