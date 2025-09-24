import { describe, expect, it } from 'vitest';
import { Qwen3Embedder } from '../src/embed/qwen3.js';
import {
	sanitizeMetadata,
	sanitizeTextInputs,
	validateContentSize,
	validateEmbeddingDimensions,
} from '../src/lib/security.js';

describe('Security utilities', () => {
	it('rejects content over size limit', () => {
		const large = 'x'.repeat(26_000);
		expect(() => validateContentSize(large)).toThrow('Content exceeds maximum size');
	});

	it('rejects control characters and shell meta', () => {
		expect(() => sanitizeTextInputs(['ok'])).not.toThrow();
		expect(() => sanitizeTextInputs(['bad; rm -rf /'])).toThrow('Invalid input');
	});

	it('detects prototype pollution', () => {
		expect(() => sanitizeMetadata({ __proto__: { polluted: true } })).toThrow(
			'Prototype pollution detected',
		);
	});

	it('validates embedding dimensions', () => {
		// 2-dim vector is invalid; allowed dims are 384,768,1024,1536,3072
		expect(() => validateEmbeddingDimensions([0.1, 0.2])).toThrow('Invalid embedding dimension');
	});
});

describe('Qwen3Embedder sanitization', () => {
	it('rejects malicious input', async () => {
		const embedder = new Qwen3Embedder({ modelSize: '0.6B', modelPath: 'model' });
		await expect(embedder.embed(['hello; rm -rf /'])).rejects.toThrow('Invalid input');
	});
});
