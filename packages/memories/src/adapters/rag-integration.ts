import { legacyMemoryAdapterRemoved } from '../legacy.js';

export class MemoryStoreRAGAdapter {
	constructor() {
		legacyMemoryAdapterRemoved('MemoryStoreRAGAdapter');
	}
}

export class RAGEmbedderAdapter {
	constructor() {
		legacyMemoryAdapterRemoved('RAGEmbedderAdapter');
	}
}

export class RAGIntegration {
	constructor() {
		legacyMemoryAdapterRemoved('RAGIntegration');
	}
}

export const RAG_ADAPTERS_REMOVED = true;
