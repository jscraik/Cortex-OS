import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Explicit .ts extension to ensure Vitest loads the TypeScript implementation (avoids legacy .mjs)
import { PolicyHotReloader } from './policy-hot-reloader-impl.ts';
import { waitFor } from './test-utils.js';

/**
 * Policy Hot-Reload Test Suite
 *
 * Tests runtime reloading of guard/policy configs without process restart.
 * Based on chokidar file watching pattern from model-gateway.
 */

describe('PolicyHotReloader', () => {
	let tempPolicyPath: string;
	// Implementation imported at top

	const mockInitialPolicy = {
		version: '1.0.0',
		allowedPaths: ['src/**/*'],
		allowedGlobs: ['**/*.ts', '**/*.js'],
		deniedGlobs: ['**/*.test.ts'],
		protectedFiles: ['package.json'],
	};

	const mockUpdatedPolicy = {
		version: '1.1.0',
		allowedPaths: ['src/**/*', 'lib/**/*'],
		allowedGlobs: ['**/*.ts', '**/*.js', '**/*.json'],
		deniedGlobs: ['**/*.test.ts', '**/*.spec.ts'],
		protectedFiles: ['package.json', 'tsconfig.json'],
	};

	beforeEach(async () => {
		// Create temp policy file for testing
		tempPolicyPath = path.join(process.cwd(), 'tmp', 'test-policy.json');
		await fs.mkdir(path.dirname(tempPolicyPath), { recursive: true });
		await fs.writeFile(tempPolicyPath, JSON.stringify(mockInitialPolicy, null, 2));
	});

	afterEach(async () => {
		try {
			await fs.rm(path.dirname(tempPolicyPath), { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
		vi.restoreAllMocks();
	});

	describe('TDD: Policy hot-reload without restart', () => {
		it('should reload policy.json at runtime when file changes', async () => {
			// This test will fail initially - we need to implement the hot-reload mechanism
			const reloader = new PolicyHotReloader(tempPolicyPath);

			// Start watching the policy file
			await reloader.startWatching();

			// Verify initial policy is loaded
			expect(reloader.getCurrentPolicy()).toEqual(mockInitialPolicy);

			// Update the policy file on disk
			await fs.writeFile(tempPolicyPath, JSON.stringify(mockUpdatedPolicy, null, 2));

			// Wait for file watcher to detect changes and reload
			await waitFor(() => {
				const current = reloader.getCurrentPolicy();
				return current.version === '1.1.0' && current.allowedPaths.includes('lib/**/*');
			}, 2000);

			// Verify policy was reloaded with new values
			const updatedPolicy = reloader.getCurrentPolicy();
			expect(updatedPolicy.version).toBe('1.1.0');
			expect(updatedPolicy.allowedPaths).toContain('lib/**/*');
			expect(updatedPolicy.allowedGlobs).toContain('**/*.json');
			expect(updatedPolicy.deniedGlobs).toContain('**/*.spec.ts');
			expect(updatedPolicy.protectedFiles).toContain('tsconfig.json');

			// Cleanup
			await reloader.stopWatching();
		});

		it('should emit policyReloaded event when policy changes', async () => {
			const reloader = new PolicyHotReloader(tempPolicyPath);
			const onPolicyReloaded = vi.fn();

			reloader.on('policyReloaded', onPolicyReloaded);
			await reloader.startWatching();

			// Update policy file
			await fs.writeFile(tempPolicyPath, JSON.stringify(mockUpdatedPolicy, null, 2));

			// Wait for reload event
			await waitFor(() => onPolicyReloaded.mock.calls.length > 0, 2000);

			// Verify event was emitted with new policy
			expect(onPolicyReloaded).toHaveBeenCalledWith(mockUpdatedPolicy);

			await reloader.stopWatching();
		});

		it('should validate policy schema on reload', async () => {
			const reloader = new PolicyHotReloader(tempPolicyPath);
			const onValidationError = vi.fn();

			reloader.on('validationError', onValidationError);
			await reloader.startWatching();

			// Write invalid policy (missing required fields)
			const invalidPolicy = { version: '1.0.0' }; // Missing required allowedPaths
			await fs.writeFile(tempPolicyPath, JSON.stringify(invalidPolicy, null, 2));

			// Wait for validation error
			await waitFor(() => onValidationError.mock.calls.length > 0, 2000);

			// Verify validation error was emitted
			expect(onValidationError).toHaveBeenCalled();

			// Verify policy wasn't updated (kept original)
			expect(reloader.getCurrentPolicy()).toEqual(mockInitialPolicy);

			await reloader.stopWatching();
		});

		it('should handle JSON syntax errors gracefully', async () => {
			const reloader = new PolicyHotReloader(tempPolicyPath);
			const onParseError = vi.fn();

			reloader.on('parseError', onParseError);
			await reloader.startWatching();

			// Write malformed JSON
			await fs.writeFile(tempPolicyPath, '{ version: "1.0.0" missing quotes }');

			// Wait for parse error
			await waitFor(() => onParseError.mock.calls.length > 0, 2000);

			// Verify parse error was emitted
			expect(onParseError).toHaveBeenCalled();

			// Verify policy wasn't updated (kept original)
			expect(reloader.getCurrentPolicy()).toEqual(mockInitialPolicy);

			await reloader.stopWatching();
		});

		it('should handle file deletion and recreation', async () => {
			const reloader = new PolicyHotReloader(tempPolicyPath);
			const onFileDeleted = vi.fn();
			const onPolicyReloaded = vi.fn();

			reloader.on('fileDeleted', onFileDeleted);
			reloader.on('policyReloaded', onPolicyReloaded);
			await reloader.startWatching();

			// Delete policy file
			await fs.rm(tempPolicyPath);

			// Wait for deletion event
			await waitFor(() => onFileDeleted.mock.calls.length > 0, 2000);
			expect(onFileDeleted).toHaveBeenCalled();

			// Recreate file with updated policy
			await fs.writeFile(tempPolicyPath, JSON.stringify(mockUpdatedPolicy, null, 2));

			// Wait for reload event
			await waitFor(() => onPolicyReloaded.mock.calls.length > 0, 2000);
			expect(onPolicyReloaded).toHaveBeenCalledWith(mockUpdatedPolicy);

			await reloader.stopWatching();
		});
	});
});
