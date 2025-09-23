#!/usr/bin/env node
/**
 * brAInwav Dependency Resolution Fix Script
 *
 * Automatically fixes missing package dependencies identified by the import scanner.
 * Adds missing workspace dependencies to package.json files.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

class BrainwavDependencyFixer {
	constructor() {
		this.fixedPackages = 0;
		this.addedDependencies = 0;

		// Missing dependencies identified by the scanner
		this.missingDependencies = {
			'@cortex-os/app': [
				'@cortex-os/utils',
				'@cortex-os/rag-embed',
				'@cortex-os/rag-store',
				'@cortex-os/simlab',
			],
			'cortex-webui-backend': ['@cortex-os/a2a-transport'],
			'@cortex-os/contracts': [
				'@cortex-os/a2a-contracts',
				'@cortex-os/asbr',
				'@cortex-os/evals',
				'@cortex-os/policy',
			],
			'@cortex-os/a2a-core': ['@cortex-os/telemetry'],
			'@cortex-os/a2a': ['@cortex-os/a2a-transport', '@cortex-os/utils'],
			'@cortex-os/a2a-services': [
				'@cortex-os/a2a-core',
				'@cortex-os/a2a',
				'@cortex-os/a2a-contracts',
			],
			'@cortex-os/agents': ['@cortex-os/model-gateway'],
			'@cortex-os/agui': ['@cortex-os/contracts'],
			'@cortex-os/memories': ['@cortex-os/rag'],
			'@cortex-os/model-gateway': ['@cortex-os/mcp-core'],
			'@cortex-os/mvp': ['@cortex-os/mvp-core', '@cortex-os/kernel', '@cortex-os/prp-runner'],
			'@cortex-os/mvp-core': ['@cortex-os/utils'],
			'@cortex-os/orchestration': ['@cortex-os/a2a-common', '@cortex-os/contracts'],
			'@cortex-os/service-model-gateway': ['@cortex-os/mcp-core'],
			'@cortex-os/service-orchestration': ['@cortex-os/utils'],
			'@modelcontextprotocol/servers': [
				'@cortex-os/a2a-core',
				'@cortex-os/a2a-transport',
				'@cortex-os/contracts',
			],
			'simple-tests': [
				'@cortex-os/a2a-contracts',
				'@cortex-os/kernel',
				'@cortex-os/a2a-core',
				'@cortex-os/utils',
				'@cortex-os/contracts',
				'@cortex-os/agents',
				'@cortex-os/mcp-core',
				'@cortex-os/a2a',
				'@cortex-os/observability',
				'@cortex-os/rag',
			],
		};
	}

	async findPackageJsonPath(packageName) {
		// Map package names to their package.json locations
		const packagePaths = {
			'@cortex-os/app': 'apps/cortex-os/package.json',
			'cortex-webui-backend': 'apps/cortex-webui/backend/package.json',
			'@cortex-os/contracts': 'libs/typescript/contracts/package.json',
			'@cortex-os/a2a-core': 'packages/a2a/a2a-core/package.json',
			'@cortex-os/a2a': 'packages/a2a/package.json',
			'@cortex-os/a2a-services': 'packages/a2a-services/package.json',
			'@cortex-os/agents': 'packages/agents/package.json',
			'@cortex-os/agui': 'packages/agui/package.json',
			'@cortex-os/memories': 'packages/memories/package.json',
			'@cortex-os/model-gateway': 'packages/model-gateway/package.json',
			'@cortex-os/mvp': 'packages/mvp/package.json',
			'@cortex-os/mvp-core': 'packages/mvp-core/package.json',
			'@cortex-os/orchestration': 'packages/orchestration/package.json',
			'@cortex-os/service-model-gateway': 'services/model-gateway/package.json',
			'@cortex-os/service-orchestration': 'services/orchestration/package.json',
			'@modelcontextprotocol/servers': 'servers/mcp/package.json',
			'simple-tests': 'simple-tests/package.json',
		};

		return packagePaths[packageName];
	}

	async fixPackageDependencies(packageName, missingDeps) {
		const packagePath = await this.findPackageJsonPath(packageName);
		if (!packagePath) {
			console.warn(`⚠️  Could not find package.json for ${packageName}`);
			return;
		}

		const fullPath = join(workspaceRoot, packagePath);

		try {
			// Read current package.json
			const content = await readFile(fullPath, 'utf8');
			const pkg = JSON.parse(content);

			// Initialize dependencies if not present
			if (!pkg.dependencies) {
				pkg.dependencies = {};
			}

			let addedCount = 0;

			// Add missing dependencies
			for (const dep of missingDeps) {
				if (!pkg.dependencies[dep] && !pkg.devDependencies?.[dep]) {
					pkg.dependencies[dep] = 'workspace:*';
					addedCount++;
					console.log(`✅ Added ${dep} to ${packageName}`);
				}
			}

			if (addedCount > 0) {
				// Sort dependencies for consistent formatting
				const sortedDeps = {};
				Object.keys(pkg.dependencies)
					.sort()
					.forEach((key) => {
						sortedDeps[key] = pkg.dependencies[key];
					});
				pkg.dependencies = sortedDeps;

				// Write back to file with proper formatting
				const updatedContent = `${JSON.stringify(pkg, null, 2)}\\n`;
				await writeFile(fullPath, updatedContent, 'utf8');

				this.fixedPackages++;
				this.addedDependencies += addedCount;

				console.log(`📦 Updated ${packageName} - added ${addedCount} dependencies`);
			} else {
				console.log(`✓ ${packageName} - all dependencies already present`);
			}
		} catch (error) {
			console.error(`❌ Failed to fix ${packageName}: ${error.message}`);
		}
	}

	async fixAllDependencies() {
		console.log('🔧 brAInwav Dependency Resolution Fix Starting...\\n');

		console.log('📋 Missing dependencies to fix:');
		for (const [pkg, deps] of Object.entries(this.missingDependencies)) {
			console.log(`  ${pkg}: ${deps.length} missing dependencies`);
		}
		console.log('');

		// Fix dependencies for each package
		for (const [packageName, missingDeps] of Object.entries(this.missingDependencies)) {
			await this.fixPackageDependencies(packageName, missingDeps);
		}

		// Print summary
		this.printSummary();
	}

	printSummary() {
		console.log('\\n📊 brAInwav Dependency Fix Summary');
		console.log('='.repeat(60));
		console.log(`📦 Packages fixed: ${this.fixedPackages}`);
		console.log(`➕ Dependencies added: ${this.addedDependencies}`);

		if (this.addedDependencies > 0) {
			console.log('\\n✅ brAInwav Dependency Resolution: SUCCESS');
			console.log('🎯 All missing workspace dependencies have been added');
			console.log('');
			console.log('🔄 Next steps:');
			console.log('1. Run `pnpm install` to install new dependencies');
			console.log('2. Run import violation scanner again to verify fixes');
			console.log('3. Test package builds to ensure resolution works');
		} else {
			console.log('\\n✅ brAInwav Dependency Resolution: COMPLETE');
			console.log('📋 All dependencies were already present');
		}
	}
}

// Run fixer if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const fixer = new BrainwavDependencyFixer();
	await fixer.fixAllDependencies();
}

export default BrainwavDependencyFixer;
