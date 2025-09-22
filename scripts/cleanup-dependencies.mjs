#!/usr/bin/env node
/**
 * brAInwav Package Dependency Cleanup Script
 * 
 * Removes references to non-existent workspace packages from package.json files.
 * Only keeps dependencies that actually exist in the workspace.
 * 
 * Co-authored-by: brAInwav Development Team
 */

import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

class BrainwavDependencyCleanup {
    constructor() {
        this.actualPackages = new Set();
        this.cleanedPackages = 0;
        this.removedDependencies = 0;
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

        console.log(`📦 Found ${this.actualPackages.size} actual @cortex-os packages:`);
        for (const pkg of Array.from(this.actualPackages).sort()) {
            console.log(`  ✓ ${pkg}`);
        }
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

    async cleanPackageFile(packageFile) {
        try {
            const content = await readFile(packageFile, 'utf8');
            const pkg = JSON.parse(content);

            let hasChanges = false;
            let removedCount = 0;

            // Clean dependencies
            if (pkg.dependencies) {
                for (const [depName, version] of Object.entries(pkg.dependencies)) {
                    if (depName.startsWith('@cortex-os/') && version === 'workspace:*') {
                        if (!this.actualPackages.has(depName)) {
                            console.log(`  ❌ Removing non-existent dependency: ${depName}`);
                            delete pkg.dependencies[depName];
                            hasChanges = true;
                            removedCount++;
                        }
                    }
                }
            }

            // Clean devDependencies
            if (pkg.devDependencies) {
                for (const [depName, version] of Object.entries(pkg.devDependencies)) {
                    if (depName.startsWith('@cortex-os/') && version === 'workspace:*') {
                        if (!this.actualPackages.has(depName)) {
                            console.log(`  ❌ Removing non-existent devDependency: ${depName}`);
                            delete pkg.devDependencies[depName];
                            hasChanges = true;
                            removedCount++;
                        }
                    }
                }
            }

            if (hasChanges) {
                // Sort dependencies for consistent formatting
                if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
                    const sortedDeps = {};
                    Object.keys(pkg.dependencies).sort().forEach(key => {
                        sortedDeps[key] = pkg.dependencies[key];
                    });
                    pkg.dependencies = sortedDeps;
                }

                if (pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0) {
                    const sortedDevDeps = {};
                    Object.keys(pkg.devDependencies).sort().forEach(key => {
                        sortedDevDeps[key] = pkg.devDependencies[key];
                    });
                    pkg.devDependencies = sortedDevDeps;
                }

                // Write back to file
                const updatedContent = JSON.stringify(pkg, null, 2) + '\\n';
                await writeFile(packageFile, updatedContent, 'utf8');

                this.cleanedPackages++;
                this.removedDependencies += removedCount;

                console.log(`✅ Cleaned ${pkg.name || 'package'} - removed ${removedCount} invalid dependencies`);
            }

        } catch (error) {
            console.error(`❌ Failed to clean ${packageFile}: ${error.message}`);
        }
    }

    async cleanAllPackages() {
        console.log('🧹 brAInwav Dependency Cleanup Starting...\\n');

        // First, discover what packages actually exist
        await this.findActualPackages();

        console.log('\\n🧹 Cleaning package.json files...');

        // Find all package.json files
        const packageFiles = await this.findPackageFiles();

        // Clean each package file
        for (const packageFile of packageFiles) {
            await this.cleanPackageFile(packageFile);
        }

        // Print summary
        this.printSummary();
    }

    printSummary() {
        console.log('\\n📊 brAInwav Dependency Cleanup Summary');
        console.log('='.repeat(60));
        console.log(`📦 Packages cleaned: ${this.cleanedPackages}`);
        console.log(`❌ Invalid dependencies removed: ${this.removedDependencies}`);
        console.log(`✅ Actual workspace packages: ${this.actualPackages.size}`);

        if (this.removedDependencies > 0) {
            console.log('\\n✅ brAInwav Dependency Cleanup: SUCCESS');
            console.log('🎯 Invalid workspace dependencies have been removed');
            console.log('');
            console.log('🔄 Next step: Run `pnpm install` to update lockfile');
        } else {
            console.log('\\n✅ brAInwav Dependency Cleanup: COMPLETE');
            console.log('📋 No invalid dependencies found');
        }
    }
}

// Run cleanup if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const cleanup = new BrainwavDependencyCleanup();
    await cleanup.cleanAllPackages();
}

export default BrainwavDependencyCleanup;
