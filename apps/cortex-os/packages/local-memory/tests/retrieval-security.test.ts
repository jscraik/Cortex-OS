/**
 * Security tests for ReDoS prevention in retrieval module
 */
import { describe, expect, it } from 'vitest';
import type { ModelConfig } from './index.js';
import { isModelAvailable } from './index.js';

describe('brAInwav ReDoS Prevention - retrieval/index', () => {
	it('should reject excessively long model paths', async () => {
		const longPath = 'a'.repeat(1001);
		const model: ModelConfig = {
			name: 'test-model',
			path: longPath,
			variant: 'q4',
		};

		await expect(isModelAvailable(model)).rejects.toThrow(
			'brAInwav model path exceeds maximum length',
		);
	});

	it('should reject excessively long environment variable names', async () => {
		const longEnvVar = 'A'.repeat(101);
		const model: ModelConfig = {
			name: 'test-model',
			path: `\${${longEnvVar}}`,
			variant: 'q4',
		};

		await expect(isModelAvailable(model)).rejects.toThrow(
			'brAInwav environment variable name too long',
		);
	});

	it('should handle normal model paths', async () => {
		const model: ModelConfig = {
			name: 'test-model',
			path: '/valid/path/to/model',
			variant: 'q4',
		};

		// Should not throw
		const result = await isModelAvailable(model);
		expect(typeof result).toBe('boolean');
	});

	it('should handle valid environment variable expansion', async () => {
		process.env.TEST_MODEL_PATH = '/test/path';
		const model: ModelConfig = {
			name: 'test-model',
			path: '${TEST_MODEL_PATH}/model',
			variant: 'q4',
		};

		const result = await isModelAvailable(model);
		expect(typeof result).toBe('boolean');
		delete process.env.TEST_MODEL_PATH;
	});

	it('should handle edge case: exactly 1000 chars (allowed)', async () => {
		const maxPath = 'a'.repeat(1000);
		const model: ModelConfig = {
			name: 'test-model',
			path: maxPath,
			variant: 'q4',
		};

		// Should not throw
		await expect(isModelAvailable(model)).resolves.toBeDefined();
	});

	it('should handle edge case: exactly 100 char env var name (allowed)', async () => {
		const maxEnvVar = 'A'.repeat(100);
		const model: ModelConfig = {
			name: 'test-model',
			path: `\${${maxEnvVar}}`,
			variant: 'q4',
		};

		// Should not throw
		await expect(isModelAvailable(model)).resolves.toBeDefined();
	});
});
