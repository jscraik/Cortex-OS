// Use plain string for IDs to avoid redundant aliases per lint rules
// Note: Use plain `string` for IDs across the codebase (lint rule forbids redundant aliases)

export interface MemoryPolicy {
	read?: string[];
	write?: string[];
	encrypt?: boolean;
	ttl?: number;
	pii?: boolean;
	scope?: 'session' | 'user' | 'org';
	requiresConsent?: boolean;
}

export interface Memory {
	id: string;
	kind: 'note' | 'event' | 'artifact' | 'embedding';
	text?: string;
	vector?: number[];
	tags: string[];
	ttl?: string;
	createdAt: string;
	updatedAt: string;
	provenance: {
		source: 'user' | 'agent' | 'system';
		actor?: string;
		evidence?: { uri: string; range?: [number, number] }[];
		hash?: string;
	};
	policy?: MemoryPolicy;
	embeddingModel?: string;
	// Additional metadata for integration adapters (RAG, MCP, etc.)
	metadata?: Record<string, unknown>;
}

export interface CacheManager {
	get(key: string): Promise<unknown>;
	set(key: string, value: unknown, ttl?: number): Promise<void>;
	has(key: string): Promise<boolean>;
	clear(): Promise<void>;
	size(): Promise<number>;
}
