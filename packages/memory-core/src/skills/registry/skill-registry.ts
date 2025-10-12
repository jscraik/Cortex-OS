/**
 * brAInwav Skill Registry
 * In-memory storage, indexing, and search for skills
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/registry/skill-registry
 */

import type { Skill, SkillCategory, SkillDifficulty } from '../types.js';
import { validateSkill } from '../validators/skill-validator.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Skill registration result
 */
export interface RegisterResult {
	/** Whether registration succeeded */
	success: boolean;
	/** Registered skill ID */
	skillId?: string;
	/** Error message if failed */
	error?: string;
}

/**
 * Batch registration result
 */
export interface BatchRegisterResult {
	/** Number of successfully registered skills */
	successful: number;
	/** Number of failed registrations */
	failed: number;
	/** Individual results */
	results: RegisterResult[];
}

/**
 * Registry statistics
 */
export interface RegistryStats {
	/** Total number of skills */
	totalSkills: number;
	/** Skills by category */
	byCategory: Record<string, number>;
	/** Skills by difficulty */
	byDifficulty: Record<string, number>;
	/** Number of deprecated skills */
	deprecated: number;
}

/**
 * Search query parameters
 */
export interface SearchQuery {
	/** Keywords to search for */
	keywords?: string;
	/** Filter by tags */
	tags?: string[];
	/** Filter by categories */
	categories?: SkillCategory[];
	/** Filter by difficulties */
	difficulties?: SkillDifficulty[];
	/** Maximum results to return */
	limit?: number;
	/** Results offset for pagination */
	offset?: number;
}

/**
 * Search result with relevance score
 */
export interface SearchResult {
	/** Matching skill */
	skill: Skill;
	/** Relevance score */
	score: number;
	/** Match details */
	matches: Array<{
		field: string;
		positions: number[];
	}>;
}

// ============================================================================
// Registry Implementation
// ============================================================================

/**
 * In-memory skill registry with indexing and search
 *
 * Provides efficient storage, retrieval, and search capabilities for skills.
 * Maintains multiple indexes for fast lookup by various criteria.
 *
 * @example
 * ```typescript
 * const registry = new SkillRegistry();
 * await registry.register(skill);
 * const results = await registry.search({ keywords: 'testing' });
 * ```
 */
export class SkillRegistry {
	/** Primary storage: skill ID → Skill */
	private skills = new Map<string, Skill>();

	/** Category index: category → Set<skillId> */
	private categoryIndex = new Map<string, Set<string>>();

	/** Tag index: tag → Set<skillId> */
	private tagIndex = new Map<string, Set<string>>();

	/** Difficulty index: difficulty → Set<skillId> */
	private difficultyIndex = new Map<string, Set<string>>();

	/** Author index: author → Set<skillId> */
	private authorIndex = new Map<string, Set<string>>();

	// ========================================================================
	// Storage Operations (TASK-021)
	// ========================================================================

	/**
	 * Register a skill in the registry
	 *
	 * @param skill - Skill to register
	 * @returns Registration result
	 */
	async register(skill: Skill): Promise<RegisterResult> {
		// Check for duplicates
		if (this.skills.has(skill.id)) {
			return {
				success: false,
				error: `brAInwav Skill Registry: Skill with ID "${skill.id}" already exists`,
			};
		}

		// Validate skill
		const validationResult = validateSkill(skill);
		if (!validationResult.valid) {
			const errors = validationResult.errors
				.map((e) => `${e.path.join('.')}: ${e.message}`)
				.join('; ');
			return {
				success: false,
				error: `brAInwav Skill Registry: Validation failed - ${errors}`,
			};
		}

		// Store skill
		this.skills.set(skill.id, skill);

		// Update indexes
		this.indexSkill(skill);

		return {
			success: true,
			skillId: skill.id,
		};
	}

	/**
	 * Register multiple skills in batch
	 */
	async registerBatch(skills: Skill[]): Promise<BatchRegisterResult> {
		const results: RegisterResult[] = [];
		let successful = 0;
		let failed = 0;

		for (const skill of skills) {
			const result = await this.register(skill);
			results.push(result);

			if (result.success) {
				successful++;
			} else {
				failed++;
			}
		}

		return { successful, failed, results };
	}

	/**
	 * Get skill by ID
	 */
	async get(id: string): Promise<Skill | null> {
		return this.skills.get(id) ?? null;
	}

	/**
	 * Check if skill exists
	 */
	has(id: string): boolean {
		return this.skills.has(id);
	}

	/**
	 * Get all skills
	 */
	async getAll(): Promise<Skill[]> {
		return Array.from(this.skills.values());
	}

	/**
	 * Remove skill from registry
	 */
	async remove(id: string): Promise<boolean> {
		const skill = this.skills.get(id);
		if (!skill) {
			return false;
		}

		// Remove from storage
		this.skills.delete(id);

		// Remove from indexes
		this.removeFromIndexes(skill);

		return true;
	}

	/**
	 * Clear all skills
	 */
	clear(): void {
		this.skills.clear();
		this.categoryIndex.clear();
		this.tagIndex.clear();
		this.difficultyIndex.clear();
		this.authorIndex.clear();
	}

	/**
	 * Get registry size
	 */
	size(): number {
		return this.skills.size;
	}

	/**
	 * Get registry statistics
	 */
	getStats(): RegistryStats {
		const byCategory: Record<string, number> = {};
		const byDifficulty: Record<string, number> = {};
		let deprecated = 0;

		for (const skill of this.skills.values()) {
			// Count by category
			byCategory[skill.metadata.category] =
				(byCategory[skill.metadata.category] ?? 0) + 1;

			// Count by difficulty
			byDifficulty[skill.metadata.difficulty] =
				(byDifficulty[skill.metadata.difficulty] ?? 0) + 1;

			// Count deprecated
			if (skill.metadata.deprecated) {
				deprecated++;
			}
		}

		return {
			totalSkills: this.skills.size,
			byCategory,
			byDifficulty,
			deprecated,
		};
	}

	// ========================================================================
	// Indexing Operations (TASK-022)
	// ========================================================================

	/**
	 * Index a skill in all indexes
	 */
	private indexSkill(skill: Skill): void {
		const skillId = skill.id;

		// Category index
		const categorySet =
			this.categoryIndex.get(skill.metadata.category) ?? new Set();
		categorySet.add(skillId);
		this.categoryIndex.set(skill.metadata.category, categorySet);

		// Tag index (case-insensitive)
		for (const tag of skill.metadata.tags) {
			const tagLower = tag.toLowerCase();
			const tagSet = this.tagIndex.get(tagLower) ?? new Set();
			tagSet.add(skillId);
			this.tagIndex.set(tagLower, tagSet);
		}

		// Difficulty index
		const diffSet =
			this.difficultyIndex.get(skill.metadata.difficulty) ?? new Set();
		diffSet.add(skillId);
		this.difficultyIndex.set(skill.metadata.difficulty, diffSet);

		// Author index
		const authorSet =
			this.authorIndex.get(skill.metadata.author) ?? new Set();
		authorSet.add(skillId);
		this.authorIndex.set(skill.metadata.author, authorSet);
	}

	/**
	 * Remove skill from all indexes
	 */
	private removeFromIndexes(skill: Skill): void {
		const skillId = skill.id;

		// Remove from category index
		this.categoryIndex.get(skill.metadata.category)?.delete(skillId);

		// Remove from tag index
		for (const tag of skill.metadata.tags) {
			this.tagIndex.get(tag.toLowerCase())?.delete(skillId);
		}

		// Remove from difficulty index
		this.difficultyIndex.get(skill.metadata.difficulty)?.delete(skillId);

		// Remove from author index
		this.authorIndex.get(skill.metadata.author)?.delete(skillId);
	}

	/**
	 * Find skills by category
	 */
	async findByCategory(category: string): Promise<Skill[]> {
		const skillIds = this.categoryIndex.get(category) ?? new Set();
		const skills: Skill[] = [];

		for (const id of skillIds) {
			const skill = this.skills.get(id);
			if (skill) {
				skills.push(skill);
			}
		}

		return skills;
	}

	/**
	 * Find skills by tag (case-insensitive)
	 */
	async findByTag(tag: string): Promise<Skill[]> {
		const skillIds = this.tagIndex.get(tag.toLowerCase()) ?? new Set();
		const skills: Skill[] = [];

		for (const id of skillIds) {
			const skill = this.skills.get(id);
			if (skill) {
				skills.push(skill);
			}
		}

		return skills;
	}

	/**
	 * Find skills by difficulty
	 */
	async findByDifficulty(difficulty: string): Promise<Skill[]> {
		const skillIds = this.difficultyIndex.get(difficulty) ?? new Set();
		const skills: Skill[] = [];

		for (const id of skillIds) {
			const skill = this.skills.get(id);
			if (skill) {
				skills.push(skill);
			}
		}

		return skills;
	}

	// ========================================================================
	// Search Operations (TASK-023)
	// ========================================================================

	/**
	 * Search for skills with ranking
	 */
	async search(query: SearchQuery): Promise<SearchResult[]> {
		let candidates = Array.from(this.skills.values());

		// Apply category filter
		if (query.categories && query.categories.length > 0) {
			candidates = candidates.filter((skill) =>
				query.categories!.includes(skill.metadata.category),
			);
		}

		// Apply difficulty filter
		if (query.difficulties && query.difficulties.length > 0) {
			candidates = candidates.filter((skill) =>
				query.difficulties!.includes(skill.metadata.difficulty),
			);
		}

		// Apply tag filter (OR logic)
                if (query.tags && query.tags.length > 0) {
                        const tagsLower = query.tags.map((t) => t.toLowerCase());
                        candidates = candidates.filter((skill) =>
                                skill.metadata.tags.some((tag: string) =>
                                        tagsLower.includes(tag.toLowerCase()),
                                ),
                        );
                }

		// Score and rank by keywords
		const results: SearchResult[] = [];

		for (const skill of candidates) {
			const scoreResult = this.scoreSkill(skill, query.keywords);

			if (query.keywords === undefined || scoreResult.score > 0) {
				results.push({
					skill,
					score: scoreResult.score,
					matches: scoreResult.matches,
				});
			}
		}

		// Sort by score descending
		results.sort((a, b) => b.score - a.score);

		// Apply pagination
		const offset = query.offset ?? 0;
		const limit = query.limit ?? results.length;

		return results.slice(offset, offset + limit);
	}

	/**
	 * Score a skill against keywords
	 */
	private scoreSkill(
		skill: Skill,
		keywords?: string,
	): { score: number; matches: Array<{ field: string; positions: number[] }> } {
		if (!keywords) {
			return { score: 100, matches: [] };
		}

		const keywordsLower = keywords.toLowerCase();
		let score = 0;
		const matches: Array<{ field: string; positions: number[] }> = [];

		// Name match: 100 points
		if (skill.name.toLowerCase().includes(keywordsLower)) {
			score += 100;
			matches.push({ field: 'name', positions: [0] });
		}

		// Description match: 50 points
		if (skill.description.toLowerCase().includes(keywordsLower)) {
			score += 50;
			matches.push({ field: 'description', positions: [0] });
		}

		// Tag exact match: 75 points each
		for (const tag of skill.metadata.tags) {
			if (tag.toLowerCase() === keywordsLower) {
				score += 75;
				matches.push({ field: 'tags', positions: [0] });
			} else if (tag.toLowerCase().includes(keywordsLower)) {
				score += 25;
			}
		}

		// Content match: 10 points per occurrence
		const contentLower = skill.content.toLowerCase();
		const occurrences = (contentLower.match(new RegExp(keywordsLower, 'g')) || [])
			.length;
		score += occurrences * 10;

		if (occurrences > 0) {
			matches.push({ field: 'content', positions: [0] });
		}

		return { score, matches };
	}

	// ========================================================================
	// Lifecycle Management (TASK-024)
	// ========================================================================

	/**
	 * Update existing skill
	 */
	async update(id: string, skill: Skill): Promise<RegisterResult> {
		if (!this.skills.has(id)) {
			return {
				success: false,
				error: `brAInwav Skill Registry: Skill with ID "${id}" not found`,
			};
		}

		// Validate updated skill
		const validationResult = validateSkill(skill);
		if (!validationResult.valid) {
			const errors = validationResult.errors
				.map((e) => `${e.path.join('.')}: ${e.message}`)
				.join('; ');
			return {
				success: false,
				error: `brAInwav Skill Registry: Validation failed - ${errors}`,
			};
		}

		// Remove old indexes
		const oldSkill = this.skills.get(id)!;
		this.removeFromIndexes(oldSkill);

		// Update skill
		this.skills.set(id, skill);

		// Re-index
		this.indexSkill(skill);

		return {
			success: true,
			skillId: id,
		};
	}

	/**
	 * Mark skill as deprecated
	 */
	async deprecate(id: string, replacedBy?: string): Promise<boolean> {
		const skill = this.skills.get(id);
		if (!skill) {
			return false;
		}

		// Update metadata
		const updated: Skill = {
			...skill,
			metadata: {
				...skill.metadata,
				deprecated: true,
				replacedBy,
				updatedAt: new Date().toISOString(),
			},
		};

		await this.update(id, updated);
		return true;
	}
}
