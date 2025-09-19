import { describe, expect, it } from 'vitest';
import { PyEmbedder } from '../src/embed/python-client.js';
import { Qwen3Embedder } from '../src/embed/qwen3.js';

// Qwen3Embedder spawns Python; we won't execute the real process here.
// Instead, we verify that sanitizeTextInputs rejects unsafe input before any heavy work starts.

describe('embedders: input sanitization', () => {
	it('Qwen3Embedder rejects control characters and shell meta', async () => {
		const embedder = new Qwen3Embedder({ batchSize: 1 });
		await expect(embedder.embed(['bad\x07'])).rejects.toThrow(/invalid input/i);
		await expect(embedder.embed(['$(whoami)'])).rejects.toThrow(/invalid input/i);
	});

	it('PyEmbedder rejects unsafe inputs before HTTP call', async () => {
		const embedder = new PyEmbedder('http://127.0.0.1:0');
		await expect(embedder.embed(['safe'])).rejects.toThrow(); // endpoint invalid -> fails after sanitize
		await expect(embedder.embed(['rm -rf /;'])).rejects.toThrow(/invalid input/i);
	});
});
