/**
 * brAInwav Skill Loader Tests
 * Comprehensive test coverage for skill file system operations
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/__tests__/skill-loader.test
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Skill } from '../types.js';
import {
	type LoaderResult,
	type SkillLoaderOptions,
	loadSkill,
	loadSkillsFromDirectory,
	scanDirectory,
} from '../loaders/skill-loader.js';

// ============================================================================
// Test Setup
// ============================================================================

const TEST_DIR = join(__dirname, '__test_skills__');

function setupTestDirectory(): void {
	if (existsSync(TEST_DIR)) {
		rmSync(TEST_DIR, { recursive: true, force: true });
	}
	mkdirSync(TEST_DIR, { recursive: true });
}

function cleanupTestDirectory(): void {
	if (existsSync(TEST_DIR)) {
		rmSync(TEST_DIR, { recursive: true, force: true });
	}
}

function createTestSkillFile(
	filename: string,
	content: string,
	subdir?: string,
): string {
	const dir = subdir ? join(TEST_DIR, subdir) : TEST_DIR;
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	const filePath = join(dir, filename);
	writeFileSync(filePath, content, 'utf-8');
	return filePath;
}

function createValidSkillContent(id: string, name: string): string {
	return `---
id: ${id}
name: ${name}
description: A test skill for loader validation
version: 1.0.0
author: brAInwav Test Team
category: testing
tags:
  - test
  - loader
difficulty: beginner
estimatedTokens: 200
createdAt: ${new Date().toISOString()}
updatedAt: ${new Date().toISOString()}
deprecated: false
successCriteria:
  - Tests pass
  - Loader works correctly
---

# ${name}

This is a test skill for validating the skill loader functionality.

## Features
- File system scanning
- Validation integration
- Caching support
`;
}

// ============================================================================
// Directory Scanning Tests (TASK-018)
// ============================================================================

describe('Skill Loader - Directory Scanning', () => {
	beforeEach(() => {
		setupTestDirectory();
	});

	afterEach(() => {
		cleanupTestDirectory();
	});

	it('should scan directory and find .md files', async () => {
		createTestSkillFile('skill1.md', createValidSkillContent('skill-test-1', 'Test 1'));
		createTestSkillFile('skill2.md', createValidSkillContent('skill-test-2', 'Test 2'));
		createTestSkillFile('readme.txt', 'Not a skill file');

		const files = await scanDirectory(TEST_DIR);

		expect(files).toHaveLength(2);
		expect(files.every((f) => f.endsWith('.md'))).toBe(true);
	});

	it('should recursively scan subdirectories', async () => {
		createTestSkillFile('skill1.md', createValidSkillContent('skill-test-1', 'Test 1'));
		createTestSkillFile(
			'skill2.md',
			createValidSkillContent('skill-test-2', 'Test 2'),
			'subdir',
		);
		createTestSkillFile(
			'skill3.md',
			createValidSkillContent('skill-test-3', 'Test 3'),
			'subdir/nested',
		);

		const files = await scanDirectory(TEST_DIR);

		expect(files).toHaveLength(3);
		expect(files.some((f) => f.includes('subdir'))).toBe(true);
		expect(files.some((f) => f.includes('nested'))).toBe(true);
	});

	it('should skip hidden files and directories', async () => {
		createTestSkillFile('skill1.md', createValidSkillContent('skill-test-1', 'Test 1'));
		createTestSkillFile(
			'skill2.md',
			createValidSkillContent('skill-test-2', 'Test 2'),
			'.hidden',
		);

		const files = await scanDirectory(TEST_DIR);

		expect(files).toHaveLength(1);
		expect(files[0]).not.toContain('.hidden');
	});

	it('should handle empty directories gracefully', async () => {
		const files = await scanDirectory(TEST_DIR);

		expect(files).toHaveLength(0);
	});

	it('should handle non-existent directories', async () => {
		await expect(scanDirectory('/nonexistent/directory')).rejects.toThrow();
	});

	it('should filter only .md files', async () => {
		createTestSkillFile('skill.md', createValidSkillContent('skill-test', 'Test'));
		createTestSkillFile('readme.txt', 'text file');
		createTestSkillFile('config.json', '{}');
		createTestSkillFile('script.js', 'console.log("test")');

		const files = await scanDirectory(TEST_DIR);

		expect(files).toHaveLength(1);
		expect(files[0]).toContain('skill.md');
	});

	it('should perform scan in less than 100ms for 100 files', async () => {
		// Create 100 test skill files
		for (let i = 0; i < 100; i++) {
			createTestSkillFile(
				`skill${i}.md`,
				createValidSkillContent(`skill-test-${i}`, `Test ${i}`),
			);
		}

		const start = performance.now();
		const files = await scanDirectory(TEST_DIR);
		const duration = performance.now() - start;

		expect(files).toHaveLength(100);
		expect(duration).toBeLessThan(100);
	});
});

// ============================================================================
// File Loading Tests (TASK-019)
// ============================================================================

describe('Skill Loader - File Loading', () => {
	beforeEach(() => {
		setupTestDirectory();
	});

	afterEach(() => {
		cleanupTestDirectory();
	});

	it('should load and parse valid skill file', async () => {
		const filePath = createTestSkillFile(
			'skill.md',
			createValidSkillContent('skill-test', 'Test Skill'),
		);

		const result = await loadSkill(filePath);

		expect(result.success).toBe(true);
		expect(result.skill).toBeDefined();
		expect(result.skill?.id).toBe('skill-test');
		expect(result.skill?.name).toBe('Test Skill');
	});

	it('should validate skill content', async () => {
		const invalidContent = `---
id: invalid-id
name: X
description: Short
---
Too short`;
		const filePath = createTestSkillFile('invalid.md', invalidContent);

		const result = await loadSkill(filePath);

		expect(result.success).toBe(false);
		expect(result.errors).toBeDefined();
		expect(result.errors!.length).toBeGreaterThan(0);
	});

	it('should check file size before loading', async () => {
		const largeContent =
			createValidSkillContent('skill-large', 'Large') + 'x'.repeat(2 * 1024 * 1024);
		const filePath = createTestSkillFile('large.md', largeContent);

		const result = await loadSkill(filePath);

		expect(result.success).toBe(false);
		expect(result.errors?.some((e) => e.includes('size'))).toBe(true);
	});

	it('should skip hidden files', async () => {
		createTestSkillFile(
			'.hidden.md',
			createValidSkillContent('skill-hidden', 'Hidden'),
		);

		const files = await scanDirectory(TEST_DIR);

		expect(files).toHaveLength(0);
	});

	it('should collect validation errors', async () => {
		const invalidContent = `---
id: bad
name: Bad Skill
description: Missing required fields
---
Content`;
		const filePath = createTestSkillFile('bad.md', invalidContent);

		const result = await loadSkill(filePath);

		expect(result.success).toBe(false);
		expect(result.errors).toBeDefined();
		expect(result.filePath).toBe(filePath);
	});

	it('should load multiple skills from directory', async () => {
		createTestSkillFile('skill1.md', createValidSkillContent('skill-1', 'Skill 1'));
		createTestSkillFile('skill2.md', createValidSkillContent('skill-2', 'Skill 2'));
		createTestSkillFile('skill3.md', createValidSkillContent('skill-3', 'Skill 3'));

		const results = await loadSkillsFromDirectory(TEST_DIR);

		expect(results.loaded).toHaveLength(3);
		expect(results.failed).toHaveLength(0);
		expect(results.total).toBe(3);
	});

	it('should separate successful and failed loads', async () => {
		createTestSkillFile('valid.md', createValidSkillContent('skill-valid', 'Valid'));
		createTestSkillFile('invalid.md', 'Invalid content without frontmatter');

		const results = await loadSkillsFromDirectory(TEST_DIR);

		expect(results.loaded.length).toBe(1);
		expect(results.failed.length).toBe(1);
		expect(results.total).toBe(2);
	});

	it('should handle file system errors gracefully', async () => {
		const result = await loadSkill('/nonexistent/file.md');

		expect(result.success).toBe(false);
		expect(result.errors).toBeDefined();
	});
});

// ============================================================================
// Caching Tests (TASK-020)
// ============================================================================

describe('Skill Loader - Caching', () => {
	beforeEach(() => {
		setupTestDirectory();
	});

	afterEach(() => {
		cleanupTestDirectory();
	});

	it('should cache loaded skills', async () => {
		const filePath = createTestSkillFile(
			'skill.md',
			createValidSkillContent('skill-cached', 'Cached'),
		);

		const options: SkillLoaderOptions = { useCache: true };

		// First load
		const result1 = await loadSkill(filePath, options);
		const time1 = performance.now();

		// Second load (should be cached)
		const result2 = await loadSkill(filePath, options);
		const time2 = performance.now();

		expect(result1.success).toBe(true);
		expect(result2.success).toBe(true);
		expect(result2.fromCache).toBe(true);

		// Cached load should be faster (though timing is not guaranteed)
		expect(result2.skill).toEqual(result1.skill);
	});

	it('should invalidate cache on file modification', async () => {
		const filePath = createTestSkillFile(
			'skill.md',
			createValidSkillContent('skill-modified', 'Original'),
		);

		const options: SkillLoaderOptions = { useCache: true };

		// Load once
		await loadSkill(filePath, options);

		// Modify file
		writeFileSync(
			filePath,
			createValidSkillContent('skill-modified', 'Modified'),
			'utf-8',
		);

		// Load again
		const result = await loadSkill(filePath, options);

		expect(result.fromCache).toBe(false);
		expect(result.skill?.name).toBe('Modified');
	});

	it('should respect cache size limits', async () => {
		const options: SkillLoaderOptions = {
			useCache: true,
			cacheMaxSize: 2,
		};

		// Load 3 skills with cache size limit of 2
		const file1 = createTestSkillFile(
			'skill1.md',
			createValidSkillContent('skill-1', 'Skill 1'),
		);
		const file2 = createTestSkillFile(
			'skill2.md',
			createValidSkillContent('skill-2', 'Skill 2'),
		);
		const file3 = createTestSkillFile(
			'skill3.md',
			createValidSkillContent('skill-3', 'Skill 3'),
		);

		await loadSkill(file1, options);
		await loadSkill(file2, options);
		await loadSkill(file3, options);

		// First file should have been evicted (LRU)
		const result1 = await loadSkill(file1, options);
		expect(result1.fromCache).toBe(false);

		// Most recent files should still be cached
		const result3 = await loadSkill(file3, options);
		expect(result3.fromCache).toBe(true);
	});

	it('should provide cache statistics', async () => {
		const file1 = createTestSkillFile(
			'skill1.md',
			createValidSkillContent('skill-1', 'Skill 1'),
		);
		const options: SkillLoaderOptions = { useCache: true };

		await loadSkill(file1, options);
		await loadSkill(file1, options); // Cache hit

		const results = await loadSkillsFromDirectory(TEST_DIR, options);

		expect(results.cacheStats).toBeDefined();
		expect(results.cacheStats?.hits).toBeGreaterThan(0);
	});

	it('should allow cache bypass', async () => {
		const filePath = createTestSkillFile(
			'skill.md',
			createValidSkillContent('skill-nocache', 'No Cache'),
		);

		const cachedOptions: SkillLoaderOptions = { useCache: true };
		const noCacheOptions: SkillLoaderOptions = { useCache: false };

		await loadSkill(filePath, cachedOptions);
		const result = await loadSkill(filePath, noCacheOptions);

		expect(result.fromCache).toBe(false);
	});

	it('should cache 100 skills efficiently', async () => {
		const options: SkillLoaderOptions = {
			useCache: true,
			cacheMaxSize: 1000,
		};

		// Create 100 skill files
		for (let i = 0; i < 100; i++) {
			createTestSkillFile(
				`skill${i}.md`,
				createValidSkillContent(`skill-${i}`, `Skill ${i}`),
			);
		}

		// First load
		const start1 = performance.now();
		await loadSkillsFromDirectory(TEST_DIR, options);
		const duration1 = performance.now() - start1;

		// Second load (cached)
		const start2 = performance.now();
		const results = await loadSkillsFromDirectory(TEST_DIR, options);
		const duration2 = performance.now() - start2;

		expect(results.loaded).toHaveLength(100);
		expect(duration2).toBeLessThan(duration1 / 2); // Cached should be 2x faster
	});
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Skill Loader - Integration', () => {
	beforeEach(() => {
		setupTestDirectory();
	});

	afterEach(() => {
		cleanupTestDirectory();
	});

	it('should load, validate, and cache skills end-to-end', async () => {
		createTestSkillFile('skill1.md', createValidSkillContent('skill-1', 'Skill 1'));
		createTestSkillFile('skill2.md', createValidSkillContent('skill-2', 'Skill 2'));
		createTestSkillFile('invalid.md', 'Invalid content');

		const options: SkillLoaderOptions = {
			useCache: true,
			validateSecurity: true,
			validateEthics: true,
		};

		const results = await loadSkillsFromDirectory(TEST_DIR, options);

		expect(results.loaded).toHaveLength(2);
		expect(results.failed).toHaveLength(1);
		expect(results.total).toBe(3);
		expect(results.cacheStats).toBeDefined();
	});

	it('should handle mixed valid and invalid skills', async () => {
		// Valid skills
		createTestSkillFile('valid1.md', createValidSkillContent('skill-v1', 'Valid 1'));
		createTestSkillFile('valid2.md', createValidSkillContent('skill-v2', 'Valid 2'));

		// Invalid skills
		createTestSkillFile('invalid1.md', 'No frontmatter');
		createTestSkillFile('invalid2.md', '---\nid: bad\n---\nShort');

		const results = await loadSkillsFromDirectory(TEST_DIR);

		expect(results.loaded.length).toBe(2);
		expect(results.failed.length).toBe(2);
		expect(results.successRate).toBe(0.5);
	});
});
