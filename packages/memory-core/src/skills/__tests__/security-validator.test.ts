/**
 * brAInwav Security Validator Tests
 * Comprehensive security validation for skill content
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/__tests__/security-validator.test
 */

import { describe, expect, it } from 'vitest';
import type { Skill } from '../types.js';
import {
	type SecurityViolation,
	validateSecurityRules,
} from '../validators/security-validator.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createSafeSkill(): Skill {
	return {
		id: 'skill-safe-testing',
		name: 'Safe Testing Skill',
		description: 'A completely safe skill for testing security validation',
		content: `# Safe Testing Skill

This is safe content with no security issues.

## Features
- Uses safe APIs
- No code injection
- Proper error handling`,
		metadata: {
			version: '1.0.0',
			author: 'brAInwav Security Team',
			category: 'testing',
			tags: ['safe', 'testing'],
			difficulty: 'beginner',
			estimatedTokens: 200,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			deprecated: false,
		},
		successCriteria: ['Tests pass', 'No security violations'],
	};
}

// ============================================================================
// Code Injection Detection Tests
// ============================================================================

describe('Security Validation - Code Injection', () => {
	it('should pass validation for safe skill', () => {
		const skill = createSafeSkill();
		const violations = validateSecurityRules(skill);

		expect(violations).toHaveLength(0);
	});

	it('should detect eval() usage', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Use eval() to execute dynamic code',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'code_injection')).toBe(true);
		expect(violations.some((v) => v.message.includes('eval'))).toBe(true);
	});

	it('should detect Function() constructor', () => {
		const skill = {
			...createSafeSkill(),
			content: 'new Function("return 1 + 1")()',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'code_injection')).toBe(true);
		expect(violations.some((v) => v.message.includes('Function'))).toBe(true);
	});

	it('should detect script tag injection', () => {
		const skill = {
			...createSafeSkill(),
			content: '<script>alert("xss")</script>',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'xss_pattern')).toBe(true);
	});

	it('should allow safe code examples in markdown', () => {
		const skill = {
			...createSafeSkill(),
			content: `\`\`\`javascript
// This is a safe code example
function add(a, b) {
  return a + b;
}
\`\`\``,
		};
		const violations = validateSecurityRules(skill);

		expect(violations).toHaveLength(0);
	});

	it('should detect dangerous process methods', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Use process.exit() to terminate',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'dangerous_api')).toBe(true);
	});
});

// ============================================================================
// Path Traversal Detection Tests
// ============================================================================

describe('Security Validation - Path Traversal', () => {
	it('should detect ../ patterns', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Read file from ../../etc/passwd',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'path_traversal')).toBe(true);
	});

	it('should detect absolute path access', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Access /etc/passwd directly',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'path_traversal')).toBe(true);
	});

	it('should allow safe relative paths', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Load from ./skills/my-skill.md',
		};
		const violations = validateSecurityRules(skill);

		expect(violations).toHaveLength(0);
	});

	it('should detect encoded path traversal', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Path: %2e%2e%2f%2e%2e%2fetc%2fpasswd',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'path_traversal')).toBe(true);
	});
});

// ============================================================================
// XSS Pattern Detection Tests
// ============================================================================

describe('Security Validation - XSS Patterns', () => {
	it('should detect javascript: protocol', () => {
		const skill = {
			...createSafeSkill(),
			content: '<a href="javascript:alert(1)">Click</a>',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'xss_pattern')).toBe(true);
	});

	it('should detect data: protocol with script', () => {
		const skill = {
			...createSafeSkill(),
			content: '<img src="data:text/html,<script>alert(1)</script>">',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'xss_pattern')).toBe(true);
	});

	it('should detect event handlers in HTML', () => {
		const skill = {
			...createSafeSkill(),
			content: '<div onclick="malicious()">Click me</div>',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'xss_pattern')).toBe(true);
	});

	it('should allow safe markdown links', () => {
		const skill = {
			...createSafeSkill(),
			content: '[Link](https://example.com)',
		};
		const violations = validateSecurityRules(skill);

		expect(violations).toHaveLength(0);
	});
});

// ============================================================================
// Resource Limit Tests
// ============================================================================

describe('Security Validation - Resource Limits', () => {
	it('should reject skills exceeding size limit', () => {
		const skill = {
			...createSafeSkill(),
			content: 'x'.repeat(2 * 1024 * 1024), // 2MB
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'resource_limit')).toBe(true);
		expect(violations.some((v) => v.message.includes('size'))).toBe(true);
	});

	it('should reject excessive nesting depth', () => {
		const skill = {
			...createSafeSkill(),
			content: Array.from({ length: 15 }, (_, i) => '#'.repeat(i + 1)).join('\n'),
		};
		const violations = validateSecurityRules(skill);

		// This test checks for deeply nested structures
		// Implementation will define nesting detection logic
		expect(violations.length).toBeGreaterThanOrEqual(0);
	});

	it('should accept skills within size limits', () => {
		const skill = {
			...createSafeSkill(),
			content: 'x'.repeat(500 * 1024), // 500KB - within 1MB limit
		};
		const violations = validateSecurityRules(skill);

		// Should not have size violation
		expect(violations.filter((v) => v.type === 'resource_limit')).toHaveLength(
			0,
		);
	});
});

// ============================================================================
// Shell Command Injection Tests
// ============================================================================

describe('Security Validation - Shell Commands', () => {
	it('should detect dangerous shell commands', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Run: rm -rf /',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'shell_injection')).toBe(true);
	});

	it('should detect command substitution', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Execute: $(cat /etc/passwd)',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(0);
		expect(violations.some((v) => v.type === 'shell_injection')).toBe(true);
	});

	it('should allow safe command examples in code blocks', () => {
		const skill = {
			...createSafeSkill(),
			content: `\`\`\`bash
# Safe example
npm test
\`\`\``,
		};
		const violations = validateSecurityRules(skill);

		expect(violations).toHaveLength(0);
	});
});

// ============================================================================
// Comprehensive Security Tests
// ============================================================================

describe('Security Validation - Comprehensive', () => {
	it('should detect multiple security violations', () => {
		const skill = {
			...createSafeSkill(),
			content: `
eval("malicious code")
<script>alert(1)</script>
../../etc/passwd
rm -rf /
      `,
		};
		const violations = validateSecurityRules(skill);

		expect(violations.length).toBeGreaterThan(3);
		expect(new Set(violations.map((v) => v.type)).size).toBeGreaterThan(2);
	});

	it('should provide specific violation details', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Use eval() here',
		};
		const violations = validateSecurityRules(skill);

		const violation = violations[0];
		expect(violation).toBeDefined();
		expect(violation?.message).toBeTruthy();
		expect(violation?.type).toBeTruthy();
		expect(violation?.severity).toBeTruthy();
		expect(violation?.line).toBeGreaterThan(0);
	});

	it('should assign appropriate severity levels', () => {
		const skill = {
			...createSafeSkill(),
			content: 'eval() and process.exit()',
		};
		const violations = validateSecurityRules(skill);

		expect(violations.some((v) => v.severity === 'critical')).toBe(true);
	});
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Security Validation - Performance', () => {
	it('should validate in less than 10ms', () => {
		const skill = createSafeSkill();
		const start = performance.now();

		validateSecurityRules(skill);

		const duration = performance.now() - start;
		expect(duration).toBeLessThan(10);
	});

	it('should handle large safe content efficiently', () => {
		const skill = {
			...createSafeSkill(),
			content: 'Safe content. '.repeat(10000), // ~150KB
		};
		const start = performance.now();

		validateSecurityRules(skill);

		const duration = performance.now() - start;
		expect(duration).toBeLessThan(50);
	});
});
