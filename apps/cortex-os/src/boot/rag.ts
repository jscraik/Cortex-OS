import { PyEmbedder, memoryStore } from '@cortex-os/rag';

export function wireRag(endpoint = 'http://127.0.0.1:8000') {
	const embedder = new PyEmbedder(endpoint);
	const store = memoryStore();
	return { embedder, store };
}
