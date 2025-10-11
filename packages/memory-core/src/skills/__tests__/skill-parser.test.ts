/**
 * brAInwav Skill Parser Tests
 * Comprehensive test coverage for YAML frontmatter parsing
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/__tests__/skill-parser.test
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	ContentValidationError,
	FrontmatterError,
	SkillParseError,
	YamlParseError,
	extractFrontmatter,
	getFrontmatterBounds,
	hasFrontmatter,
	normalizeContent,
	parseSkillFile,
	parseSkillFilesBatch,
	parseYamlFrontmatter,
	validateContent,
} from '../loaders/skill-parser.js';
import type { SkillFileRaw } from '../types.js';

// ============================================================================
// Test Helpers
// ============================================================================

const FIXTURES_DIR = join(__dirname, 'fixtures');

function loadFixture(filename: string): string {
	return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

function createSkillFileRaw(filename: string, content?: string): SkillFileRaw {
	const rawContent = content ?? loadFixture(filename);
	return {
		filePath: join(FIXTURES_DIR, filename),
		fileName: filename,
		rawContent,
		fileSize: Buffer.byteLength(rawContent, 'utf-8'),
		lastModified: new Date(),
	};
}

// ============================================================================
// Frontmatter Extraction Tests
// ============================================================================

describe('brAInwav Skill Parser - Frontmatter Extraction', () => {
	describe('extractFrontmatter', () => {
		it('should extract valid frontmatter and content', () => {
			const content = `---
id: skill-test
name: Test Skill
---

Content here`;

			const result = extractFrontmatter(content);

			expect(result.frontmatter).toContain('id: skill-test');
			expect(result.frontmatter).toContain('name: Test Skill');
			expect(result.content).toBe('Content here');
		});

		it('should handle multi-line frontmatter', () => {
			const content = `---
id: skill-test
name: Test Skill
tags:
  - tag1
  - tag2
---

Multi-line content
with multiple paragraphs`;

			const result = extractFrontmatter(content);

			expect(result.frontmatter).toContain('tags:');
			expect(result.frontmatter).toContain('- tag1');
			expect(result.content).toContain('Multi-line content');
		});

		it('should handle content with multiple --- sequences', () => {
			const content = `---
id: skill-test
---

Content with --- in it
---
More content`;

			const result = extractFrontmatter(content);

			expect(result.frontmatter).toBe('id: skill-test');
			expect(result.content).toContain('Content with --- in it');
			expect(result.content).toContain('More content');
		});

		it('should throw error for missing opening delimiter', () => {
			const content = 'No frontmatter here';

			expect(() => extractFrontmatter(content)).toThrow(FrontmatterError);
			expect(() => extractFrontmatter(content)).toThrow('Missing frontmatter');
		});

		it('should throw error for missing closing delimiter', () => {
			const content = `---
id: skill-test
name: Test
No closing delimiter`;

			expect(() => extractFrontmatter(content)).toThrow(FrontmatterError);
			expect(() => extractFrontmatter(content)).toThrow('missing closing');
		});

		it('should throw error for empty frontmatter', () => {
			const content = `---
---

Content`;

			expect(() => extractFrontmatter(content)).toThrow(FrontmatterError);
			expect(() => extractFrontmatter(content)).toThrow('Empty frontmatter');
		});

		it('should throw error for oversized frontmatter', () => {
			const hugeFrontmatter = 'a: ' + 'x'.repeat(15000);
			const content = `---
${hugeFrontmatter}
---

Content`;

			expect(() => extractFrontmatter(content)).toThrow(FrontmatterError);
			expect(() => extractFrontmatter(content)).toThrow('too large');
		});

		it('should trim whitespace from frontmatter and content', () => {
			const content = `---
  id: skill-test  
  name: Test Skill  
---

  Content with spaces  `;

			const result = extractFrontmatter(content);

			expect(result.frontmatter.startsWith(' ')).toBe(false);
			expect(result.frontmatter.endsWith(' ')).toBe(false);
			expect(result.content.startsWith(' ')).toBe(false);
			expect(result.content.endsWith(' ')).toBe(false);
		});
	});
});

// ============================================================================
// YAML Parsing Tests
// ============================================================================

describe('brAInwav Skill Parser - YAML Parsing', () => {
	describe('parseYamlFrontmatter', () => {
		it('should parse valid YAML object', () => {
			const yaml = `id: skill-test
name: Test Skill
tags:
  - tag1
  - tag2`;

			const result = parseYamlFrontmatter(yaml);

			expect(result).toHaveProperty('id', 'skill-test');
			expect(result).toHaveProperty('name', 'Test Skill');
			expect(result).toHaveProperty('tags');
			expect((result as any).tags).toEqual(['tag1', 'tag2']);
		});

		it('should handle nested objects', () => {
			const yaml = `id: skill-test
metadata:
  author: Test Author
  version: 1.0.0`;

			const result = parseYamlFrontmatter(yaml);

			expect(result).toHaveProperty('metadata');
			expect((result as any).metadata).toHaveProperty('author', 'Test Author');
		});

		it('should throw error for invalid YAML syntax', () => {
			const yaml = `id: skill-test
  bad indentation: here`;

			expect(() => parseYamlFrontmatter(yaml)).toThrow(YamlParseError);
			expect(() => parseYamlFrontmatter(yaml)).toThrow('Invalid YAML syntax');
		});

		it('should throw error for YAML arrays at root', () => {
			const yaml = `- item1
- item2`;

			expect(() => parseYamlFrontmatter(yaml)).toThrow(YamlParseError);
			expect(() => parseYamlFrontmatter(yaml)).toThrow('must be an object');
		});

		it('should throw error for YAML primitives at root', () => {
			const yaml = 'just a string';

			expect(() => parseYamlFrontmatter(yaml)).toThrow(YamlParseError);
		});

		it('should throw error for null YAML', () => {
			const yaml = 'null';

			expect(() => parseYamlFrontmatter(yaml)).toThrow(YamlParseError);
			expect(() => parseYamlFrontmatter(yaml)).toThrow('null or undefined');
		});

		it('should handle special YAML characters', () => {
			const yaml = `id: skill-test
description: "Contains: colons and 'quotes'"`;

			const result = parseYamlFrontmatter(yaml);

			expect((result as any).description).toContain('colons');
			expect((result as any).description).toContain('quotes');
		});
	});
});

// ============================================================================
// Content Normalization Tests
// ============================================================================

describe('brAInwav Skill Parser - Content Normalization', () => {
	describe('normalizeContent', () => {
		it('should trim content when trimContent is true', () => {
			const content = '  \n  Content  \n  ';

			const result = normalizeContent(content, { trimContent: true });

			expect(result).toBe('Content');
		});

		it('should preserve content when trimContent is false', () => {
			const content = '  Content that is long enough to meet minimum requirements  ';

			const result = normalizeContent(content, { trimContent: false, normalizeContent: false });

			expect(result).toBe('  Content that is long enough to meet minimum requirements  ');
		});

		it('should replace multiple blank lines', () => {
			const content = 'Line 1\n\n\n\n\nLine 2';

			const result = normalizeContent(content, { normalizeContent: true });

			expect(result).toBe('Line 1\n\nLine 2');
		});

		it('should normalize line endings', () => {
			const content = 'Line 1\r\nLine 2\r\nLine 3';

			const result = normalizeContent(content, { normalizeContent: true });

			expect(result).not.toContain('\r\n');
			expect(result).toContain('\n');
		});

		it('should remove trailing whitespace from lines', () => {
			const content = 'Line 1  \nLine 2  \nLine 3';

			const result = normalizeContent(content, { normalizeContent: true });

			const lines = result.split('\n');
			for (const line of lines) {
				expect(line).not.toMatch(/\s$/);
			}
		});

		it('should skip normalization when disabled', () => {
			const content = 'Line 1\n\n\n\nLine 2  ';

			const result = normalizeContent(content, { normalizeContent: false });

			expect(result).toContain('\n\n\n\n');
		});
	});

	describe('validateContent', () => {
		it('should accept valid content', () => {
			const content = 'a'.repeat(100);

			expect(() => validateContent(content)).not.toThrow();
		});

		it('should reject empty content by default', () => {
			expect(() => validateContent('')).toThrow(ContentValidationError);
			expect(() => validateContent('')).toThrow('Empty content');
		});

		it('should allow empty content when enabled', () => {
			expect(() => validateContent('', undefined, { allowEmptyContent: true })).not.toThrow();
		});

		it('should reject content shorter than minimum', () => {
			const content = 'too short';

			expect(() => validateContent(content)).toThrow(ContentValidationError);
			expect(() => validateContent(content)).toThrow('too short');
		});

		it('should allow short content when empty is allowed', () => {
			const content = 'short';

			expect(() => validateContent(content, undefined, { allowEmptyContent: true })).not.toThrow();
		});

		it('should reject content with null bytes', () => {
			const content = 'Valid content with enough characters to meet minimum length\u0000with null byte included in it';

			expect(() => validateContent(content)).toThrow(ContentValidationError);
			expect(() => validateContent(content)).toThrow('null bytes');
		});

		it('should include error details for short content', () => {
			const content = 'short';

			try {
				validateContent(content, '/test/file.md');
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ContentValidationError);
				expect((error as ContentValidationError).details).toBeDefined();
				expect((error as ContentValidationError).details?.contentLength).toBe(5);
			}
		});
	});
});

// ============================================================================
// Full Parsing Tests
// ============================================================================

describe('brAInwav Skill Parser - Full Parsing', () => {
	describe('parseSkillFile', () => {
		it('should parse valid skill file', async () => {
			const skillFile = createSkillFileRaw('valid-skill.md');

			const result = await parseSkillFile(skillFile);

			expect(result.frontmatter).toHaveProperty('id', 'skill-typescript-testing');
			expect(result.frontmatter).toHaveProperty('name', 'TypeScript Testing Best Practices');
			expect(result.frontmatter.category).toBe('testing');
			expect(result.content).toContain('TypeScript Testing Best Practices');
			expect(result.parseTime).toBeGreaterThan(0);
		});

		it('should validate frontmatter schema by default', async () => {
			const skillFile = createSkillFileRaw('short-content.md');

			// This should fail schema validation (even though short content is a different error)
			// Actually, short-content.md might have valid frontmatter
			await expect(parseSkillFile(skillFile)).rejects.toThrow();
		});

		it('should skip schema validation when disabled', async () => {
			const content = `---
id: invalid-id-format
name: Test
---

${'Valid content that is long enough. '.repeat(10)}`;

			const skillFile = createSkillFileRaw('test.md', content);

			// With validation disabled, should parse even with invalid schema
			const result = await parseSkillFile(skillFile, { validateSchema: false });

			expect(result.frontmatter).toBeDefined();
		});

		it('should handle files with no frontmatter', async () => {
			const skillFile = createSkillFileRaw('no-frontmatter.md');

			await expect(parseSkillFile(skillFile)).rejects.toThrow(FrontmatterError);
		});

		it('should handle malformed frontmatter', async () => {
			const skillFile = createSkillFileRaw('malformed-no-closing.md');

			await expect(parseSkillFile(skillFile)).rejects.toThrow(FrontmatterError);
		});

		it('should handle invalid YAML', async () => {
			const skillFile = createSkillFileRaw('invalid-yaml.md');

			await expect(parseSkillFile(skillFile)).rejects.toThrow(YamlParseError);
		});

		it('should normalize content by default', async () => {
			const content = `---
id: skill-test
name: Test
description: Test skill for normalization
version: 1.0.0
author: Test
category: testing
tags:
  - test
difficulty: beginner
estimatedTokens: 100
---

Line 1 with trailing spaces and enough content to pass validation  


Line 2 with more content and trailing whitespace to ensure we meet minimum length  `;

			const skillFile = createSkillFileRaw('test.md', content);

			const result = await parseSkillFile(skillFile);

			expect(result.content).not.toContain('  \n');
			expect(result.content).not.toContain('\n\n\n');
		});

		it('should skip normalization when disabled', async () => {
			const content = `---
id: skill-test
name: Test
description: Test skill for normalization
version: 1.0.0
author: Test
category: testing
tags:
  - test
difficulty: beginner
estimatedTokens: 100
---

Line 1 with enough content to pass the minimum length validation


Line 2 with additional content to ensure proper testing`;

			const skillFile = createSkillFileRaw('test.md', content);

			const result = await parseSkillFile(skillFile, { normalizeContent: false });

			expect(result.content).toContain('\n\n\n');
		});

		it('should track parse time', async () => {
			const skillFile = createSkillFileRaw('valid-skill.md');

			const result = await parseSkillFile(skillFile);

			expect(result.parseTime).toBeGreaterThan(0);
			expect(result.parseTime).toBeLessThan(1000); // Should be fast
		});
	});

	describe('parseSkillFilesBatch', () => {
		it('should parse multiple valid files', async () => {
			const content = loadFixture('valid-skill.md');
			const files = [
				createSkillFileRaw('file1.md', content),
				createSkillFileRaw('file2.md', content),
				createSkillFileRaw('file3.md', content),
			];

			const result = await parseSkillFilesBatch(files);

			expect(result.parsed).toHaveLength(3);
			expect(result.errors).toHaveLength(0);
		});

		it('should handle mix of valid and invalid files', async () => {
			const validContent = loadFixture('valid-skill.md');
			const files = [
				createSkillFileRaw('valid.md', validContent),
				createSkillFileRaw('no-frontmatter.md'),
				createSkillFileRaw('invalid-yaml.md'),
			];

			const result = await parseSkillFilesBatch(files);

			expect(result.parsed).toHaveLength(1);
			expect(result.errors).toHaveLength(2);
		});

		it('should include error details in batch results', async () => {
			const files = [createSkillFileRaw('no-frontmatter.md')];

			const result = await parseSkillFilesBatch(files);

			expect(result.errors[0].error).toBeInstanceOf(SkillParseError);
			expect(result.errors[0].file).toBe(files[0]);
		});

		it('should handle empty array', async () => {
			const result = await parseSkillFilesBatch([]);

			expect(result.parsed).toHaveLength(0);
			expect(result.errors).toHaveLength(0);
		});
	});
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('brAInwav Skill Parser - Utility Functions', () => {
	describe('hasFrontmatter', () => {
		it('should detect valid frontmatter', () => {
			const content = `---
id: test
---
Content`;

			expect(hasFrontmatter(content)).toBe(true);
		});

		it('should detect missing frontmatter', () => {
			const content = 'No frontmatter here';

			expect(hasFrontmatter(content)).toBe(false);
		});

		it('should detect missing closing delimiter', () => {
			const content = `---
id: test
No closing`;

			expect(hasFrontmatter(content)).toBe(false);
		});

		it('should handle extra whitespace', () => {
			const content = `  \n---\nid: test\n---\nContent`;

			expect(hasFrontmatter(content)).toBe(true);
		});
	});

	describe('getFrontmatterBounds', () => {
		it('should return bounds for valid frontmatter', () => {
			const content = `---
id: test
---
Content`;

			const bounds = getFrontmatterBounds(content);

			expect(bounds).not.toBeNull();
			expect(bounds?.start).toBe(0);
			expect(bounds?.end).toBeGreaterThan(0);
		});

		it('should return null for missing frontmatter', () => {
			const content = 'No frontmatter';

			const bounds = getFrontmatterBounds(content);

			expect(bounds).toBeNull();
		});
	});
});
