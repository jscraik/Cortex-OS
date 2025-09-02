import { PyEmbedder } from "@cortex-os/rag-embed/python-client";
import { memoryStore } from "@cortex-os/rag-store/memory";

export function wireRag(endpoint = "http://127.0.0.1:8000") {
	const embedder = new PyEmbedder(endpoint);
	const store = memoryStore();
	return { embedder, store };
}
