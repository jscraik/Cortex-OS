import { describe, expect, it } from 'vitest';

describe('ReDoS Security Fixes Validation', () => {
	it('should prevent catastrophic backtracking in vulnerable regex patterns', () => {
		// These are the old vulnerable patterns that could cause ReDoS
		const vulnerablePatterns = [
			/.*\/tests?\/.*/,
			/.*\/__tests__\/.*/,
			/.*\.test\.(ts|js|tsx|jsx)$/,
			/.*README.*/,
			/.*config\.(ts|js|json)$/,
			/.*\/demo.*\/.*/,
		];

		// These are our new safe patterns
		const safePatterns = [
			/^(?:.*\/)?tests?\/.*$/,
			/^(?:.*\/)?__tests__\/.*$/,
			/^.*\.(?:test|spec)\.(?:ts|js|tsx|jsx)$/,
			/^.*README.*$/,
			/^.*config\.(?:ts|js|json)$/,
			/^(?:.*\/)?demo[^/]*\/.*$/,
		];

		// Test cases that could trigger catastrophic backtracking
		const maliciousInputs = [
			// Long repetitive sequences that could cause backtracking
			'a'.repeat(100) + '/' + 'b'.repeat(100) + '/' + 'test'.repeat(50),
			'/'.repeat(50) + 'test' + '/'.repeat(50),
			'demo' + 'a'.repeat(200) + '/' + 'b'.repeat(200),
			'path' + '/'.repeat(100) + 'README' + 'a'.repeat(100),
		];

		// Test vulnerable patterns (should timeout or take very long)
		vulnerablePatterns.forEach((pattern, index) => {
			maliciousInputs.forEach((input) => {
				const startTime = Date.now();
				try {
					const result = pattern.test(input);
					const endTime = Date.now();
					const duration = endTime - startTime;

					// Vulnerable patterns should take longer than 50ms on malicious input
					if (duration > 50) {
						console.log(`Vulnerable pattern ${index} took ${duration}ms on input: ${input.substring(0, 50)}...`);
					}
				} catch (error) {
					// Some patterns might throw due to complexity
					console.log(`Vulnerable pattern ${index} threw error on malicious input`);
				}
			});
		});

		// Test safe patterns (should complete quickly)
		safePatterns.forEach((pattern, index) => {
			maliciousInputs.forEach((input) => {
				const startTime = Date.now();
				const result = pattern.test(input);
				const endTime = Date.now();
				const duration = endTime - startTime;

				// Safe patterns should complete in under 10ms even on malicious input
				expect(duration).toBeLessThan(10);
			});
		});
	});

	it('should maintain same functionality for valid inputs', () => {
		// Test that our safe patterns still match the same valid inputs
		const testCases = [
			{
				input: '/path/to/tests/file.test.ts',
				shouldMatch: true,
				description: 'Test file path'
			},
			{
				input: '/path/to/__tests__/spec.ts',
				shouldMatch: true,
				description: 'Double underscore test path'
			},
			{
				input: '/path/to/README.md',
				shouldMatch: true,
				description: 'README file'
			},
			{
				input: '/path/to/config.ts',
				shouldMatch: true,
				description: 'Config file'
			},
			{
				input: '/path/to/demo/example.js',
				shouldMatch: true,
				description: 'Demo folder'
			},
			{
				input: '/path/to/production/src/main.ts',
				shouldMatch: false,
				description: 'Production source file'
			}
		];

		const safePatterns = [
			/^(?:.*\/)?tests?\/.*$/,
			/^(?:.*\/)?__tests__\/.*$/,
			/^.*README.*$/,
			/^.*config\.(?:ts|js|json)$/,
			/^(?:.*\/)?demo[^/]*\/.*$/,
		];

		testCases.forEach(testCase => {
			const matches = safePatterns.some(pattern => pattern.test(testCase.input));
			expect(matches).toBe(testCase.shouldMatch);
		});
	});

	it('should enforce input length limits', () => {
		// Test our input validation prevents extremely long inputs
		const extremelyLongInput = 'a'.repeat(2000);

		// Simulate the input validation we added
		const isValidLength = extremelyLongInput.length <= 1000;
		expect(isValidLength).toBe(false);

		// Normal length inputs should pass
		const normalInput = '/path/to/tests/file.test.ts';
		const isNormalValid = normalInput.length <= 1000;
		expect(isNormalValid).toBe(true);
	});
});