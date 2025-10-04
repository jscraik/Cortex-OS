// Minimal HTTP embedder client for a Python service
// Endpoint contract: POST /embed { texts: string[] } -> { embeddings: number[][] }
import { safeFetchJson } from '@cortex-os/utils';

export class PyEmbedder {
	constructor(private endpoint: string = 'http://127.0.0.1:8000') {}

	async embed(texts: string[]): Promise<number[][]> {
		// Validate inputs before network operations
		const { sanitizeTextInputs } = await import('../lib/security');
		sanitizeTextInputs(texts);
		try {
			const endpoint = new URL('/embed', this.endpoint);
			const json = await safeFetchJson<{ embeddings: number[][] }>(endpoint.toString(), {
				allowedHosts: [endpoint.hostname.toLowerCase()],
				allowedProtocols: [endpoint.protocol],
				allowLocalhost: true,
				fetchOptions: {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ texts }),
				},
			});
			if (!Array.isArray(json.embeddings)) throw new Error('Invalid embed response');
			return json.embeddings;
		} catch (err) {
			throw new Error(`Python embedder failed: ${err}`);
		}
	}
}
