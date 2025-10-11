/**
 * Security tests for ReDoS prevention in prompt-registry
 */
import { describe, expect, it } from 'vitest';
import { ensureAgentPromptRegistered } from './prompt-registry.js';

describe('brAInwav ReDoS Prevention - prompt-registry', () => {
	it('should reject excessively long prompt names', () => {
		const longName = 'a'.repeat(501);
		const template = 'test template';

		expect(() => ensureAgentPromptRegistered(longName, 'project', template)).toThrow(
			'brAInwav prompt name exceeds maximum length',
		);
	});

	it('should handle normal prompt names', () => {
		const normalName = 'valid-prompt-name';
		const template = 'test template';

		// Should not throw
		expect(() => ensureAgentPromptRegistered(normalName, 'project', template)).not.toThrow();
	});

	it('should sanitize prompt names correctly', () => {
		const nameWithSpecialChars = 'Test@Prompt#Name!';
		const template = 'test template';

		// Should not throw and should sanitize
		const result = ensureAgentPromptRegistered(nameWithSpecialChars, 'project', template);
		expect(result).toBeDefined();
		expect(typeof result).toBe('string');
	});

	it('should handle edge case: exactly 500 chars (allowed)', () => {
		const maxName = 'a'.repeat(500);
		const template = 'test template';

		// Should not throw
		expect(() => ensureAgentPromptRegistered(maxName, 'project', template)).not.toThrow();
	});

	it('should handle empty names gracefully', () => {
		const emptyName = '';
		const template = 'test template';

		// Should not throw but may produce sanitized name
		expect(() => ensureAgentPromptRegistered(emptyName, 'project', template)).not.toThrow();
	});

	it('should handle unicode characters in prompt names', () => {
		const unicodeName = '测试提示符';
		const template = 'test template';

		// Should not throw
		expect(() => ensureAgentPromptRegistered(unicodeName, 'project', template)).not.toThrow();
	});
});
