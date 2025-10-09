#!/usr/bin/env tsx

/**
 * TypeScript Project References - Dependency Mapper
 *
 * Maps workspace dependencies to prepare for adding TypeScript project references.
 * This script analyzes package.json dependencies and creates a dependency graph.
 *
 * Usage:
 *   pnpm tsx scripts/map-project-references.ts [--package <name>] [--json]
 *
 * @brainwav
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface PackageInfo {
	name: string;
	path: string;
	hasTsConfig: boolean;
	dependencies: string[];
	tsconfigPath?: string;
}

interface DependencyGraph {
	[packageName: string]: PackageInfo;
}

/**
 * Find all packages in the monorepo
 */
function findAllPackages(): string[] {
	const output = execSync(
		'find packages apps libs -name "package.json" -not -path "*/node_modules/*" -not -path "*/dist/*"',
		{ cwd: process.cwd(), encoding: 'utf-8' },
	);

	return output
		.trim()
		.split('\n')
		.map((p) => path.dirname(p))
		.filter(Boolean);
}

/**
 * Get package info including dependencies
 */
function getPackageInfo(packagePath: string): PackageInfo | null {
	const packageJsonPath = path.join(process.cwd(), packagePath, 'package.json');
	const tsconfigPath = path.join(process.cwd(), packagePath, 'tsconfig.json');

	if (!fs.existsSync(packageJsonPath)) {
		return null;
	}

	try {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
		const hasTsConfig = fs.existsSync(tsconfigPath);

		// Extract @cortex-os/* dependencies
		const allDeps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		const workspaceDeps = Object.keys(allDeps).filter((dep) => dep.startsWith('@cortex-os/'));

		return {
			name: packageJson.name,
			path: packagePath,
			hasTsConfig,
			dependencies: workspaceDeps,
			tsconfigPath: hasTsConfig ? tsconfigPath : undefined,
		};
	} catch (error) {
		console.error(`Error reading ${packageJsonPath}:`, error);
		return null;
	}
}

/**
 * Build dependency graph
 */
function buildDependencyGraph(): DependencyGraph {
	const packages = findAllPackages();
	const graph: DependencyGraph = {};

	for (const pkgPath of packages) {
		const info = getPackageInfo(pkgPath);
		if (info?.name) {
			graph[info.name] = info;
		}
	}

	return graph;
}

/**
 * Resolve package name to relative path
 */
function resolvePackagePath(
	fromPackage: string,
	toPackage: string,
	graph: DependencyGraph,
): string | null {
	const fromInfo = graph[fromPackage];
	const toInfo = graph[toPackage];

	if (!fromInfo || !toInfo || !toInfo.hasTsConfig) {
		return null;
	}

	// Calculate relative path from fromPackage to toPackage
	const from = path.join(process.cwd(), fromInfo.path);
	const to = path.join(process.cwd(), toInfo.path);

	const relativePath = path.relative(from, to);

	return relativePath;
}

/**
 * Generate project references for a package
 */
function generateReferences(packageName: string, graph: DependencyGraph): { path: string }[] {
	const pkgInfo = graph[packageName];

	if (!pkgInfo || !pkgInfo.hasTsConfig) {
		return [];
	}

	const references: { path: string }[] = [];

	for (const dep of pkgInfo.dependencies) {
		const depPath = resolvePackagePath(packageName, dep, graph);
		if (depPath) {
			references.push({ path: depPath });
		}
	}

	return references;
}

/**
 * Print dependency tree
 */
function printDependencyTree(packageName: string, graph: DependencyGraph, depth = 0) {
	const pkgInfo = graph[packageName];

	if (!pkgInfo) {
		return;
	}

	const indent = '  '.repeat(depth);
	const tsConfig = pkgInfo.hasTsConfig ? '✅' : '❌';

	console.log(`${indent}${tsConfig} ${packageName}`);

	if (depth < 2) {
		// Limit depth to avoid cycles
		for (const dep of pkgInfo.dependencies) {
			if (graph[dep]) {
				printDependencyTree(dep, graph, depth + 1);
			}
		}
	}
}

/**
 * Main function
 */
async function main() {
	const args = process.argv.slice(2);
	const packageIndex = args.indexOf('--package');
	const targetPackage = packageIndex >= 0 ? args[packageIndex + 1] : null;
	const jsonOutput = args.includes('--json');

	console.log('🔍 brAInwav TypeScript Project References - Dependency Mapper\n');

	const graph = buildDependencyGraph();

	if (jsonOutput) {
		console.log(JSON.stringify(graph, null, 2));
		return;
	}

	const totalPackages = Object.keys(graph).length;
	const tsConfigPackages = Object.values(graph).filter((p) => p.hasTsConfig).length;

	console.log(`📊 Summary:`);
	console.log(`   Total packages: ${totalPackages}`);
	console.log(`   With tsconfig.json: ${tsConfigPackages}`);
	console.log();

	if (targetPackage) {
		// Show details for specific package
		const fullName = targetPackage.startsWith('@cortex-os/')
			? targetPackage
			: `@cortex-os/${targetPackage}`;

		const pkgInfo = graph[fullName];

		if (!pkgInfo) {
			console.error(`❌ Package not found: ${fullName}`);
			process.exit(1);
		}

		console.log(`📦 Package: ${fullName}`);
		console.log(`   Path: ${pkgInfo.path}`);
		console.log(`   Has tsconfig: ${pkgInfo.hasTsConfig ? 'Yes' : 'No'}`);
		console.log(`   Workspace dependencies: ${pkgInfo.dependencies.length}`);
		console.log();

		if (pkgInfo.dependencies.length > 0) {
			console.log(`🔗 Dependency Tree:`);
			printDependencyTree(fullName, graph);
			console.log();
		}

		if (pkgInfo.hasTsConfig) {
			const references = generateReferences(fullName, graph);

			console.log(`📝 Suggested Project References:`);
			console.log(JSON.stringify({ references }, null, 2));
			console.log();

			console.log(`💡 Add to ${pkgInfo.path}/tsconfig.json:`);
			console.log('```json');
			console.log('{');
			console.log('  "extends": "../../tsconfig.base.json",');
			console.log('  "references": [');
			references.forEach((ref, i) => {
				const comma = i < references.length - 1 ? ',' : '';
				console.log(`    { "path": "${ref.path}" }${comma}`);
			});
			console.log('  ]');
			console.log('}');
			console.log('```');
		}
	} else {
		// Show packages with most dependencies (candidates for Phase 3A)
		const packagesWithDeps = Object.values(graph)
			.filter((p) => p.hasTsConfig && p.dependencies.length > 0)
			.sort((a, b) => b.dependencies.length - a.dependencies.length)
			.slice(0, 10);

		console.log(`🎯 Top 10 Packages with Most Workspace Dependencies:`);
		console.log(`   (Candidates for Phase 3A implementation)\n`);

		packagesWithDeps.forEach((pkg, i) => {
			console.log(`${i + 1}. ${pkg.name}`);
			console.log(`   Dependencies: ${pkg.dependencies.length}`);
			console.log(`   Path: ${pkg.path}`);
			console.log();
		});

		console.log(`💡 Run with --package <name> to see detailed references for a specific package`);
		console.log(`   Example: pnpm tsx scripts/map-project-references.ts --package gateway`);
	}
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
