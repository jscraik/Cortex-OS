#!/usr/bin/env node
/**
 * brAInwav Dependency Upgrade Manager
 * Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
 *
 * Orchestrates the TDD-driven dependency upgrade process
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const WORKSPACE_ROOT = process.cwd();
const REPORTS_DIR = join(WORKSPACE_ROOT, 'reports');
const BACKUP_DIR = join(WORKSPACE_ROOT, 'backups');

class DependencyUpgradeManager {
	constructor() {
		this.ensureDirectories();
		this.currentPhase = this.detectCurrentPhase();
	}

	ensureDirectories() {
		[REPORTS_DIR, BACKUP_DIR].forEach((dir) => {
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
		});
	}

	detectCurrentPhase() {
		// Determine current phase based on system state
		const packageJson = this.readPackageJson();

		if (packageJson.devDependencies.uuid === '9.0.1') {
			return 'phase-0'; // Foundation
		} else if (packageJson.devDependencies.uuid.startsWith('13.')) {
			return 'phase-1-complete';
		}

		return 'phase-0';
	}

	readPackageJson() {
		return JSON.parse(readFileSync(join(WORKSPACE_ROOT, 'package.json'), 'utf8'));
	}

	async checkTestSuiteStatus() {
		console.log('🔍 [brAInwav] Checking test suite status...');

		try {
			const output = execSync('pnpm test:monitor', { encoding: 'utf8' });
			return output.includes('READY');
		} catch (error) {
			console.log('⚠️ [brAInwav] Test suite not ready for upgrades');
			return false;
		}
	}

	createBackup(phase) {
		console.log(`💾 [brAInwav] Creating backup for ${phase}...`);

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupFile = join(BACKUP_DIR, `${phase}-${timestamp}.json`);

		const packageJson = this.readPackageJson();
		const backup = {
			timestamp,
			phase,
			packageJson,
			nodeVersion: process.version,
			npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
		};

		writeFileSync(backupFile, JSON.stringify(backup, null, 2));
		console.log(`✅ [brAInwav] Backup created: ${backupFile}`);

		return backupFile;
	}

	async runPhaseTests(phase) {
		console.log(`🧪 [brAInwav] Running tests for ${phase}...`);

		const testCommands = {
			'phase-0': 'pnpm vitest run tests/dependencies/foundation.test.ts',
			'phase-1': 'pnpm vitest run tests/dependencies/uuid-upgrade.test.ts',
			'phase-2': 'pnpm vitest run tests/dependencies/prisma-upgrade.test.ts',
			'phase-3': 'pnpm vitest run tests/dependencies/zod-upgrade.test.ts',
			'phase-4': 'pnpm vitest run tests/dependencies/openai-upgrade.test.ts',
		};

		try {
			const command = testCommands[phase];
			if (command) {
				execSync(command, { stdio: 'inherit' });
				console.log(`✅ [brAInwav] ${phase} tests passed`);
				return true;
			}
		} catch (error) {
			console.error(`❌ [brAInwav] ${phase} tests failed:`, error.message);
			return false;
		}

		return false;
	}

	async executePhase0() {
		console.log('🚀 [brAInwav] Executing Phase 0: Test Foundation & Preparation');

		// Check if test suite is ready
		const isReady = await this.checkTestSuiteStatus();
		if (!isReady) {
			console.log('⏳ [brAInwav] Test suite stabilization required before proceeding');
			console.log('📋 [brAInwav] Run: pnpm test:monitor to check status');
			return false;
		}

		// Create backup
		this.createBackup('phase-0');

		// Run foundation tests
		const testsPass = await this.runPhaseTests('phase-0');
		if (!testsPass) {
			console.error('❌ [brAInwav] Phase 0 tests failed - cannot proceed');
			return false;
		}

		console.log('✅ [brAInwav] Phase 0 completed successfully');
		return true;
	}

	async executePhase1() {
		console.log('🚀 [brAInwav] Executing Phase 1: UUID 13.x Upgrade');

		// Create backup
		this.createBackup('phase-1');

		// Run pre-upgrade tests
		const preTestsPass = await this.runPhaseTests('phase-1');
		if (!preTestsPass) {
			console.error('❌ [brAInwav] Phase 1 pre-tests failed');
			return false;
		}

		// Execute UUID upgrade
		console.log('📦 [brAInwav] Upgrading UUID to 13.x...');
		try {
			// Update package.json files
			const packagePaths = [
				'package.json',
				'packages/a2a/package.json',
				'packages/asbr/package.json',
				'packages/orchestration/package.json',
			];

			for (const path of packagePaths) {
				const fullPath = join(WORKSPACE_ROOT, path);
				if (existsSync(fullPath)) {
					const packageContent = readFileSync(fullPath, 'utf8');
					const updatedContent = packageContent.replace(
						/"uuid":\s*"9\.0\.1"/g,
						'"uuid": "^13.0.0"',
					);

					if (updatedContent !== packageContent) {
						writeFileSync(fullPath, updatedContent);
						console.log(`✅ [brAInwav] Updated UUID version in ${path}`);
					}
				}
			}

			// Install new version
			execSync('pnpm install', { stdio: 'inherit' });

			// Run post-upgrade tests
			const postTestsPass = await this.runPhaseTests('phase-1');
			if (!postTestsPass) {
				console.error('❌ [brAInwav] Phase 1 post-tests failed - rolling back');
				await this.rollback('phase-1');
				return false;
			}

			console.log('✅ [brAInwav] Phase 1 completed successfully');
			return true;
		} catch (error) {
			console.error('❌ [brAInwav] UUID upgrade failed:', error.message);
			await this.rollback('phase-1');
			return false;
		}
	}

	async rollback(phase) {
		console.log(`🔄 [brAInwav] Rolling back ${phase}...`);

		try {
			// Find latest backup for this phase
			const backupFiles = execSync(`find ${BACKUP_DIR} -name "${phase}-*.json"`, {
				encoding: 'utf8',
			})
				.trim()
				.split('\n')
				.filter((f) => f)
				.sort()
				.reverse();

			if (backupFiles.length === 0) {
				throw new Error(`No backup found for ${phase}`);
			}

			const latestBackup = backupFiles[0];
			const backup = JSON.parse(readFileSync(latestBackup, 'utf8'));

			// Restore package.json
			writeFileSync(
				join(WORKSPACE_ROOT, 'package.json'),
				JSON.stringify(backup.packageJson, null, 2),
			);

			// Reinstall dependencies
			execSync('pnpm install', { stdio: 'inherit' });

			console.log(`✅ [brAInwav] Successfully rolled back to ${backup.timestamp}`);
		} catch (error) {
			console.error(`❌ [brAInwav] Rollback failed:`, error.message);
			throw error;
		}
	}

	async executeUpgrade(phase = null) {
		console.log('🎯 [brAInwav] Dependency Upgrade Manager Starting');
		console.log('==============================================');

		if (!phase) {
			phase = this.currentPhase;
		}

		try {
			switch (phase) {
				case 'phase-0':
					return await this.executePhase0();
				case 'phase-1':
					return await this.executePhase1();
				case 'phase-2':
					console.log('⏳ [brAInwav] Phase 2 (Prisma) not yet implemented');
					return false;
				case 'phase-3':
					console.log('⏳ [brAInwav] Phase 3 (Zod) not yet implemented');
					return false;
				case 'phase-4':
					console.log('⏳ [brAInwav] Phase 4 (OpenAI) not yet implemented');
					return false;
				default:
					console.log(`❓ [brAInwav] Unknown phase: ${phase}`);
					return false;
			}
		} catch (error) {
			console.error(`❌ [brAInwav] Upgrade manager error:`, error.message);
			return false;
		}
	}

	showStatus() {
		console.log('📊 [brAInwav] Dependency Upgrade Status');
		console.log('=====================================');
		console.log(`Current Phase: ${this.currentPhase}`);

		const packageJson = this.readPackageJson();
		console.log('\n📦 Current Versions:');
		console.log(`  UUID: ${packageJson.devDependencies.uuid || 'not found'}`);
		console.log(`  Prisma: ${packageJson.devDependencies.prisma || 'not found'}`);
		console.log(`  Zod: ${packageJson.dependencies.zod || 'not found'}`);
		console.log(`  OpenAI: ${packageJson.dependencies.openai || 'not found'}`);

		console.log('\n🎯 Next Actions:');
		if (this.currentPhase === 'phase-0') {
			console.log('  1. Run: pnpm test:monitor (ensure green baseline)');
			console.log('  2. Run: pnpm deps:upgrade:start (begin Phase 0)');
		} else {
			console.log(`  Continue with ${this.currentPhase} implementation`);
		}
	}
}

// CLI Interface
const command = process.argv[2];
const manager = new DependencyUpgradeManager();

switch (command) {
	case 'status':
		manager.showStatus();
		break;
	case 'start': {
		const phase = process.argv[3];
		manager.executeUpgrade(phase).then((success) => {
			process.exit(success ? 0 : 1);
		});
		break;
	}
	case 'rollback': {
		const rollbackPhase = process.argv[3];
		if (!rollbackPhase) {
			console.error('❌ [brAInwav] Please specify phase to rollback');
			process.exit(1);
		}
		manager
			.rollback(rollbackPhase)
			.then(() => {
				process.exit(0);
			})
			.catch(() => {
				process.exit(1);
			});
		break;
	}
	default:
		console.log('🎯 [brAInwav] Dependency Upgrade Manager');
		console.log('Usage:');
		console.log('  node dependency-upgrade-manager.mjs status');
		console.log('  node dependency-upgrade-manager.mjs start [phase]');
		console.log('  node dependency-upgrade-manager.mjs rollback <phase>');
		break;
}

export { DependencyUpgradeManager };
