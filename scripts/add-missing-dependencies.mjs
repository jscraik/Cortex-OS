#!/usr/bin/env node
/**
 * brAInwav Missing Dependencies Addition Script
 * 
 * Adds missing workspace dependencies identified by import scanner.
 * Only adds dependencies for packages that actually exist in the workspace.
 * 
 * Co-authored-by: brAInwav Development Team
 */

import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

class BrainwavMissingDependencyAdder {
    constructor() {
        this.actualPackages = new Set();
        this.updatedPackages = 0;
        this.addedDependencies = 0;

        // Missing dependencies from import scanner - filtered to only existing packages
        this.missingDependencies = {
            "@cortex-os/app": [
                "@cortex-os/utils",
                "@cortex-os/simlab"
            ],
            "cortex-webui-backend": [
                "@cortex-os/a2a-transport"
            ],
            "@cortex-os/contracts": [
                "@cortex-os/a2a-contracts",
                "@cortex-os/asbr",
                "@cortex-os/evals",
                "@cortex-os/policy"
            ],
            "@cortex-os/a2a-core": [
                "@cortex-os/telemetry"
            ],
            "@cortex-os/a2a": [
                "@cortex-os/a2a-transport",
                "@cortex-os/utils"
            ],
            "@cortex-os/a2a-services": [
                "@cortex-os/a2a-core",
                "@cortex-os/a2a",
                "@cortex-os/a2a-contracts"
            ],
            "@cortex-os/agents": [
                "@cortex-os/model-gateway"
            ],
            "@cortex-os/agui": [
                "@cortex-os/contracts"
            ],
            "@cortex-os/memories": [
                "@cortex-os/rag"
            ],
            "@cortex-os/model-gateway": [
                "@cortex-os/mcp-core"
            ],
            "@cortex-os/mvp": [
                "@cortex-os/mvp-core",
                "@cortex-os/kernel",
                "@cortex-os/prp-runner"
            ],
            "@cortex-os/mvp-core": [
                "@cortex-os/utils"
            ],
            "@cortex-os/orchestration": [
                "@cortex-os/a2a-common",
                "@cortex-os/contracts"
            ],
            "@cortex-os/service-model-gateway": [
                "@cortex-os/mcp-core"
            ],
            "@cortex-os/service-orchestration": [
                "@cortex-os/utils"
            ]
        };
    }

    async findActualPackages() {
        console.log('🔍 Discovering actual workspace packages...');

        const packageFiles = await this.findPackageFiles();

        for (const pkgFile of packageFiles) {
            try {
                const content = await readFile(pkgFile, 'utf8');
                const pkg = JSON.parse(content);

                if (pkg.name && pkg.name.startsWith('@cortex-os/')) {
                    this.actualPackages.add(pkg.name);
                }
            } catch (error) {
                console.warn(`⚠️  Failed to parse ${pkgFile}: ${error.message}`);
            }
        }

        console.log(`📦 Found ${this.actualPackages.size} actual @cortex-os packages`);
    }

    async findPackageFiles(dir = workspaceRoot, packageFiles = []) {
        const entries = await readdir(dir);

        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stats = await stat(fullPath);

            if (stats.isDirectory()) {
                if (!['node_modules', 'dist', '.nx', '.git'].includes(entry)) {
                    await this.findPackageFiles(fullPath, packageFiles);
                }
            } else if (entry === 'package.json') {
                packageFiles.push(fullPath);
            }
        }

        return packageFiles;
    }

    async findPackageJsonPath(packageName) {
        // Try to find the package.json file for a given package name
        const packageFiles = await this.findPackageFiles();

        for (const pkgFile of packageFiles) {
            try {
                const content = await readFile(pkgFile, 'utf8');
                const pkg = JSON.parse(content);

                if (pkg.name === packageName) {
                    return pkgFile;
                }
            } catch (error) {
                // Skip files that can't be parsed
            }
        }

        return null;
    }

    async addMissingDependencies(packageName, missingDeps) {
        const packagePath = await this.findPackageJsonPath(packageName);
        if (!packagePath) {
            console.warn(`⚠️  Could not find package.json for ${packageName}`);
            return;
        }

        try {
            const content = await readFile(packagePath, 'utf8');
            const pkg = JSON.parse(content);

            // Initialize dependencies if not present
            if (!pkg.dependencies) {
                pkg.dependencies = {};
            }

            let addedCount = 0;

            // Add missing dependencies (only if they exist in workspace)
            for (const dep of missingDeps) {
                if (this.actualPackages.has(dep)) {
                    if (!pkg.dependencies[dep] && !pkg.devDependencies?.[dep]) {
                        pkg.dependencies[dep] = "workspace:*";
                        addedCount++;
                        console.log(`✅ Added ${dep} to ${packageName}`);
                    }
                } else {
                    console.log(`⚠️  Skipping non-existent dependency ${dep} for ${packageName}`);
                }
            }

            if (addedCount > 0) {
                // Sort dependencies for consistent formatting
                const sortedDeps = {};
                Object.keys(pkg.dependencies).sort().forEach(key => {
                    sortedDeps[key] = pkg.dependencies[key];
                });
                pkg.dependencies = sortedDeps;

                // Write back to file with proper formatting
                const updatedContent = JSON.stringify(pkg, null, 2) + '\\n';
                await writeFile(packagePath, updatedContent, 'utf8');

                this.updatedPackages++;
                this.addedDependencies += addedCount;

                console.log(`📦 Updated ${packageName} - added ${addedCount} dependencies`);
            } else {
                console.log(`✓ ${packageName} - all dependencies already present or non-existent`);
            }

        } catch (error) {
            console.error(`❌ Failed to update ${packageName}: ${error.message}`);
        }
    }

    async addAllMissingDependencies() {
        console.log('🔧 brAInwav Missing Dependencies Addition Starting...\\n');

        // First, discover what packages actually exist
        await this.findActualPackages();

        console.log('\\n📦 Adding missing dependencies...');

        // Add dependencies for each package
        for (const [packageName, missingDeps] of Object.entries(this.missingDependencies)) {
            console.log(`\\n🔍 Processing ${packageName}...`);
            await this.addMissingDependencies(packageName, missingDeps);
        }

        // Print summary
        this.printSummary();
    }

    printSummary() {
        console.log('\\n📊 brAInwav Missing Dependencies Addition Summary');
        console.log('='.repeat(60));
        console.log(`📦 Packages updated: ${this.updatedPackages}`);
        console.log(`➕ Dependencies added: ${this.addedDependencies}`);
        console.log(`✅ Actual workspace packages: ${this.actualPackages.size}`);

        if (this.addedDependencies > 0) {
            console.log('\\n✅ brAInwav Missing Dependencies: SUCCESS');
            console.log('🎯 Missing workspace dependencies have been added');
            console.log('');
            console.log('🔄 Next steps:');
            console.log('1. Run `pnpm install` to install new dependencies');
            console.log('2. Test package builds to verify dependency resolution');
            console.log('3. Run import violation scanner to check progress');
        } else {
            console.log('\\n✅ brAInwav Missing Dependencies: COMPLETE');
            console.log('📋 All dependencies were already present or packages do not exist');
        }
    }
}

// Run addition if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const adder = new BrainwavMissingDependencyAdder();
    await adder.addAllMissingDependencies();
}

export default BrainwavMissingDependencyAdder;
