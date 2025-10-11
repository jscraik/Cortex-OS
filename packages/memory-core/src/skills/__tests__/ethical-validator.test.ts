/**
 * brAInwav Ethical Compliance Validator Tests
 * Validates skills against brAInwav ethical AI guidelines
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/__tests__/ethical-validator.test
 */

import { describe, expect, it } from 'vitest';
import type { Skill } from '../types.js';
import {
	type EthicalViolation,
	validateEthicalCompliance,
} from '../validators/ethical-validator.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createEthicalSkill(): Skill {
	return {
		id: 'skill-ethical-testing',
		name: 'Ethical Testing Skill',
		description: 'A skill that demonstrates ethical AI principles and inclusive language',
		content: `# Ethical Testing Skill

This skill helps developers write inclusive, accessible code.

## Principles
- Use inclusive terminology
- Consider diverse perspectives
- Ensure accessibility for all users
- Respect user privacy and autonomy`,
		metadata: {
			version: '1.0.0',
			author: 'brAInwav Ethics Team',
			category: 'testing',
			tags: ['ethics', 'accessibility', 'inclusive'],
			difficulty: 'beginner',
			estimatedTokens: 300,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deprecated: false,
		},
		successCriteria: [
			'Uses inclusive language',
			'Considers accessibility',
			'Respects user autonomy',
		],
	};
}

// ============================================================================
// Bias Detection Tests
// ============================================================================

describe('Ethical Validation - Bias Detection', () => {
	it('should pass validation for inclusive skill', () => {
		const skill = createEthicalSkill();
		const violations = validateEthicalCompliance(skill);

		expect(violations).toHaveLength(0);
	});

	it('should detect gender-biased language', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'The developer should check his code regularly',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'bias_language')).toBe(true);
		expect(violations.some((v) => v.message.includes('gender'))).toBe(true);
	});

	it('should suggest inclusive alternatives', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'Every programmer should know his tools',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.length).toBeGreaterThan(0);
		const violation = violations.find((v) => v.type === 'bias_language');
		expect(violation?.suggestion).toBeTruthy();
		expect(violation?.suggestion).toContain('their');
	});

	it('should detect potentially exclusionary terms', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'This is a simple whitelist/blacklist system',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'bias_language')).toBe(true);
	});

	it('should suggest modern inclusive terminology', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'Configure the master/slave setup',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.length).toBeGreaterThan(0);
		const violation = violations.find((v) => v.type === 'bias_language');
		expect(violation?.suggestion).toContain('primary');
	});
});

// ============================================================================
// Transparency Requirements Tests
// ============================================================================

describe('Ethical Validation - Transparency', () => {
	it('should accept skill with clear description', () => {
		const skill = createEthicalSkill();
		const violations = validateEthicalCompliance(skill);

		const transparencyViolations = violations.filter(
			(v) => v.type === 'transparency',
		);
		expect(transparencyViolations).toHaveLength(0);
	});

	it('should flag vague descriptions', () => {
		const skill = {
			...createEthicalSkill(),
			description: 'Does stuff with code and things',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.some((v) => v.type === 'transparency')).toBe(true);
		expect(violations.some((v) => v.message.includes('description'))).toBe(true);
	});

	it('should require clear success criteria', () => {
		const skill = {
			...createEthicalSkill(),
			successCriteria: ['Works well'],
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.some((v) => v.type === 'transparency')).toBe(true);
	});

	it('should validate examples are explanatory', () => {
		const skill: Skill = {
			...createEthicalSkill(),
			examples: [
				{
					title: 'Example',
					input: 'Input',
					output: 'Output',
				},
			],
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.some((v) => v.type === 'transparency')).toBe(true);
	});
});

// ============================================================================
// Safety Guidelines Tests
// ============================================================================

describe('Ethical Validation - Safety', () => {
	it('should accept safe, helpful content', () => {
		const skill = createEthicalSkill();
		const violations = validateEthicalCompliance(skill);

		const safetyViolations = violations.filter((v) => v.type === 'safety');
		expect(safetyViolations).toHaveLength(0);
	});

	it('should detect potentially harmful instructions', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'Override all safety checks to maximize performance',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.some((v) => v.type === 'safety')).toBe(true);
	});

	it('should flag missing user consent requirements', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'Automatically collect and transmit user data for analytics',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.some((v) => v.type === 'safety')).toBe(true);
		expect(violations.some((v) => v.message.includes('consent'))).toBe(true);
	});

	it('should detect privacy-concerning patterns', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'Store user passwords in plain text for convenience',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.some((v) => v.type === 'safety')).toBe(true);
	});
});

// ============================================================================
// Accessibility Requirements Tests
// ============================================================================

describe('Ethical Validation - Accessibility', () => {
	it('should accept accessibility-conscious content', () => {
		const skill = {
			...createEthicalSkill(),
			content: `# Accessible Design

Ensure all UI elements have proper ARIA labels and keyboard navigation.`,
		};
		const violations = validateEthicalCompliance(skill);

		const a11yViolations = violations.filter((v) => v.type === 'accessibility');
		expect(a11yViolations).toHaveLength(0);
	});

	it('should flag purely visual-only instructions', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'Click the red button in the top-right corner',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.some((v) => v.type === 'accessibility')).toBe(true);
		expect(violations.some((v) => v.message.includes('color'))).toBe(true);
	});

	it('should suggest inclusive alternatives for visual-only content', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'See the diagram above',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.some((v) => v.type === 'accessibility')).toBe(true);
		const violation = violations.find((v) => v.type === 'accessibility');
		expect(violation?.suggestion).toBeTruthy();
	});
});

// ============================================================================
// brAInwav Branding Tests
// ============================================================================

describe('Ethical Validation - brAInwav Compliance', () => {
	it('should accept skills with brAInwav branding', () => {
		const skill = {
			...createEthicalSkill(),
			author: 'brAInwav Development Team',
		};
		const violations = validateEthicalCompliance(skill);

		const brandingViolations = violations.filter((v) => v.type === 'branding');
		expect(brandingViolations).toHaveLength(0);
	});

	it('should validate consistent brAInwav standards', () => {
		const skill = createEthicalSkill();
		const violations = validateEthicalCompliance(skill);

		// Should not have branding violations for compliant skills
		expect(violations.filter((v) => v.type === 'branding')).toHaveLength(0);
	});
});

// ============================================================================
// Comprehensive Ethical Tests
// ============================================================================

describe('Ethical Validation - Comprehensive', () => {
	it('should detect multiple ethical issues', () => {
		const skill: Skill = {
			id: 'skill-problematic',
			name: 'Problematic Skill',
			description: 'Vague skill',
			content: `The developer should check his code.
Use the master branch.
Click the red button.
Override all safety checks.`,
			metadata: {
				version: '1.0.0',
				author: 'Unknown',
				category: 'other',
				tags: ['test'],
				difficulty: 'beginner',
				estimatedTokens: 100,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				deprecated: false,
			},
			successCriteria: ['Works'],
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.length).toBeGreaterThan(3);
		const types = new Set(violations.map((v) => v.type));
		expect(types.size).toBeGreaterThan(2);
	});

	it('should assign appropriate severity levels', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'Store passwords in plain text',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.some((v) => v.severity === 'high')).toBe(true);
	});

	it('should provide actionable suggestions', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'Use whitelist/blacklist',
		};
		const violations = validateEthicalCompliance(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations[0]?.suggestion).toBeTruthy();
		expect(violations[0]?.suggestion?.length).toBeGreaterThan(10);
	});
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Ethical Validation - Performance', () => {
	it('should validate in less than 15ms', () => {
		const skill = createEthicalSkill();
		const start = performance.now();

		validateEthicalCompliance(skill);

		const duration = performance.now() - start;
		expect(duration).toBeLessThan(15);
	});

	it('should handle large content efficiently', () => {
		const skill = {
			...createEthicalSkill(),
			content: 'Ethical content. '.repeat(5000), // ~85KB
		};
		const start = performance.now();

		validateEthicalCompliance(skill);

		const duration = performance.now() - start;
		expect(duration).toBeLessThan(100);
	});
});
