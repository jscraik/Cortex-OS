/**
 * brAInwav Skill Registry Tests
 * Comprehensive test coverage for skill storage, indexing, and search
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/__tests__/skill-registry.test
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type { Skill } from '../types.js';
import {
	SkillRegistry,
	type RegisterResult,
	type RegistryStats,
	type SearchQuery,
	type SearchResult,
} from '../registry/skill-registry.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestSkill(
	id: string,
	name: string,
	category: 'testing' | 'coding' = 'testing',
	tags: string[] = ['test'],
): Skill {
	return {
		id,
		name,
		description: `Test skill: ${name}`,
		content: `# ${name}\n\nThis is test content for ${name}.\n\n## Details\nTest skill for registry validation.`,
		metadata: {
			version: '1.0.0',
			author: 'brAInwav Test Team',
			category,
			tags,
			difficulty: 'beginner',
			estimatedTokens: 200,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deprecated: false,
		},
		successCriteria: ['Registers successfully', 'Retrieves correctly'],
	};
}

// ============================================================================
// Storage Interface Tests (TASK-021)
// ============================================================================

describe('SkillRegistry - Storage Interface', () => {
	let registry: SkillRegistry;

	beforeEach(() => {
		registry = new SkillRegistry();
	});

	describe('register', () => {
		it('should register valid skill successfully', async () => {
			const skill = createTestSkill('skill-test-1', 'Test Skill 1');
			const result = await registry.register(skill);

			expect(result.success).toBe(true);
			expect(result.skillId).toBe('skill-test-1');
			expect(registry.size()).toBe(1);
		});

		it('should reject duplicate skill IDs', async () => {
			const skill1 = createTestSkill('skill-duplicate', 'Skill 1');
			const skill2 = createTestSkill('skill-duplicate', 'Skill 2');

			await registry.register(skill1);
			const result = await registry.register(skill2);

			expect(result.success).toBe(false);
			expect(result.error).toContain('already exists');
			expect(registry.size()).toBe(1);
		});

		it('should validate skill before registration', async () => {
			const invalidSkill = {
				...createTestSkill('skill-invalid', 'Invalid'),
				id: 'bad-id', // Invalid format
			};

			const result = await registry.register(invalidSkill as Skill);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should register multiple skills', async () => {
			const skills = [
				createTestSkill('skill-1', 'Skill 1'),
				createTestSkill('skill-2', 'Skill 2'),
				createTestSkill('skill-3', 'Skill 3'),
			];

			for (const skill of skills) {
				await registry.register(skill);
			}

			expect(registry.size()).toBe(3);
		});
	});

	describe('get', () => {
		it('should retrieve registered skill by ID', async () => {
			const skill = createTestSkill('skill-retrieve', 'Retrieve Test');
			await registry.register(skill);

			const retrieved = await registry.get('skill-retrieve');

			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe('skill-retrieve');
			expect(retrieved?.name).toBe('Retrieve Test');
		});

		it('should return null for non-existent skill', async () => {
			const retrieved = await registry.get('skill-nonexistent');

			expect(retrieved).toBeNull();
		});

		it('should retrieve skill in less than 5ms', async () => {
			const skill = createTestSkill('skill-perf', 'Performance Test');
			await registry.register(skill);

			const start = performance.now();
			await registry.get('skill-perf');
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(5);
		});
	});

	describe('has', () => {
		it('should return true for existing skill', async () => {
			const skill = createTestSkill('skill-exists', 'Exists Test');
			await registry.register(skill);

			expect(registry.has('skill-exists')).toBe(true);
		});

		it('should return false for non-existent skill', () => {
			expect(registry.has('skill-missing')).toBe(false);
		});
	});

	describe('getAll', () => {
		it('should return empty array for empty registry', async () => {
			const all = await registry.getAll();

			expect(all).toEqual([]);
		});

		it('should return all registered skills', async () => {
			await registry.register(createTestSkill('skill-1', 'Skill 1'));
			await registry.register(createTestSkill('skill-2', 'Skill 2'));
			await registry.register(createTestSkill('skill-3', 'Skill 3'));

			const all = await registry.getAll();

			expect(all).toHaveLength(3);
			expect(all.map((s) => s.id)).toContain('skill-1');
			expect(all.map((s) => s.id)).toContain('skill-2');
			expect(all.map((s) => s.id)).toContain('skill-3');
		});
	});

	describe('remove', () => {
		it('should remove existing skill', async () => {
			const skill = createTestSkill('skill-remove', 'Remove Test');
			await registry.register(skill);

			const removed = await registry.remove('skill-remove');

			expect(removed).toBe(true);
			expect(registry.has('skill-remove')).toBe(false);
			expect(registry.size()).toBe(0);
		});

		it('should return false for non-existent skill', async () => {
			const removed = await registry.remove('skill-missing');

			expect(removed).toBe(false);
		});
	});

	describe('clear', () => {
		it('should remove all skills', async () => {
			await registry.register(createTestSkill('skill-1', 'Skill 1'));
			await registry.register(createTestSkill('skill-2', 'Skill 2'));

			registry.clear();

			expect(registry.size()).toBe(0);
			expect(await registry.getAll()).toEqual([]);
		});
	});

	describe('statistics', () => {
		it('should track registry size', async () => {
			expect(registry.size()).toBe(0);

			await registry.register(createTestSkill('skill-1', 'Skill 1'));
			expect(registry.size()).toBe(1);

			await registry.register(createTestSkill('skill-2', 'Skill 2'));
			expect(registry.size()).toBe(2);

			await registry.remove('skill-1');
			expect(registry.size()).toBe(1);
		});

		it('should provide registry statistics', () => {
			const stats = registry.getStats();

			expect(stats).toHaveProperty('totalSkills');
			expect(stats).toHaveProperty('byCategory');
			expect(stats).toHaveProperty('byDifficulty');
		});
	});
});

// ============================================================================
// Indexing Tests (TASK-022)
// ============================================================================

describe('SkillRegistry - Indexing', () => {
	let registry: SkillRegistry;

	beforeEach(() => {
		registry = new SkillRegistry();
	});

	describe('category index', () => {
		it('should find skills by category', async () => {
			await registry.register(createTestSkill('skill-1', 'Test 1', 'testing'));
			await registry.register(createTestSkill('skill-2', 'Code 1', 'coding'));
			await registry.register(createTestSkill('skill-3', 'Test 2', 'testing'));

			const testingSkills = await registry.findByCategory('testing');

			expect(testingSkills).toHaveLength(2);
			expect(testingSkills.map((s) => s.id)).toContain('skill-1');
			expect(testingSkills.map((s) => s.id)).toContain('skill-3');
		});

		it('should return empty array for category with no skills', async () => {
			const skills = await registry.findByCategory('security');

			expect(skills).toEqual([]);
		});
	});

	describe('tag index', () => {
		it('should find skills by tag', async () => {
			await registry.register(
				createTestSkill('skill-1', 'TDD', 'testing', ['tdd', 'testing']),
			);
			await registry.register(
				createTestSkill('skill-2', 'BDD', 'testing', ['bdd', 'testing']),
			);
			await registry.register(
				createTestSkill('skill-3', 'TDD Guide', 'testing', ['tdd', 'guide']),
			);

			const tddSkills = await registry.findByTag('tdd');

			expect(tddSkills).toHaveLength(2);
			expect(tddSkills.map((s) => s.id)).toContain('skill-1');
			expect(tddSkills.map((s) => s.id)).toContain('skill-3');
		});

		it('should handle tags case-insensitively', async () => {
			await registry.register(
				createTestSkill('skill-1', 'Test', 'testing', ['TDD', 'Testing']),
			);

			const skills = await registry.findByTag('tdd');

			expect(skills).toHaveLength(1);
		});
	});

	describe('difficulty index', () => {
		it('should find skills by difficulty', async () => {
			const beginner = {
				...createTestSkill('skill-1', 'Easy'),
				metadata: {
					...createTestSkill('skill-1', 'Easy').metadata,
					difficulty: 'beginner' as const,
				},
			};
			const advanced = {
				...createTestSkill('skill-2', 'Hard'),
				metadata: {
					...createTestSkill('skill-2', 'Hard').metadata,
					difficulty: 'advanced' as const,
				},
			};

			await registry.register(beginner);
			await registry.register(advanced);

			const beginnerSkills = await registry.findByDifficulty('beginner');

			expect(beginnerSkills).toHaveLength(1);
			expect(beginnerSkills[0]?.id).toBe('skill-1');
		});
	});

	describe('index updates', () => {
		it('should update indexes when skill is removed', async () => {
			await registry.register(
				createTestSkill('skill-1', 'Test', 'testing', ['test']),
			);
			await registry.register(
				createTestSkill('skill-2', 'Test 2', 'testing', ['test']),
			);

			await registry.remove('skill-1');

			const testingSkills = await registry.findByCategory('testing');
			expect(testingSkills).toHaveLength(1);

			const testTagSkills = await registry.findByTag('test');
			expect(testTagSkills).toHaveLength(1);
		});
	});
});

// ============================================================================
// Search Tests (TASK-023)
// ============================================================================

describe('SkillRegistry - Search', () => {
	let registry: SkillRegistry;

	beforeEach(async () => {
		registry = new SkillRegistry();

		// Populate with test data
		await registry.register(
			createTestSkill(
				'skill-tdd',
				'Test-Driven Development',
				'testing',
				['tdd', 'testing', 'quality'],
			),
		);
		await registry.register(
			createTestSkill(
				'skill-bdd',
				'Behavior-Driven Development',
				'testing',
				['bdd', 'testing', 'quality'],
			),
		);
		await registry.register(
			createTestSkill(
				'skill-refactor',
				'Code Refactoring',
				'coding',
				['refactoring', 'quality', 'clean-code'],
			),
		);
	});

	describe('keyword search', () => {
		it('should find skills by keyword in name', async () => {
			const results = await registry.search({ keywords: 'development' });

			expect(results.length).toBeGreaterThan(0);
			expect(results.some((r) => r.skill.id === 'skill-tdd')).toBe(true);
			expect(results.some((r) => r.skill.id === 'skill-bdd')).toBe(true);
		});

		it('should find skills by keyword in description', async () => {
			const results = await registry.search({ keywords: 'test' });

			expect(results.length).toBeGreaterThan(0);
		});

		it('should be case-insensitive', async () => {
			const results = await registry.search({ keywords: 'DEVELOPMENT' });

			expect(results.length).toBeGreaterThan(0);
		});

		it('should return empty array for no matches', async () => {
			const results = await registry.search({ keywords: 'nonexistent' });

			expect(results).toEqual([]);
		});
	});

	describe('tag filtering', () => {
		it('should filter by single tag', async () => {
			const results = await registry.search({ tags: ['tdd'] });

			expect(results).toHaveLength(1);
			expect(results[0]?.skill.id).toBe('skill-tdd');
		});

		it('should filter by multiple tags (OR logic)', async () => {
			const results = await registry.search({ tags: ['tdd', 'bdd'] });

			expect(results.length).toBeGreaterThanOrEqual(2);
		});

		it('should combine tag with keyword search', async () => {
			const results = await registry.search({
				keywords: 'development',
				tags: ['testing'],
			});

			expect(results.length).toBeGreaterThan(0);
			expect(results.every((r) => r.skill.metadata.tags.includes('testing'))).toBe(
				true,
			);
		});
	});

	describe('category filtering', () => {
		it('should filter by category', async () => {
			const results = await registry.search({ categories: ['testing'] });

			expect(results.length).toBe(2);
			expect(results.every((r) => r.skill.metadata.category === 'testing')).toBe(
				true,
			);
		});

		it('should filter by multiple categories', async () => {
			const results = await registry.search({
				categories: ['testing', 'coding'],
			});

			expect(results.length).toBe(3);
		});
	});

	describe('relevance ranking', () => {
		it('should rank name matches higher than description matches', async () => {
			const results = await registry.search({ keywords: 'development' });

			// Skills with "Development" in name should rank higher
			expect(results[0]?.skill.name).toContain('Development');
		});

		it('should assign scores to search results', async () => {
			const results = await registry.search({ keywords: 'test' });

			expect(results.length).toBeGreaterThan(0);
			for (const result of results) {
				expect(result.score).toBeGreaterThan(0);
			}
		});

		it('should sort results by score descending', async () => {
			const results = await registry.search({ keywords: 'development' });

			for (let i = 1; i < results.length; i++) {
				expect(results[i - 1]!.score).toBeGreaterThanOrEqual(
					results[i]!.score,
				);
			}
		});
	});

	describe('pagination', () => {
		it('should support limit parameter', async () => {
			const results = await registry.search({ limit: 2 });

			expect(results.length).toBeLessThanOrEqual(2);
		});

		it('should support offset parameter', async () => {
			const all = await registry.search({});
			const page1 = await registry.search({ limit: 1, offset: 0 });
			const page2 = await registry.search({ limit: 1, offset: 1 });

			expect(page1[0]?.skill.id).not.toBe(page2[0]?.skill.id);
		});
	});

	describe('performance', () => {
		it('should search 100 skills in less than 100ms', async () => {
			// Add more skills
			for (let i = 0; i < 97; i++) {
				await registry.register(
					createTestSkill(`skill-${i}`, `Skill ${i}`, 'coding', ['test']),
				);
			}

			const start = performance.now();
			await registry.search({ keywords: 'skill' });
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(100);
		});
	});
});

// ============================================================================
// Lifecycle Management Tests (TASK-024)
// ============================================================================

describe('SkillRegistry - Lifecycle Management', () => {
	let registry: SkillRegistry;

	beforeEach(() => {
		registry = new SkillRegistry();
	});

	describe('update', () => {
		it('should update existing skill', async () => {
			const skill = createTestSkill('skill-update', 'Original Name');
			await registry.register(skill);

			const updated = {
				...skill,
				name: 'Updated Name',
				metadata: {
					...skill.metadata,
					updatedAt: new Date().toISOString(),
				},
			};

			const result = await registry.update('skill-update', updated);

			expect(result.success).toBe(true);

			const retrieved = await registry.get('skill-update');
			expect(retrieved?.name).toBe('Updated Name');
		});

		it('should fail to update non-existent skill', async () => {
			const skill = createTestSkill('skill-missing', 'Missing');

			const result = await registry.update('skill-missing', skill);

			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});
	});

	describe('deprecation', () => {
		it('should mark skill as deprecated', async () => {
			const skill = createTestSkill('skill-old', 'Old Skill');
			await registry.register(skill);

			await registry.deprecate('skill-old', 'skill-new');

			const retrieved = await registry.get('skill-old');
			expect(retrieved?.metadata.deprecated).toBe(true);
			expect(retrieved?.metadata.replacedBy).toBe('skill-new');
		});
	});

	describe('batch operations', () => {
		it('should register multiple skills in batch', async () => {
			const skills = [
				createTestSkill('skill-1', 'Skill 1'),
				createTestSkill('skill-2', 'Skill 2'),
				createTestSkill('skill-3', 'Skill 3'),
			];

			const results = await registry.registerBatch(skills);

			expect(results.successful).toBe(3);
			expect(results.failed).toBe(0);
			expect(registry.size()).toBe(3);
		});

		it('should handle partial batch failures', async () => {
			const skills = [
				createTestSkill('skill-1', 'Skill 1'),
				{ ...createTestSkill('skill-2', 'Skill 2'), id: 'bad-id' } as Skill,
				createTestSkill('skill-3', 'Skill 3'),
			];

			const results = await registry.registerBatch(skills);

			expect(results.successful).toBe(2);
			expect(results.failed).toBe(1);
		});
	});
});
