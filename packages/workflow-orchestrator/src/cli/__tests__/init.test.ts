/**
 * Phase 4: CLI Command Tests
 * Following TDD: Tests verify implementation
 */

import { access, mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	generateBlueprint,
	generateConstitution,
	initWorkflow,
	toTaskId,
} from '../commands/init.js';

const TEST_DIR = join(process.cwd(), 'test-temp-cli');

describe('Init Command', () => {
	beforeEach(async () => {
		// Clean test directory
		await rm(TEST_DIR, { recursive: true, force: true });
		await mkdir(TEST_DIR, { recursive: true });
		process.chdir(TEST_DIR);
	});

	afterEach(async () => {
		process.chdir(join(TEST_DIR, '..'));
		await rm(TEST_DIR, { recursive: true, force: true });
	});

	describe('toTaskId', () => {
		it('should convert feature name to kebab-case', () => {
			expect(toTaskId('OAuth 2.1 Authentication')).toBe('oauth-2-1-authentication');
			expect(toTaskId('Test Feature')).toBe('test-feature');
			expect(toTaskId('Multiple   Spaces')).toBe('multiple-spaces');
		});

		it('should remove leading and trailing dashes', () => {
			expect(toTaskId('-Test-')).toBe('test');
			expect(toTaskId('--Multiple--')).toBe('multiple');
		});

		it('should handle special characters', () => {
			expect(toTaskId('Test@#$Feature')).toBe('test-feature');
			expect(toTaskId('Feature (New)')).toBe('feature-new');
		});
	});

	describe('generateBlueprint', () => {
		it('should create PRP blueprint with brAInwav branding', () => {
			const blueprint = generateBlueprint('Test Feature', 'P1');

			expect(blueprint).toContain('# PRP Blueprint: Test Feature');
			expect(blueprint).toContain('**Priority**: P1');
			expect(blueprint).toContain('brAInwav Production Standards');
			expect(blueprint).toContain('## G0: Ideation Gate');
			expect(blueprint).toContain('## Architecture Considerations (G1)');
			expect(blueprint).toContain('brAInwav Development Team');
		});

		it('should include task ID', () => {
			const blueprint = generateBlueprint('OAuth 2.1', 'P0');
			expect(blueprint).toContain('**Task ID**: `oauth-2-1`');
		});

		it('should include current date', () => {
			const blueprint = generateBlueprint('Test', 'P2');
			const today = new Date().toISOString().split('T')[0];
			expect(blueprint).toContain(`**Created**: ${today}`);
		});
	});

	describe('generateConstitution', () => {
		it('should create constitution with brAInwav standards', () => {
			const constitution = generateConstitution('Test Feature', 'test-feature');

			expect(constitution).toContain('# Task Constitution: Test Feature');
			expect(constitution).toContain('**Task ID**: `test-feature`');
			expect(constitution).toContain('brAInwav Standards');
			expect(constitution).toContain('Phase 0: Constitution');
			expect(constitution).toContain('functions ≤40 lines');
			expect(constitution).toContain('95%+ test coverage');
			expect(constitution).toContain('WCAG 2.2 AA');
			expect(constitution).toContain('zero-tolerance security policy');
		});
	});

	describe('initWorkflow', () => {
		it('should create task directory structure', async () => {
			await initWorkflow('Test Feature', 'P1');

			const taskDir = join(TEST_DIR, 'tasks', 'test-feature');

			// Check directory exists
			await expect(access(taskDir)).resolves.toBeUndefined();
		});

		it('should create PRP blueprint file', async () => {
			await initWorkflow('Test Feature', 'P1');

			const blueprintPath = join(TEST_DIR, 'tasks', 'test-feature', 'prp-blueprint.md');
			const content = await readFile(blueprintPath, 'utf-8');

			expect(content).toContain('PRP Blueprint: Test Feature');
			expect(content).toContain('brAInwav');
		});

		it('should create constitution file', async () => {
			await initWorkflow('Test Feature', 'P1');

			const constitutionPath = join(TEST_DIR, 'tasks', 'test-feature', 'constitution.md');
			const content = await readFile(constitutionPath, 'utf-8');

			expect(content).toContain('Task Constitution: Test Feature');
			expect(content).toContain('brAInwav Standards');
		});
	});
});
