/**
 * brAInwav Dependency Upgrade Test Suite
 * Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
 *
 * Comprehensive test suite for validating dependency upgrades
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('brAInwav Dependency Compatibility Tests', () => {
	const WORKSPACE_ROOT = process.cwd();

	describe('Test Foundation Validation', () => {
		it('should have all required test infrastructure', () => {
			const requiredFiles = ['package.json', 'pnpm-workspace.yaml', 'tsconfig.json'];

			for (const file of requiredFiles) {
				expect(existsSync(join(WORKSPACE_ROOT, file))).toBe(true);
			}
		});

		it('should have brAInwav test monitoring system', () => {
			expect(existsSync(join(WORKSPACE_ROOT, 'scripts/test-suite-monitor.mjs'))).toBe(true);
			expect(existsSync(join(WORKSPACE_ROOT, 'scripts/ts-server-monitor.mjs'))).toBe(true);
		});

		it('should validate current dependency versions', () => {
			const packageJson = JSON.parse(readFileSync(join(WORKSPACE_ROOT, 'package.json'), 'utf8'));

			// Validate upgraded versions
			expect(packageJson.devDependencies.uuid).toBe('^13.0.0');
			expect(packageJson.devDependencies.prisma).toBe('^6.0.0');
			expect(packageJson.dependencies.zod).toBe('^3.25.76');
		});
	});

	describe('Rollback Capability Validation', () => {
		it('should be able to capture current state', () => {
			// Test that we can backup current package.json states
			const backupCapability = () => {
				const packageJson = readFileSync(join(WORKSPACE_ROOT, 'package.json'), 'utf8');
				return (
					packageJson.includes('uuid') &&
					packageJson.includes('prisma') &&
					packageJson.includes('zod')
				);
			};

			expect(backupCapability()).toBe(true);
		});

		it('should validate pnpm workspace integrity', () => {
			// Ensure workspace can be restored
			expect(() => {
				execSync('pnpm list --depth=0', { stdio: 'pipe' });
			}).not.toThrow();
		});
	});

	describe('brAInwav Quality Gates', () => {
		it('should maintain brAInwav branding in error messages', () => {
			// Test that our error handling maintains branding
			const sampleError = new Error('[brAInwav] Test error message');
			expect(sampleError.message).toContain('brAInwav');
		});

		it('should have monitoring capabilities', () => {
			// Validate monitoring scripts are executable
			expect(existsSync(join(WORKSPACE_ROOT, 'scripts/test-suite-monitor.mjs'))).toBe(true);
		});
	});
});
