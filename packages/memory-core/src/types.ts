import type {
	MemoryAnalysisInput,
	MemoryRelationshipsInput,
	MemorySearchInput,
	MemoryStatsInput,
	MemoryStoreInput,
} from '@cortex-os/tool-spec';

export type MemoryMetadata = Record<string, unknown> & {
	sourceUri?: string;
	contentSha?: string;
	tenant?: string;
	labels?: string[];
};

// Base memory entity
export interface Memory {
	id: string;
	content: string;
	importance: number;
	tags: string[];
	domain?: string;
	metadata?: MemoryMetadata;
	createdAt: Date;
	updatedAt: Date;
	vectorIndexed?: boolean;
}

// Search result with score
export interface MemorySearchResult extends Memory {
	score: number;
	matchType?: 'semantic' | 'keyword' | 'hybrid';
	highlights?: string[];
}

// Memory relationship
export interface MemoryRelationship {
	id: string;
	sourceId: string;
	targetId: string;
	type: RelationshipType;
	strength: number;
	bidirectional: boolean;
	createdAt: Date;
	metadata?: Record<string, unknown>;
}

export type RelationshipType =
	| 'references'
	| 'extends'
	| 'contradicts'
	| 'supports'
	| 'precedes'
	| 'follows'
	| 'related_to';

// Memory statistics
export interface MemoryStats {
	totalCount: number;
	domainDistribution: Record<string, number>;
	tagDistribution: Record<string, number>;
	importanceDistribution: Record<number, number>;
	temporalDistribution?: Array<{ date: string; count: number }>;
	storageSize?: {
		sqliteBytes: number;
		qdrantBytes?: number;
		totalBytes: number;
	};
	indexStats?: {
		sqliteIndexSize: number;
		qdrantVectorCount?: number;
		lastIndexed?: Date;
	};
	qdrantStats?: {
		healthy: boolean;
		collectionExists: boolean;
		vectorCount: number;
		indexedSegments?: number;
	};
	recentActivity?: Array<{
		date: string;
		stored: number;
		searched: number;
		analyzed: number;
	}>;
}

// Memory analysis results
export interface MemoryAnalysisResult {
	type: string;
	summary?: string;
	insights?: string[];
	patterns?: Record<string, unknown>;
	clusters?: Array<{
		id: string;
		label: string;
		size: number;
		examples: string[];
	}>;
	conceptNetwork?: {
		nodes: Array<{
			id: string;
			label: string;
			weight: number;
		}>;
		edges: Array<{
			source: string;
			target: string;
			weight: number;
			type: string;
		}>;
	};
	temporalPatterns?: Array<{
		period: string;
		frequency: number;
		trend: 'increasing' | 'decreasing' | 'stable';
	}>;
	metadata?: Record<string, unknown>;
}

// Memory graph visualization
export interface MemoryGraph {
	nodes: Array<{
		id: string;
		label: string;
		type: 'memory' | 'concept' | 'tag';
		weight: number;
		metadata?: Record<string, unknown>;
	}>;
	edges: Array<{
		source: string;
		target: string;
		weight: number;
		type: RelationshipType;
		directed: boolean;
	}>;
	centralNode?: string;
	metrics?: {
		nodeCount: number;
		edgeCount: number;
		density: number;
		centrality?: Record<string, number>;
	};
}

// Provider interface
export interface MemoryProvider {
	// Core operations
	get(id: string): Promise<Memory | null>;
	store(input: MemoryStoreInput): Promise<{ id: string; vectorIndexed: boolean }>;
	search(input: MemorySearchInput): Promise<MemorySearchResult[]>;
	analysis(input: MemoryAnalysisInput): Promise<MemoryAnalysisResult>;
	relationships(
		input: MemoryRelationshipsInput,
	): Promise<MemoryRelationship | MemoryRelationship[] | MemoryGraph | { success: boolean }>;
	stats(input?: MemoryStatsInput): Promise<MemoryStats>;

	// Health checks
	healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }>;

	// Optional: cleanup/maintenance
	cleanup?(): Promise<void>;
	optimize?(): Promise<void>;
	close?(): Promise<void>;
}

// Qdrant-specific types
export interface QdrantConfig {
	url: string;
	apiKey?: string;
	collection: string;
	embedDim: number;
	similarity: 'Cosine' | 'Euclidean' | 'Dot';
	timeout?: number;
}

export interface QdrantPoint {
	id: string;
	vector: number[];
	payload: {
		id: string;
		domain?: string;
		tags: string[];
		labels: string[];
		tenant?: string;
		sourceUri?: string;
		contentSha?: string;
		createdAt: number;
		updatedAt: number;
		importance: number;
	};
}

// SQLite schema types
export interface SQLiteMemoryRow {
	id: string;
	content: string;
	importance: number;
	domain?: string;
	tags?: string; // JSON string
	metadata?: string; // JSON string
	created_at: number;
	updated_at: number;
	vector_indexed?: number; // 0 or 1
}

export interface SQLiteRelationshipRow {
	id: string;
	source_id: string;
	target_id: string;
	type: string;
	strength: number;
	bidirectional: number;
	created_at: number;
	metadata?: string; // JSON string
}

// Error types
export class MemoryProviderError extends Error {
	constructor(
		public code: 'NOT_FOUND' | 'VALIDATION' | 'STORAGE' | 'NETWORK' | 'INDEX' | 'INTERNAL',
		message: string,
		public details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'MemoryProviderError';
	}
}

// Configuration
export interface MemoryCoreConfig {
	// SQLite
	sqlitePath: string;

	// Qdrant
	qdrant?: QdrantConfig;

	// Embedding
	embeddingModel?: string;
	embedDim?: number;

	// Search defaults
	defaultLimit: number;
	maxLimit: number;
	maxOffset: number;
	defaultThreshold: number;
	hybridWeight: number;

	// Performance
	enableCircuitBreaker: boolean;
	circuitBreakerThreshold: number;
	queueConcurrency: number;

	// Logging
	logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}
