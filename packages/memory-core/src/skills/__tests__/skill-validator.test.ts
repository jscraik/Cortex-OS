/**
 * brAInwav Skill Validator Tests
 * Comprehensive test coverage for skill schema validation
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/__tests__/skill-validator.test
 */

import { describe, expect, it } from 'vitest';
import type { Skill, SkillMetadata } from '../types.js';
import {
	type ValidationResult,
	validateSkill,
	validateSkillMetadata,
} from '../validators/skill-validator.js';

// ============================================================================
// Test Data Helpers
// ============================================================================

function createValidMetadata(): SkillMetadata {
	return {
		version: '1.0.0',
		author: 'brAInwav Development Team',
		category: 'testing',
		tags: ['tdd', 'testing', 'quality'],
		difficulty: 'intermediate',
		estimatedTokens: 500,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		deprecated: false,
	};
}

function createValidSkill(): Skill {
	return {
		id: 'skill-test-driven-development',
		name: 'Test-Driven Development',
		description: 'Write tests first, then implement code to make them pass',
		content: `# Test-Driven Development

## Overview
Test-Driven Development (TDD) is a software development process where tests are written before the code.

## Steps
1. Write a failing test (RED)
2. Write minimal code to pass the test (GREEN)
3. Refactor to improve code quality (REFACTOR)

## Benefits
- Better code quality
- Improved design
- Higher confidence
- Living documentation`,
		metadata: createValidMetadata(),
		successCriteria: [
			'All tests pass',
			'Code coverage > 90%',
			'No test duplication',
		],
	};
}

// ============================================================================
// Metadata Validation Tests
// ============================================================================

describe('validateSkillMetadata', () => {
	it('should validate correct metadata', () => {
		const metadata = createValidMetadata();
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should reject invalid version format', () => {
		const metadata = { ...createValidMetadata(), version: '1.0' };
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0]?.message).toContain('version');
	});

	it('should reject empty author', () => {
		const metadata = { ...createValidMetadata(), author: '' };
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('author');
	});

	it('should reject invalid category', () => {
		const metadata = { ...createValidMetadata(), category: 'invalid' as never };
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('category');
	});

	it('should reject empty tags array', () => {
		const metadata = { ...createValidMetadata(), tags: [] };
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('tags');
	});

	it('should reject too many tags', () => {
		const metadata = {
			...createValidMetadata(),
			tags: Array.from({ length: 25 }, (_, i) => `tag${i}`),
		};
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('tags');
	});

	it('should reject invalid difficulty level', () => {
		const metadata = { ...createValidMetadata(), difficulty: 'easy' as never };
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('difficulty');
	});

	it('should reject negative estimatedTokens', () => {
		const metadata = { ...createValidMetadata(), estimatedTokens: -100 };
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('estimatedTokens');
	});

	it('should reject excessive estimatedTokens', () => {
		const metadata = { ...createValidMetadata(), estimatedTokens: 15000 };
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('estimatedTokens');
	});

	it('should accept optional fields when omitted', () => {
		const metadata = createValidMetadata();
		delete (metadata as Partial<SkillMetadata>).requiredTools;
		delete (metadata as Partial<SkillMetadata>).prerequisites;

		const result = validateSkillMetadata(metadata);
		expect(result.valid).toBe(true);
	});

	it('should validate optional requiredTools when present', () => {
		const metadata = {
			...createValidMetadata(),
			requiredTools: ['vitest', 'typescript'],
		};
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(true);
	});

	it('should reject too many requiredTools', () => {
		const metadata = {
			...createValidMetadata(),
			requiredTools: Array.from({ length: 55 }, (_, i) => `tool${i}`),
		};
		const result = validateSkillMetadata(metadata);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('requiredTools');
	});
});

// ============================================================================
// Full Skill Validation Tests
// ============================================================================

describe('validateSkill', () => {
	it('should validate complete valid skill', () => {
		const skill = createValidSkill();
		const result = validateSkill(skill);

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(result.data).toEqual(skill);
	});

	it('should reject invalid skill ID format', () => {
		const skill = { ...createValidSkill(), id: 'invalid-id' };
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('id');
		expect(result.errors[0]?.message).toContain('skill-');
	});

	it('should reject short skill name', () => {
		const skill = { ...createValidSkill(), name: 'TD' };
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('name');
	});

	it('should reject short description', () => {
		const skill = { ...createValidSkill(), description: 'Short' };
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('description');
	});

	it('should reject short content', () => {
		const skill = { ...createValidSkill(), content: 'Too short' };
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('content');
	});

	it('should reject excessive content length', () => {
		const skill = {
			...createValidSkill(),
			content: 'x'.repeat(55000),
		};
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('content');
	});

	it('should reject missing successCriteria', () => {
		const skill = { ...createValidSkill(), successCriteria: [] };
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('successCriteria');
	});

	it('should validate skill with optional fields', () => {
		const skill: Skill = {
			...createValidSkill(),
			examples: [
				{
					title: 'Basic TDD Example',
					input: 'function add(a, b) { }',
					output: 'function add(a, b) { return a + b; }',
					explanation: 'Start with failing test, then implement',
				},
			],
			warnings: ['TDD requires discipline'],
			failureIndicators: ['Tests written after code'],
		};
		const result = validateSkill(skill);

		expect(result.valid).toBe(true);
	});

	it('should reject too many examples', () => {
		const skill: Skill = {
			...createValidSkill(),
			examples: Array.from({ length: 15 }, (_, i) => ({
				title: `Example ${i}`,
				input: 'test input',
				output: 'test output',
			})),
		};
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('examples');
	});

	it('should provide multiple error messages for multiple issues', () => {
		const skill = {
			...createValidSkill(),
			id: 'bad-id',
			name: 'X',
			description: 'Short',
		};
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(2);
	});

	it('should include field path in error messages', () => {
		const skill = {
			...createValidSkill(),
			metadata: { ...createValidMetadata(), version: 'invalid' },
		};
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.path).toContain('metadata');
		expect(result.errors[0]?.path).toContain('version');
	});
});

// ============================================================================
// Persuasive Framing Validation Tests
// ============================================================================

describe('validateSkill - persuasiveFraming', () => {
	it('should validate skill with persuasive framing', () => {
		const skill: Skill = {
			...createValidSkill(),
			persuasiveFraming: {
				authority: 'Kent Beck, creator of TDD, recommends this approach',
				commitment: 'Start with one test today',
				socialProof: 'Used by 80% of professional development teams',
			},
		};
		const result = validateSkill(skill);

		expect(result.valid).toBe(true);
	});

	it('should reject excessive persuasive framing text', () => {
		const skill: Skill = {
			...createValidSkill(),
			persuasiveFraming: {
				authority: 'x'.repeat(600),
			},
		};
		const result = validateSkill(skill);

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toContain('authority');
	});

	it('should accept empty persuasive framing object', () => {
		const skill: Skill = {
			...createValidSkill(),
			persuasiveFraming: {},
		};
		const result = validateSkill(skill);

		expect(result.valid).toBe(true);
	});
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Validator Performance', () => {
	it('should validate skill in less than 5ms', () => {
		const skill = createValidSkill();
		const start = performance.now();

		validateSkill(skill);

		const duration = performance.now() - start;
		expect(duration).toBeLessThan(5);
	});

	it('should validate metadata in less than 2ms', () => {
		const metadata = createValidMetadata();
		const start = performance.now();

		validateSkillMetadata(metadata);

		const duration = performance.now() - start;
		expect(duration).toBeLessThan(2);
	});

	it('should handle batch validation efficiently', () => {
		const skills = Array.from({ length: 100 }, () => createValidSkill());
		const start = performance.now();

		for (const skill of skills) {
			validateSkill(skill);
		}

		const duration = performance.now() - start;
		expect(duration).toBeLessThan(500); // 100 skills in <500ms
	});
});
