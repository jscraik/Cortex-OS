/**
 * Phase 4: Profile Command Tests
 */

import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { initProfile, setProfileValue, showProfile, validateProfile } from '../commands/profile.js';

const TEST_DIR = join(process.cwd(), 'test-temp-profile');
const PROFILE_PATH = 'enforcement-profile.yml';

describe('Profile Command', () => {
	beforeEach(async () => {
		await rm(TEST_DIR, { recursive: true, force: true });
		await mkdir(TEST_DIR, { recursive: true });
		process.chdir(TEST_DIR);
	});

	afterEach(async () => {
		process.chdir(join(TEST_DIR, '..'));
		await rm(TEST_DIR, { recursive: true, force: true });
	});

	describe('initProfile', () => {
		it('should create enforcement-profile.yml with brAInwav defaults', async () => {
			await initProfile();

			// Check file exists
			await expect(access(PROFILE_PATH)).resolves.toBeUndefined();

			// Check content
			const content = await readFile(PROFILE_PATH, 'utf-8');
			const profile = parse(content);

			expect(profile.branding).toBe('brAInwav');
			expect(profile.budgets.coverage.lines).toBe(95);
			expect(profile.budgets.security.maxCritical).toBe(0);
		});
	});

	describe('showProfile', () => {
		it('should display profile with brAInwav branding', async () => {
			await initProfile();

			// Capture console output
			const logs: string[] = [];
			const originalLog = console.log;
			console.log = (msg: string) => logs.push(msg);

			await showProfile();

			console.log = originalLog;

			const output = logs.join('\n');
			expect(output).toContain('brAInwav Cortex-OS Enforcement Profile');
			expect(output).toContain('Coverage Requirements');
			expect(output).toContain('Lines:      95%');
			expect(output).toContain('Security Policy');
			expect(output).toContain('Critical: 0');
		});
	});

	describe('setProfileValue', () => {
		it('should update coverage target', async () => {
			await initProfile();
			await setProfileValue('coverage.lines', '98');

			const content = await readFile(PROFILE_PATH, 'utf-8');
			const profile = parse(content);

			// The value should be stored in budgets.coverage.lines
			expect(profile.budgets.coverage.lines).toBe(98);
		});

		it('should maintain brAInwav branding after update', async () => {
			await initProfile();
			await setProfileValue('coverage.lines', '98');

			const content = await readFile(PROFILE_PATH, 'utf-8');
			const profile = parse(content);

			expect(profile.branding).toBe('brAInwav');
		});
	});

	describe('validateProfile', () => {
		it('should pass valid profile', async () => {
			await initProfile();

			const isValid = await validateProfile();
			expect(isValid).toBe(true);
		});

		it('should fail invalid profile', async () => {
			// Create invalid profile
			await writeFile(PROFILE_PATH, 'branding: Wrong\nversion: 1.0.0');

			const isValid = await validateProfile();
			expect(isValid).toBe(false);
		});

		it('should fail when branding is not brAInwav', async () => {
			await initProfile();

			// Corrupt the branding
			const content = await readFile(PROFILE_PATH, 'utf-8');
			const corrupted = content.replace('brAInwav', 'Other');
			await writeFile(PROFILE_PATH, corrupted);

			const isValid = await validateProfile();
			expect(isValid).toBe(false);
		});
	});
});
