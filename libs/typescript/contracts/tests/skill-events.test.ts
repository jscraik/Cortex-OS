/**
 * brAInwav Skill Schema Tests
 * Comprehensive test coverage for skill validation contracts
 *
 * @version 1.0.0
 * @module @cortex-os/contracts/tests/skill-events
 */

import { describe, expect, it } from 'vitest';
import {
	type Skill,
	SkillEventSchemas,
	SkillEventTypes,
	type SkillMetadata,
	skillDeletedEventSchema,
	skillDeprecatedEventSchema,
	skillFrontmatterSchema,
	skillIndexedEventSchema,
	skillLoadedEventSchema,
	skillMetadataSchema,
	skillPersuasiveFramingSchema,
	skillRetrievedEventSchema,
	skillSchema,
	skillSearchedEventSchema,
	skillSearchQuerySchema,
	skillUpdatedEventSchema,
	skillValidatedEventSchema,
	skillValidationFailedEventSchema,
} from '../src/skill-events.js';

describe('brAInwav Skill Schema Validation', () => {
	describe('skillPersuasiveFramingSchema', () => {
		it('should validate complete persuasive framing', () => {
			const validFraming = {
				authority: 'Created by brAInwav security experts',
				commitment: 'Following this skill improves code quality by 80%',
				scarcity: 'Limited to advanced security implementations',
				socialProof: 'Used by 500+ developers in production',
				reciprocity: 'We provide this skill to help you succeed',
			};

			const result = skillPersuasiveFramingSchema.safeParse(validFraming);
			expect(result.success).toBe(true);
		});

		it('should allow optional fields', () => {
			const minimalFraming = {
				authority: 'brAInwav certified approach',
			};

			const result = skillPersuasiveFramingSchema.safeParse(minimalFraming);
			expect(result.success).toBe(true);
		});

		it('should reject empty strings', () => {
			const invalidFraming = {
				authority: '',
			};

			const result = skillPersuasiveFramingSchema.safeParse(invalidFraming);
			expect(result.success).toBe(false);
		});

		it('should reject strings over 500 characters', () => {
			const invalidFraming = {
				authority: 'a'.repeat(501),
			};

			const result = skillPersuasiveFramingSchema.safeParse(invalidFraming);
			expect(result.success).toBe(false);
		});
	});

	describe('skillMetadataSchema', () => {
		const validMetadata: SkillMetadata = {
			version: '1.0.0',
			author: 'brAInwav Development Team',
			category: 'coding',
			tags: ['typescript', 'testing', 'tdd'],
			difficulty: 'intermediate',
			estimatedTokens: 500,
			requiredTools: ['vitest', 'typescript'],
			prerequisites: ['Basic TypeScript knowledge'],
			relatedSkills: ['skill-tdd-basics', 'skill-typescript-patterns'],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deprecated: false,
		};

		it('should validate complete metadata', () => {
			const result = skillMetadataSchema.safeParse(validMetadata);
			expect(result.success).toBe(true);
		});

		it('should enforce semver format', () => {
			const invalidVersion = { ...validMetadata, version: '1.0' };
			const result = skillMetadataSchema.safeParse(invalidVersion);
			expect(result.success).toBe(false);
		});

		it('should validate all category values', () => {
			const categories = [
				'coding',
				'communication',
				'security',
				'analysis',
				'automation',
				'integration',
				'testing',
				'documentation',
				'other',
			];

			for (const category of categories) {
				const metadata = { ...validMetadata, category };
				const result = skillMetadataSchema.safeParse(metadata);
				expect(result.success).toBe(true);
			}
		});

		it('should reject invalid category', () => {
			const invalidCategory = { ...validMetadata, category: 'invalid' };
			const result = skillMetadataSchema.safeParse(invalidCategory);
			expect(result.success).toBe(false);
		});

		it('should enforce minimum tags', () => {
			const noTags = { ...validMetadata, tags: [] };
			const result = skillMetadataSchema.safeParse(noTags);
			expect(result.success).toBe(false);
		});

		it('should enforce maximum tags (20)', () => {
			const tooManyTags = { ...validMetadata, tags: Array(21).fill('tag') };
			const result = skillMetadataSchema.safeParse(tooManyTags);
			expect(result.success).toBe(false);
		});

		it('should validate all difficulty levels', () => {
			const levels = ['beginner', 'intermediate', 'advanced', 'expert'];

			for (const difficulty of levels) {
				const metadata = { ...validMetadata, difficulty };
				const result = skillMetadataSchema.safeParse(metadata);
				expect(result.success).toBe(true);
			}
		});

		it('should enforce maximum token limit (10000)', () => {
			const tooManyTokens = { ...validMetadata, estimatedTokens: 10001 };
			const result = skillMetadataSchema.safeParse(tooManyTokens);
			expect(result.success).toBe(false);
		});

		it('should reject negative token counts', () => {
			const negativeTokens = { ...validMetadata, estimatedTokens: -1 };
			const result = skillMetadataSchema.safeParse(negativeTokens);
			expect(result.success).toBe(false);
		});

		it('should handle deprecated skills with replacedBy', () => {
			const deprecated = {
				...validMetadata,
				deprecated: true,
				replacedBy: 'skill-updated-version',
			};
			const result = skillMetadataSchema.safeParse(deprecated);
			expect(result.success).toBe(true);
		});
	});

	describe('skillSchema', () => {
		const validSkill: Skill = {
			id: 'skill-test-example',
			name: 'Test Example Skill',
			description: 'A comprehensive example skill for testing purposes',
			content: 'This is the detailed content of the skill. '.repeat(10),
			metadata: {
				version: '1.0.0',
				author: 'brAInwav Development Team',
				category: 'testing',
				tags: ['testing', 'example'],
				difficulty: 'beginner',
				estimatedTokens: 200,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				deprecated: false,
			},
			successCriteria: [
				'All tests pass',
				'Code coverage exceeds 90%',
				'No security vulnerabilities',
			],
		};

		it('should validate complete skill', () => {
			const result = skillSchema.safeParse(validSkill);
			expect(result.success).toBe(true);
		});

		it('should enforce skill ID format (skill-kebab-case)', () => {
			const invalidId = { ...validSkill, id: 'invalid_id' };
			const result = skillSchema.safeParse(invalidId);
			expect(result.success).toBe(false);
		});

		it('should enforce skill ID prefix', () => {
			const missingPrefix = { ...validSkill, id: 'test-example' };
			const result = skillSchema.safeParse(missingPrefix);
			expect(result.success).toBe(false);
		});

		it('should enforce minimum content length (50 chars)', () => {
			const tooShort = { ...validSkill, content: 'Too short' };
			const result = skillSchema.safeParse(tooShort);
			expect(result.success).toBe(false);
		});

		it('should enforce maximum content length (50000 chars)', () => {
			const tooLong = { ...validSkill, content: 'a'.repeat(50001) };
			const result = skillSchema.safeParse(tooLong);
			expect(result.success).toBe(false);
		});

		it('should validate with optional persuasive framing', () => {
			const withFraming = {
				...validSkill,
				persuasiveFraming: {
					authority: 'brAInwav certified',
				},
			};
			const result = skillSchema.safeParse(withFraming);
			expect(result.success).toBe(true);
		});

		it('should validate with examples', () => {
			const withExamples = {
				...validSkill,
				examples: [
					{
						title: 'Basic Usage',
						input: 'test input',
						output: 'test output',
						explanation: 'This demonstrates basic usage',
					},
				],
			};
			const result = skillSchema.safeParse(withExamples);
			expect(result.success).toBe(true);
		});

		it('should enforce maximum examples (10)', () => {
			const tooManyExamples = {
				...validSkill,
				examples: Array(11).fill({
					title: 'Example',
					input: 'input',
					output: 'output',
				}),
			};
			const result = skillSchema.safeParse(tooManyExamples);
			expect(result.success).toBe(false);
		});

		it('should require at least one success criterion', () => {
			const noSuccessCriteria = { ...validSkill, successCriteria: [] };
			const result = skillSchema.safeParse(noSuccessCriteria);
			expect(result.success).toBe(false);
		});

		it('should validate with warnings', () => {
			const withWarnings = {
				...validSkill,
				warnings: ['May require elevated permissions', 'Test data will be modified'],
			};
			const result = skillSchema.safeParse(withWarnings);
			expect(result.success).toBe(true);
		});
	});

	describe('skillFrontmatterSchema', () => {
		const validFrontmatter = {
			id: 'skill-frontmatter-test',
			name: 'Frontmatter Test',
			description: 'Test frontmatter parsing',
			version: '1.0.0',
			author: 'brAInwav Team',
			category: 'testing' as const,
			tags: ['test', 'frontmatter'],
			difficulty: 'beginner' as const,
			estimatedTokens: 100,
		};

		it('should validate complete frontmatter', () => {
			const result = skillFrontmatterSchema.safeParse(validFrontmatter);
			expect(result.success).toBe(true);
		});

		it('should require minimum tags', () => {
			const noTags = { ...validFrontmatter, tags: [] };
			const result = skillFrontmatterSchema.safeParse(noTags);
			expect(result.success).toBe(false);
		});

		it('should validate with optional persuasive framing', () => {
			const withFraming = {
				...validFrontmatter,
				persuasiveFraming: {
					authority: 'brAInwav certified',
				},
			};
			const result = skillFrontmatterSchema.safeParse(withFraming);
			expect(result.success).toBe(true);
		});
	});

	describe('skillSearchQuerySchema', () => {
		it('should validate basic search query', () => {
			const query = {
				query: 'typescript testing patterns',
			};
			const result = skillSearchQuerySchema.safeParse(query);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.category).toBe('all');
				expect(result.data.topK).toBe(5);
				expect(result.data.similarityThreshold).toBe(0.7);
			}
		});

		it('should validate with all parameters', () => {
			const query = {
				query: 'security best practices',
				category: 'security' as const,
				tags: ['authentication', 'authorization'],
				difficulty: 'advanced' as const,
				topK: 10,
				similarityThreshold: 0.8,
				includeDeprecated: true,
			};
			const result = skillSearchQuerySchema.safeParse(query);
			expect(result.success).toBe(true);
		});

		it('should enforce maximum topK (50)', () => {
			const query = {
				query: 'test',
				topK: 51,
			};
			const result = skillSearchQuerySchema.safeParse(query);
			expect(result.success).toBe(false);
		});

		it('should enforce similarity threshold range (0-1)', () => {
			const tooHigh = {
				query: 'test',
				similarityThreshold: 1.5,
			};
			const result = skillSearchQuerySchema.safeParse(tooHigh);
			expect(result.success).toBe(false);
		});
	});

	describe('Skill Event Schemas', () => {
		describe('skillLoadedEventSchema', () => {
			it('should validate skill loaded event', () => {
				const event = {
					skillId: 'skill-test',
					name: 'Test Skill',
					category: 'testing',
					filePath: '/skills/skill-test.md',
					fileSize: 1024,
					loadTime: 15.5,
					timestamp: new Date().toISOString(),
				};
				const result = skillLoadedEventSchema.safeParse(event);
				expect(result.success).toBe(true);
			});
		});

		describe('skillValidatedEventSchema', () => {
			it('should validate skill validated event', () => {
				const event = {
					skillId: 'skill-test',
					name: 'Test Skill',
					validationDuration: 5.2,
					timestamp: new Date().toISOString(),
				};
				const result = skillValidatedEventSchema.safeParse(event);
				expect(result.success).toBe(true);
			});

			it('should validate with warnings', () => {
				const event = {
					skillId: 'skill-test',
					name: 'Test Skill',
					validationDuration: 5.2,
					warnings: ['Missing optional field: examples'],
					timestamp: new Date().toISOString(),
				};
				const result = skillValidatedEventSchema.safeParse(event);
				expect(result.success).toBe(true);
			});
		});

		describe('skillSearchedEventSchema', () => {
			it('should validate skill searched event', () => {
				const event = {
					queryId: 'query-123',
					query: 'typescript patterns',
					category: 'coding',
					tags: ['typescript', 'patterns'],
					resultsCount: 5,
					searchTime: 25.3,
					topScore: 0.95,
					timestamp: new Date().toISOString(),
				};
				const result = skillSearchedEventSchema.safeParse(event);
				expect(result.success).toBe(true);
			});
		});

		describe('skillIndexedEventSchema', () => {
			it('should validate skill indexed event', () => {
				const event = {
					skillId: 'skill-test',
					name: 'Test Skill',
					embeddingDimensions: 1536,
					chunkCount: 10,
					indexingTime: 150.5,
					vectorStore: 'chromadb',
					timestamp: new Date().toISOString(),
				};
				const result = skillIndexedEventSchema.safeParse(event);
				expect(result.success).toBe(true);
			});
		});

		describe('skillUpdatedEventSchema', () => {
			it('should validate skill updated event', () => {
				const event = {
					skillId: 'skill-test',
					name: 'Test Skill',
					changes: {
						content: true,
						metadata: false,
						persuasiveFraming: false,
						examples: true,
					},
					previousVersion: '1.0.0',
					newVersion: '1.1.0',
					requiresReindexing: true,
					timestamp: new Date().toISOString(),
				};
				const result = skillUpdatedEventSchema.safeParse(event);
				expect(result.success).toBe(true);
			});
		});

		describe('skillDeprecatedEventSchema', () => {
			it('should validate skill deprecated event', () => {
				const event = {
					skillId: 'skill-old',
					name: 'Old Skill',
					reason: 'Replaced by newer implementation with better performance',
					replacedBy: 'skill-new',
					deprecationDate: new Date().toISOString(),
					timestamp: new Date().toISOString(),
				};
				const result = skillDeprecatedEventSchema.safeParse(event);
				expect(result.success).toBe(true);
			});
		});

		describe('skillValidationFailedEventSchema', () => {
			it('should validate skill validation failed event', () => {
				const event = {
					skillId: 'skill-invalid',
					filePath: '/skills/skill-invalid.md',
					errors: [
						{
							field: 'id',
							message: 'ID must start with "skill-"',
							code: 'INVALID_ID_FORMAT',
						},
						{
							field: 'content',
							message: 'Content must be at least 50 characters',
						},
					],
					severity: 'error' as const,
					timestamp: new Date().toISOString(),
				};
				const result = skillValidationFailedEventSchema.safeParse(event);
				expect(result.success).toBe(true);
			});
		});
	});

	describe('SkillEventTypes', () => {
		it('should define all event type constants', () => {
			expect(SkillEventTypes.SkillLoaded).toBe('skill.loaded');
			expect(SkillEventTypes.SkillValidated).toBe('skill.validated');
			expect(SkillEventTypes.SkillSearched).toBe('skill.searched');
			expect(SkillEventTypes.SkillRetrieved).toBe('skill.retrieved');
			expect(SkillEventTypes.SkillIndexed).toBe('skill.indexed');
			expect(SkillEventTypes.SkillUpdated).toBe('skill.updated');
			expect(SkillEventTypes.SkillDeprecated).toBe('skill.deprecated');
			expect(SkillEventTypes.SkillDeleted).toBe('skill.deleted');
			expect(SkillEventTypes.SkillValidationFailed).toBe('skill.validation.failed');
		});
	});

	describe('SkillEventSchemas Registry', () => {
		it('should map all event types to schemas', () => {
			expect(SkillEventSchemas[SkillEventTypes.SkillLoaded]).toBe(skillLoadedEventSchema);
			expect(SkillEventSchemas[SkillEventTypes.SkillValidated]).toBe(skillValidatedEventSchema);
			expect(SkillEventSchemas[SkillEventTypes.SkillSearched]).toBe(skillSearchedEventSchema);
			expect(SkillEventSchemas[SkillEventTypes.SkillRetrieved]).toBe(skillRetrievedEventSchema);
			expect(SkillEventSchemas[SkillEventTypes.SkillIndexed]).toBe(skillIndexedEventSchema);
			expect(SkillEventSchemas[SkillEventTypes.SkillUpdated]).toBe(skillUpdatedEventSchema);
			expect(SkillEventSchemas[SkillEventTypes.SkillDeprecated]).toBe(skillDeprecatedEventSchema);
			expect(SkillEventSchemas[SkillEventTypes.SkillDeleted]).toBe(skillDeletedEventSchema);
			expect(SkillEventSchemas[SkillEventTypes.SkillValidationFailed]).toBe(
				skillValidationFailedEventSchema,
			);
		});
	});

	describe('Security Validation', () => {
		it('should reject skill IDs with SQL injection patterns', () => {
			const malicious = {
				id: "skill-test'; DROP TABLE skills--",
				name: 'Test',
				description: 'Test description for validation',
				content: 'a'.repeat(100),
				metadata: {
					version: '1.0.0',
					author: 'Test',
					category: 'testing' as const,
					tags: ['test'],
					difficulty: 'beginner' as const,
					estimatedTokens: 100,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					deprecated: false,
				},
				successCriteria: ['Test passes'],
			};
			const result = skillSchema.safeParse(malicious);
			expect(result.success).toBe(false);
		});

		it('should reject excessively long field values', () => {
			const oversized = {
				id: 'skill-test',
				name: 'a'.repeat(200),
				description: 'Test description for validation',
				content: 'a'.repeat(100),
				metadata: {
					version: '1.0.0',
					author: 'Test',
					category: 'testing' as const,
					tags: ['test'],
					difficulty: 'beginner' as const,
					estimatedTokens: 100,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					deprecated: false,
				},
				successCriteria: ['Test passes'],
			};
			const result = skillSchema.safeParse(oversized);
			expect(result.success).toBe(false);
		});
	});
});
