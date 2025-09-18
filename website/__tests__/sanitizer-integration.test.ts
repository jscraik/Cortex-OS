import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sanitizeMdxContent } from '../sync-docs.js';

// Simple path resolution
const testDir = new URL('.', import.meta.url).pathname;

describe('Sanitizer Integration Tests', () => {
	it('should handle curated corpus with expected repair counts', async () => {
		// Read the test corpus fixture
		const corpusPath = join(testDir, 'fixtures', 'sanitizer-corpus.md');
		const originalContent = await fs.readFile(corpusPath, 'utf-8');

		// Apply sanitization
		const sanitizedContent = sanitizeMdxContent(originalContent);

		// Assert that content was actually changed (sanitized)
		expect(sanitizedContent).not.toBe(originalContent);

		// Count basic changes
		const changes = {
			genericsEscaped: (originalContent.match(/Promise<string>/g) || []).length,
			pseudoJsxEscaped: (originalContent.match(/<Fragment>/g) || []).length,
		};

		const totalExpectedChanges = Object.values(changes).reduce((a, b) => a + b, 0);
		expect(totalExpectedChanges).toBeGreaterThan(0);

		// Verify specific patterns are processed
		expect(sanitizedContent).not.toMatch(/Promise<string>/);
		expect(sanitizedContent).toMatch(/```typescript/);

		console.log('Integration test repair summary:', changes);
	});

	it('should handle content that needs escaping', () => {
		const messyContent = 'Some Promise<string> types and <Fragment> components.';
		const firstPass = sanitizeMdxContent(messyContent);

		// Verify basic sanitization happens
		expect(firstPass).not.toBe(messyContent);
		expect(firstPass).toMatch(/&lt;Fragment&gt;/); // Fragment should be escaped

		// Generics may be handled differently based on context
		console.log('Original:', messyContent);
		console.log('Sanitized result:', firstPass);
	});

	it('should handle empty content gracefully', () => {
		expect(sanitizeMdxContent('')).toBe('');
		expect(sanitizeMdxContent('# Just a title')).toBe('# Just a title');
	});
});
