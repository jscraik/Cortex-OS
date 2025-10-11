/**
 * brAInwav Skill Event Contracts for A2A Communication
 * Contract-first definitions for Skills package events
 *
 * @version 1.0.0
 * @module @cortex-os/contracts/skill-events
 */

import { z } from 'zod';

// ============================================================================
// Skill Schema Definitions
// ============================================================================

/**
 * Persuasive Framing Schema
 * Defines elements for psychological influence in skill content
 */
export const skillPersuasiveFramingSchema = z.object({
	authority: z.string().min(1).max(500).optional(),
	commitment: z.string().min(1).max(500).optional(),
	scarcity: z.string().min(1).max(500).optional(),
	socialProof: z.string().min(1).max(500).optional(),
	reciprocity: z.string().min(1).max(500).optional(),
});

/**
 * Skill Metadata Schema
 * Comprehensive metadata for skill organization and retrieval
 */
export const skillMetadataSchema = z.object({
	version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be valid semver (e.g., 1.0.0)'),
	author: z.string().min(1).max(200),
	category: z.enum([
		'coding',
		'communication',
		'security',
		'analysis',
		'automation',
		'integration',
		'testing',
		'documentation',
		'other',
	]),
	tags: z.array(z.string().min(1).max(50)).min(1).max(20),
	difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
	estimatedTokens: z.number().int().positive().max(10000),
	requiredTools: z.array(z.string().min(1).max(100)).max(50).optional(),
	prerequisites: z.array(z.string().min(1).max(200)).max(20).optional(),
	relatedSkills: z.array(z.string().min(1).max(100)).max(20).optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	deprecated: z.boolean().default(false),
	replacedBy: z.string().min(1).max(100).optional(),
});

/**
 * Core Skill Schema
 * Primary schema for skill definition with validation rules
 */
export const skillSchema = z.object({
	id: z.string().regex(/^skill-[\w-]+$/, 'ID must start with "skill-" followed by kebab-case'),
	name: z.string().min(3).max(100),
	description: z.string().min(10).max(500),
	content: z.string().min(50).max(50000),
	metadata: skillMetadataSchema,
	persuasiveFraming: skillPersuasiveFramingSchema.optional(),
	examples: z
		.array(
			z.object({
				title: z.string().min(3).max(100),
				input: z.string().min(1).max(2000),
				output: z.string().min(1).max(2000),
				explanation: z.string().min(10).max(1000).optional(),
			}),
		)
		.max(10)
		.optional(),
	warnings: z.array(z.string().min(5).max(500)).max(10).optional(),
	successCriteria: z.array(z.string().min(5).max(300)).min(1).max(20),
	failureIndicators: z.array(z.string().min(5).max(300)).max(20).optional(),
});

/**
 * Skill Frontmatter Schema
 * Schema for YAML frontmatter in skill markdown files
 */
export const skillFrontmatterSchema = z.object({
	id: z.string().regex(/^skill-[\w-]+$/),
	name: z.string().min(3).max(100),
	description: z.string().min(10).max(500),
	version: z.string().regex(/^\d+\.\d+\.\d+$/),
	author: z.string().min(1).max(200),
	category: z.enum([
		'coding',
		'communication',
		'security',
		'analysis',
		'automation',
		'integration',
		'testing',
		'documentation',
		'other',
	]),
	tags: z.array(z.string()).min(1),
	difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
	estimatedTokens: z.number().int().positive(),
	requiredTools: z.array(z.string()).optional(),
	prerequisites: z.array(z.string()).optional(),
	relatedSkills: z.array(z.string()).optional(),
	deprecated: z.boolean().optional(),
	replacedBy: z.string().optional(),
	persuasiveFraming: skillPersuasiveFramingSchema.optional(),
});

/**
 * Skill Search Query Schema
 * Parameters for RAG-based skill retrieval
 */
export const skillSearchQuerySchema = z.object({
	query: z.string().min(1).max(1000),
	category: z
		.enum([
			'coding',
			'communication',
			'security',
			'analysis',
			'automation',
			'integration',
			'testing',
			'documentation',
			'other',
			'all',
		])
		.default('all'),
	tags: z.array(z.string()).max(10).optional(),
	difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'all']).default('all'),
	topK: z.number().int().positive().max(50).default(5),
	similarityThreshold: z.number().min(0).max(1).default(0.7),
	includeDeprecated: z.boolean().default(false),
});

/**
 * Skill Search Result Schema
 * Individual search result with relevance scoring
 */
export const skillSearchResultSchema = z.object({
	skill: skillSchema,
	relevanceScore: z.number().min(0).max(1),
	matchedFields: z.array(z.string()),
	highlightedContent: z.string().optional(),
});

// ============================================================================
// Skill Event Type Constants
// ============================================================================

export const SkillEventTypes = {
	SkillLoaded: 'skill.loaded',
	SkillValidated: 'skill.validated',
	SkillSearched: 'skill.searched',
	SkillRetrieved: 'skill.retrieved',
	SkillIndexed: 'skill.indexed',
	SkillUpdated: 'skill.updated',
	SkillDeprecated: 'skill.deprecated',
	SkillDeleted: 'skill.deleted',
	SkillValidationFailed: 'skill.validation.failed',
} as const;

// ============================================================================
// Skill Event Data Schemas
// ============================================================================

/**
 * Skill Loaded Event
 * Emitted when a skill is successfully loaded from disk
 */
export const skillLoadedEventSchema = z.object({
	skillId: z.string().min(1),
	name: z.string().min(1),
	category: z.string(),
	filePath: z.string().min(1),
	fileSize: z.number().int().nonnegative(),
	loadTime: z.number().positive(),
	timestamp: z.string().datetime(),
});

/**
 * Skill Validated Event
 * Emitted when a skill passes schema validation
 */
export const skillValidatedEventSchema = z.object({
	skillId: z.string().min(1),
	name: z.string().min(1),
	validationDuration: z.number().positive(),
	warnings: z.array(z.string()).optional(),
	timestamp: z.string().datetime(),
});

/**
 * Skill Searched Event
 * Emitted when a skill search is performed
 */
export const skillSearchedEventSchema = z.object({
	queryId: z.string().min(1),
	query: z.string().min(1),
	category: z.string().optional(),
	tags: z.array(z.string()).optional(),
	resultsCount: z.number().int().nonnegative(),
	searchTime: z.number().positive(),
	topScore: z.number().min(0).max(1).optional(),
	timestamp: z.string().datetime(),
});

/**
 * Skill Retrieved Event
 * Emitted when specific skills are retrieved
 */
export const skillRetrievedEventSchema = z.object({
	skillIds: z.array(z.string()).min(1),
	retrievalMethod: z.enum(['id', 'search', 'category', 'tag']),
	retrievalTime: z.number().positive(),
	cacheHit: z.boolean().default(false),
	timestamp: z.string().datetime(),
});

/**
 * Skill Indexed Event
 * Emitted when a skill is indexed for RAG retrieval
 */
export const skillIndexedEventSchema = z.object({
	skillId: z.string().min(1),
	name: z.string().min(1),
	embeddingDimensions: z.number().int().positive(),
	chunkCount: z.number().int().positive(),
	indexingTime: z.number().positive(),
	vectorStore: z.string().min(1),
	timestamp: z.string().datetime(),
});

/**
 * Skill Updated Event
 * Emitted when a skill is modified
 */
export const skillUpdatedEventSchema = z.object({
	skillId: z.string().min(1),
	name: z.string().min(1),
	changes: z.object({
		content: z.boolean().default(false),
		metadata: z.boolean().default(false),
		persuasiveFraming: z.boolean().default(false),
		examples: z.boolean().default(false),
	}),
	previousVersion: z.string(),
	newVersion: z.string(),
	requiresReindexing: z.boolean().default(false),
	timestamp: z.string().datetime(),
});

/**
 * Skill Deprecated Event
 * Emitted when a skill is marked as deprecated
 */
export const skillDeprecatedEventSchema = z.object({
	skillId: z.string().min(1),
	name: z.string().min(1),
	reason: z.string().min(5).max(500),
	replacedBy: z.string().min(1).optional(),
	deprecationDate: z.string().datetime(),
	timestamp: z.string().datetime(),
});

/**
 * Skill Deleted Event
 * Emitted when a skill is removed
 */
export const skillDeletedEventSchema = z.object({
	skillId: z.string().min(1),
	name: z.string().min(1),
	category: z.string(),
	backupCreated: z.boolean().default(false),
	backupPath: z.string().optional(),
	timestamp: z.string().datetime(),
});

/**
 * Skill Validation Failed Event
 * Emitted when skill validation fails
 */
export const skillValidationFailedEventSchema = z.object({
	skillId: z.string().optional(),
	filePath: z.string().min(1),
	errors: z
		.array(
			z.object({
				field: z.string(),
				message: z.string(),
				code: z.string().optional(),
			}),
		)
		.min(1),
	severity: z.enum(['error', 'warning']),
	timestamp: z.string().datetime(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type SkillPersuasiveFraming = z.infer<typeof skillPersuasiveFramingSchema>;
export type SkillMetadata = z.infer<typeof skillMetadataSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;
export type SkillSearchQuery = z.infer<typeof skillSearchQuerySchema>;
export type SkillSearchResult = z.infer<typeof skillSearchResultSchema>;

export type SkillLoadedEvent = z.infer<typeof skillLoadedEventSchema>;
export type SkillValidatedEvent = z.infer<typeof skillValidatedEventSchema>;
export type SkillSearchedEvent = z.infer<typeof skillSearchedEventSchema>;
export type SkillRetrievedEvent = z.infer<typeof skillRetrievedEventSchema>;
export type SkillIndexedEvent = z.infer<typeof skillIndexedEventSchema>;
export type SkillUpdatedEvent = z.infer<typeof skillUpdatedEventSchema>;
export type SkillDeprecatedEvent = z.infer<typeof skillDeprecatedEventSchema>;
export type SkillDeletedEvent = z.infer<typeof skillDeletedEventSchema>;
export type SkillValidationFailedEvent = z.infer<typeof skillValidationFailedEventSchema>;

// ============================================================================
// Event Schema Registry
// ============================================================================

export const SkillEventSchemas = {
	[SkillEventTypes.SkillLoaded]: skillLoadedEventSchema,
	[SkillEventTypes.SkillValidated]: skillValidatedEventSchema,
	[SkillEventTypes.SkillSearched]: skillSearchedEventSchema,
	[SkillEventTypes.SkillRetrieved]: skillRetrievedEventSchema,
	[SkillEventTypes.SkillIndexed]: skillIndexedEventSchema,
	[SkillEventTypes.SkillUpdated]: skillUpdatedEventSchema,
	[SkillEventTypes.SkillDeprecated]: skillDeprecatedEventSchema,
	[SkillEventTypes.SkillDeleted]: skillDeletedEventSchema,
	[SkillEventTypes.SkillValidationFailed]: skillValidationFailedEventSchema,
} as const;
