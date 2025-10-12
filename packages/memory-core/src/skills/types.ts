/**
 * brAInwav Skill Type Definitions
 * Core types and interfaces for the Skills System
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/types
 */

import type {
	Skill,
	SkillFrontmatter,
	SkillMetadata,
	SkillPersuasiveFraming,
	SkillSearchQuery,
	SkillSearchResult,
} from '@cortex-os/contracts';

// ============================================================================
// Re-export Contract Types
// ============================================================================

export type {
        Skill,
        SkillFrontmatter,
        SkillMetadata,
        SkillPersuasiveFraming,
        SkillSearchQuery,
        SkillSearchResult,
};

export type SkillCategory = SkillMetadata['category'];
export type SkillDifficulty = SkillMetadata['difficulty'];

// ============================================================================
// Skill File Processing Types
// ============================================================================

/**
 * Raw skill file representation before parsing
 */
export interface SkillFileRaw {
	filePath: string;
	fileName: string;
	rawContent: string;
	fileSize: number;
	lastModified: Date;
}

/**
 * Parsed skill file with separated frontmatter and content
 */
export interface SkillFileParsed {
        filePath: string;
        fileName: string;
        frontmatter: SkillFrontmatter;
        content: string;
        rawYaml: string;
        parseTime: number;
        skill?: Skill;
        errors?: string[];
}

/**
 * Validated skill ready for indexing
 */
export interface SkillValidated {
	skill: Skill;
	filePath: string;
	validationTime: number;
	warnings: SkillValidationWarning[];
}

/**
 * Skill validation warning
 */
export interface SkillValidationWarning {
	field: string;
	message: string;
	severity: 'info' | 'warning';
	suggestion?: string;
}

/**
 * Skill validation error
 */
export interface SkillValidationError {
	field: string;
	message: string;
	code: string;
	value?: unknown;
	constraint?: string;
}

// ============================================================================
// Skill Loader Configuration
// ============================================================================

/**
 * Configuration for skill file loading
 */
export interface SkillLoaderConfig {
	/** Base directory for skill files */
	skillsDirectory: string;

	/** File pattern to match (e.g., '**\/*.md') */
	filePattern: string;

	/** Whether to watch for file changes */
	watchForChanges: boolean;

	/** Maximum file size in bytes (default: 1MB) */
	maxFileSize: number;

	/** Encoding for skill files (default: 'utf-8') */
	encoding: BufferEncoding;

	/** Whether to validate skills on load */
	validateOnLoad: boolean;

	/** Whether to index skills on load */
	indexOnLoad: boolean;
}

/**
 * Skill loader result
 */
export interface SkillLoaderResult {
	loaded: SkillValidated[];
	failed: SkillLoadError[];
	stats: {
		totalFiles: number;
		successCount: number;
		failureCount: number;
		totalLoadTime: number;
		averageLoadTime: number;
	};
}

/**
 * Skill load error
 */
export interface SkillLoadError {
	filePath: string;
	error: Error;
	stage: 'read' | 'parse' | 'validate';
	timestamp: Date;
}

// ============================================================================
// Skill Indexing Types
// ============================================================================

/**
 * Configuration for skill indexing
 */
export interface SkillIndexConfig {
	/** Vector store type */
	vectorStore: 'chromadb' | 'qdrant' | 'sqlite-vec';

	/** Embedding model */
	embeddingModel: string;

	/** Embedding dimensions */
	embeddingDimensions: number;

	/** Chunk size for large skills */
	chunkSize: number;

	/** Chunk overlap */
	chunkOverlap: number;

	/** Collection/index name */
	collectionName: string;

	/** Whether to create new collection on init */
	recreateCollection: boolean;
}

/**
 * Indexed skill with embedding metadata
 */
export interface SkillIndexed {
	skillId: string;
	skill: Skill;
	embeddings: SkillEmbedding[];
	indexedAt: Date;
	vectorStore: string;
}

/**
 * Skill embedding chunk
 */
export interface SkillEmbedding {
	chunkId: string;
	skillId: string;
	content: string;
	embedding: number[];
	metadata: {
		chunkIndex: number;
		totalChunks: number;
		section?: string;
		startChar: number;
		endChar: number;
	};
}

// ============================================================================
// Skill Search and Retrieval Types
// ============================================================================

/**
 * Enhanced search query with filters
 */
export interface SkillSearchQueryEnhanced extends SkillSearchQuery {
	/** Filter by required tools */
	requiredTools?: string[];

	/** Filter by prerequisites */
	prerequisites?: string[];

	/** Filter by author */
	author?: string;

	/** Minimum version */
	minVersion?: string;

	/** Maximum version */
	maxVersion?: string;

	/** Sort order */
	sortBy?: 'relevance' | 'createdAt' | 'updatedAt' | 'name';

	/** Sort direction */
	sortDirection?: 'asc' | 'desc';
}

/**
 * Enhanced search result with additional metadata
 */
export interface SkillSearchResultEnhanced extends SkillSearchResult {
	/** Distance/similarity score from vector search */
	distance: number;

	/** Matched chunks from skill content */
	matchedChunks: SkillMatchedChunk[];

	/** Related skills by category/tags */
	relatedSkills: string[];

	/** Usage statistics */
	usageStats?: SkillUsageStats;
}

/**
 * Matched content chunk from search
 */
export interface SkillMatchedChunk {
	chunkId: string;
	content: string;
	score: number;
	highlights: string[];
	section?: string;
}

/**
 * Skill usage statistics
 */
export interface SkillUsageStats {
	skillId: string;
	retrievalCount: number;
	lastRetrievedAt: Date;
	averageRelevanceScore: number;
	successfulApplications: number;
	failedApplications: number;
}

// ============================================================================
// Skill Cache Types
// ============================================================================

/**
 * Skill cache entry
 */
export interface SkillCacheEntry {
	skillId: string;
	skill: Skill;
	cachedAt: Date;
	accessCount: number;
	lastAccessedAt: Date;
	ttl: number;
}

/**
 * Skill cache configuration
 */
export interface SkillCacheConfig {
	/** Maximum cache size (number of skills) */
	maxSize: number;

	/** Time-to-live in milliseconds */
	ttl: number;

	/** Eviction policy */
	evictionPolicy: 'lru' | 'lfu' | 'fifo';

	/** Whether to warm cache on startup */
	warmOnStartup: boolean;
}

// ============================================================================
// Skill Execution Types
// ============================================================================

/**
 * Skill execution context
 */
export interface SkillExecutionContext {
	skillId: string;
	requestedBy: string;
	sessionId?: string;
	parameters: Record<string, unknown>;
	environment: SkillExecutionEnvironment;
}

/**
 * Skill execution environment
 */
export interface SkillExecutionEnvironment {
	/** Available MCP tools */
	availableTools: string[];

	/** Memory store reference */
	memoryStore?: string;

	/** Agent capabilities */
	agentCapabilities: string[];

	/** Security context */
	securityContext: {
		permissions: string[];
		restrictions: string[];
	};
}

/**
 * Skill execution result
 */
export interface SkillExecutionResult {
	skillId: string;
	success: boolean;
	output?: unknown;
	error?: SkillExecutionError;
	executionTime: number;
	tokensUsed: number;
	warnings: string[];
	metadata: {
		toolsUsed: string[];
		memoriesAccessed: string[];
		eventsEmitted: string[];
	};
}

/**
 * Skill execution error
 */
export interface SkillExecutionError {
	code: string;
	message: string;
	details?: Record<string, unknown>;
	recoverable: boolean;
	retryAfter?: number;
}

// ============================================================================
// Skill Analytics Types
// ============================================================================

/**
 * Skill analytics data
 */
export interface SkillAnalytics {
	skillId: string;
	metrics: {
		totalRetrievals: number;
		totalExecutions: number;
		successRate: number;
		averageExecutionTime: number;
		averageTokenUsage: number;
		averageRelevanceScore: number;
	};
	trends: {
		popularityTrend: 'increasing' | 'stable' | 'decreasing';
		successRateTrend: 'improving' | 'stable' | 'declining';
	};
	topUsers: string[];
	commonContexts: string[];
	relatedSkillsUsed: string[];
}

// ============================================================================
// Skill Management Types
// ============================================================================

/**
 * Skill update operation
 */
export interface SkillUpdateOperation {
	skillId: string;
	updates: Partial<Skill>;
	updatedBy: string;
	updateReason: string;
	requiresReindexing: boolean;
}

/**
 * Skill deprecation operation
 */
export interface SkillDeprecationOperation {
	skillId: string;
	reason: string;
	replacedBy?: string;
	deprecatedBy: string;
	notifyUsers: boolean;
}

/**
 * Skill deletion operation
 */
export interface SkillDeletionOperation {
	skillId: string;
	deletionReason: string;
	deletedBy: string;
	createBackup: boolean;
	cascadeDelete: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for skill validation warning
 */
export function isSkillValidationWarning(obj: unknown): obj is SkillValidationWarning {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'field' in obj &&
		'message' in obj &&
		'severity' in obj &&
		((obj as SkillValidationWarning).severity === 'warning' ||
			(obj as SkillValidationWarning).severity === 'info')
	);
}

/**
 * Type guard for skill validation error
 */
export function isSkillValidationError(obj: unknown): obj is SkillValidationError {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'field' in obj &&
		'message' in obj &&
		'code' in obj
	);
}

/**
 * Type guard for skill execution error
 */
export function isSkillExecutionError(obj: unknown): obj is SkillExecutionError {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'code' in obj &&
		'message' in obj &&
		'recoverable' in obj &&
		typeof (obj as SkillExecutionError).code === 'string' &&
		typeof (obj as SkillExecutionError).message === 'string' &&
		typeof (obj as SkillExecutionError).recoverable === 'boolean'
	);
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Skill with required fields for creation
 */
export type SkillCreateInput = Omit<Skill, 'metadata'> & {
	metadata: Omit<SkillMetadata, 'createdAt' | 'updatedAt'>;
};

/**
 * Skill with optional fields for updates
 */
export type SkillUpdateInput = Partial<Omit<Skill, 'id' | 'metadata'>> & {
	metadata?: Partial<Omit<SkillMetadata, 'createdAt'>>;
};

/**
 * Minimal skill representation for listings
 */
export type SkillMinimal = Pick<
	Skill,
	'id' | 'name' | 'description'
> & {
	category: SkillMetadata['category'];
	tags: SkillMetadata['tags'];
	difficulty: SkillMetadata['difficulty'];
};
