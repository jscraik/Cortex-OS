#!/usr/bin/env node
/**
 * brAInwav Cross-Package Import Violation Scanner
 *
 * Scans the entire monorepo for:
 * - Direct sibling package imports (bypassing published interfaces)
 * - Deep imports into package internals
 * - Banned import patterns
 * - Missing dependency declarations
 *
 * Co-authored-by: brAInwav Development Team
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

class BrainwavImportScanner {
	constructor() {
		this.violations = [];
		this.scannedFiles = 0;
		this.packageMap = new Map(); // package name -> package info

		// brAInwav allowed cross-package imports
		this.allowedCrossPackageImports = [
			'@cortex-os/contracts',
			'@cortex-os/types',
			'@cortex-os/utils',
			'@cortex-os/telemetry',
			'@cortex-os/testing',
			'@cortex-os/a2a-core',
		];

		// brAInwav banned import patterns
		this.bannedPatterns = [
			/^@cortex-os\/.*\/dist\/.*$/, // No dist imports
			/^@cortex-os\/.*\/node_modules\/.*$/, // No node_modules imports
			/^@cortex-os\/.*\/src\/(?!index\.).*$/, // No deep src imports (except index)
			/^\.\.\/\.\.\/\.\.\/.*$/, // No excessive parent traversal
			/^packages\/.*\/packages\/.*$/, // No nested package imports
			/^apps\/.*\/packages\/.*$/, // No app->package direct imports
			/^libs\/.*\/packages\/.*$/, // No lib->package direct imports
		];
	}

	async findTSFiles(dir, tsFiles = []) {
		const entries = await readdir(dir);

		for (const entry of entries) {
			const fullPath = join(dir, entry);
			const stats = await stat(fullPath);

			if (stats.isDirectory()) {
				// Skip ignored directories
				if (!['node_modules', 'dist', '.nx', '.git', 'coverage', '__pycache__'].includes(entry)) {
					await this.findTSFiles(fullPath, tsFiles);
				}
			} else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !entry.endsWith('.d.ts')) {
				tsFiles.push(fullPath);
			}
		}

		return tsFiles;
	}

	async loadPackageInfo() {
		console.log('📦 Loading package information...');

		// Find all package.json files
		const packageFiles = await this.findPackageFiles();

		for (const pkgFile of packageFiles) {
			try {
				const content = await readFile(pkgFile, 'utf8');
				const pkg = JSON.parse(content);

				if (pkg.name) {
					const packageDir = dirname(pkgFile);
					const relativeDir = relative(workspaceRoot, packageDir);

					this.packageMap.set(pkg.name, {
						name: pkg.name,
						path: packageDir,
						relativePath: relativeDir,
						packageJsonPath: pkgFile,
						dependencies: { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) },
						exports: pkg.exports || { '.': './src/index.ts' },
					});
				}
			} catch (error) {
				console.warn(`⚠️  Failed to parse ${pkgFile}: ${error.message}`);
			}
		}

		console.log(`📋 Loaded ${this.packageMap.size} packages`);
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

	extractImports(content) {
		const imports = [];

		// Match various import patterns
		const importPatterns = [
			/import\s+.*?\s+from\s+['"](.*?)['"];/g,
			/import\s*\(\s*['"](.*?)['"]\s*\)/g,
			/require\s*\(\s*['"](.*?)['"]\s*\)/g,
			/export\s+.*?\s+from\s+['"](.*?)['"];/g,
		];

		for (const pattern of importPatterns) {
			let match = pattern.exec(content);
			while (match !== null) {
				imports.push(match[1]);
				match = pattern.exec(content);
			}
		}

		return imports;
	}

	getPackageFromFile(filePath) {
		// Find which package this file belongs to
		const relativePath = relative(workspaceRoot, filePath);

		for (const [_packageName, packageInfo] of this.packageMap) {
			const packageRelativePath = packageInfo.relativePath;
			if (
				relativePath.startsWith(`${packageRelativePath}/`) ||
				relativePath === packageRelativePath
			) {
				return packageInfo;
			}
		}

		return null;
	}

	async analyzeImports(filePath, content) {
		const imports = this.extractImports(content);
		const currentPackage = this.getPackageFromFile(filePath);
		const relativeFilePath = relative(workspaceRoot, filePath);

		for (const importPath of imports) {
			// Skip relative imports within same package
			if (importPath.startsWith('./') || importPath.startsWith('../')) {
				// Check for excessive parent traversal
				if (this.bannedPatterns[3].test(importPath)) {
					this.violations.push({
						type: 'excessive-traversal',
						severity: 'error',
						file: relativeFilePath,
						import: importPath,
						package: currentPackage?.name || 'unknown',
						message: 'brAInwav: Excessive parent directory traversal detected',
						solution: 'Use absolute imports or restructure code',
					});
				}
				continue;
			}

			// Skip node.js built-ins and external packages (unless workspace packages)
			if (
				!importPath.startsWith('@cortex-os/') &&
				!importPath.startsWith('packages/') &&
				!importPath.startsWith('apps/') &&
				!importPath.startsWith('libs/')
			) {
				continue;
			}

			// Check banned patterns
			for (const pattern of this.bannedPatterns) {
				if (pattern.test(importPath)) {
					this.violations.push({
						type: 'banned-pattern',
						severity: 'error',
						file: relativeFilePath,
						import: importPath,
						package: currentPackage?.name || 'unknown',
						message: `brAInwav: Banned import pattern detected: ${pattern}`,
						solution: 'Use published package interfaces instead',
					});
					break;
				}
			}

			// Check for cross-package imports
			if (importPath.startsWith('@cortex-os/')) {
				const targetPackage = importPath.split('/')[1];
				const targetPackageName = `@cortex-os/${targetPackage}`;

				// Skip if same package
				if (currentPackage && currentPackage.name === targetPackageName) {
					continue;
				}

				// Check if it's an allowed cross-package import
				if (!this.allowedCrossPackageImports.includes(targetPackageName)) {
					this.violations.push({
						type: 'unauthorized-cross-package',
						severity: 'error',
						file: relativeFilePath,
						import: importPath,
						package: currentPackage?.name || 'unknown',
						targetPackage: targetPackageName,
						message: 'brAInwav: Unauthorized cross-package import detected',
						solution: `Use A2A events or allowed interfaces: ${this.allowedCrossPackageImports.join(', ')}`,
					});
				}

				// Check if dependency is declared
				if (currentPackage && !currentPackage.dependencies[targetPackageName]) {
					this.violations.push({
						type: 'missing-dependency',
						severity: 'error',
						file: relativeFilePath,
						import: importPath,
						package: currentPackage.name,
						targetPackage: targetPackageName,
						message: 'brAInwav: Missing package dependency declaration',
						solution: `Add "${targetPackageName}": "workspace:*" to package.json dependencies`,
					});
				}
			}

			// Check for direct file path imports
			if (
				importPath.startsWith('packages/') ||
				importPath.startsWith('apps/') ||
				importPath.startsWith('libs/')
			) {
				this.violations.push({
					type: 'direct-file-import',
					severity: 'error',
					file: relativeFilePath,
					import: importPath,
					package: currentPackage?.name || 'unknown',
					message: 'brAInwav: Direct file path import detected',
					solution: 'Use published package name with @cortex-os/ scope',
				});
			}
		}
	}

	async scanFile(filePath) {
		try {
			const content = await readFile(filePath, 'utf8');
			await this.analyzeImports(filePath, content);
			this.scannedFiles++;

			if (this.scannedFiles % 100 === 0) {
				console.log(`📄 Scanned ${this.scannedFiles} files...`);
			}
		} catch (error) {
			console.warn(`⚠️  Failed to scan ${filePath}: ${error.message}`);
		}
	}

	async scanAllFiles() {
		console.log('🔍 brAInwav Import Violation Scanner Starting...\\n');

		// Load package information first
		await this.loadPackageInfo();

		// Find all TypeScript/JavaScript files
		console.log('🔍 Finding TypeScript/JavaScript files...');
		const tsFiles = await this.findTSFiles(workspaceRoot);
		console.log(`📁 Found ${tsFiles.length} files to scan`);

		// Scan each file
		console.log('🔍 Scanning for import violations...');
		for (const file of tsFiles) {
			await this.scanFile(file);
		}

		// Generate report
		this.generateReport();
	}

	generateReport() {
		console.log('\\n📊 brAInwav Import Violation Report');
		console.log('='.repeat(60));
		console.log(`📁 Files scanned: ${this.scannedFiles}`);
		console.log(`📦 Packages analyzed: ${this.packageMap.size}`);
		console.log(`❌ Total violations: ${this.violations.length}`);

		// Group violations by type
		const violationsByType = {};
		for (const violation of this.violations) {
			if (!violationsByType[violation.type]) {
				violationsByType[violation.type] = [];
			}
			violationsByType[violation.type].push(violation);
		}

		console.log('\\n📋 Violation Summary:');
		for (const [type, violations] of Object.entries(violationsByType)) {
			console.log(`  ${type}: ${violations.length} violations`);
		}

		if (this.violations.length > 0) {
			console.log('\\n🚨 DETAILED VIOLATIONS:');

			// Show up to 50 violations to avoid overwhelming output
			const maxShow = 50;
			const showViolations = this.violations.slice(0, maxShow);

			for (let i = 0; i < showViolations.length; i++) {
				const violation = showViolations[i];
				console.log(`\\n${i + 1}. ${violation.file}`);
				console.log(`   Type: ${violation.type}`);
				console.log(`   Package: ${violation.package}`);
				console.log(`   Import: ${violation.import}`);
				console.log(`   Issue: ${violation.message}`);
				console.log(`   Solution: ${violation.solution}`);
				if (violation.targetPackage) {
					console.log(`   Target: ${violation.targetPackage}`);
				}
			}

			if (this.violations.length > maxShow) {
				console.log(`\\n... and ${this.violations.length - maxShow} more violations`);
			}

			console.log('\\n❌ brAInwav Import Compliance: FAIL');
			console.log('🔧 Critical violations must be fixed for brAInwav compliance');

			// Generate fix suggestions
			this.generateFixSuggestions();

			process.exit(1);
		} else {
			console.log('\\n✅ brAInwav Import Compliance: PASS');
			console.log('🏆 No import violations found - excellent brAInwav compliance!');
		}
	}

	generateFixSuggestions() {
		console.log('\\n🔧 brAInwav FIX SUGGESTIONS:');
		console.log('='.repeat(60));

		// Group missing dependencies
		const missingDeps = this.violations.filter((v) => v.type === 'missing-dependency');
		if (missingDeps.length > 0) {
			console.log('\\n📦 Missing Dependencies to Add:');
			const depsByPackage = {};
			for (const dep of missingDeps) {
				if (!depsByPackage[dep.package]) {
					depsByPackage[dep.package] = new Set();
				}
				depsByPackage[dep.package].add(dep.targetPackage);
			}

			for (const [pkg, deps] of Object.entries(depsByPackage)) {
				console.log(`\\n${pkg}:`);
				for (const dep of deps) {
					console.log(`  "${dep}": "workspace:*"`);
				}
			}
		}

		// Group unauthorized imports by package
		const unauthorizedImports = this.violations.filter(
			(v) => v.type === 'unauthorized-cross-package',
		);
		if (unauthorizedImports.length > 0) {
			console.log('\\n🚫 Unauthorized Cross-Package Imports:');
			console.log('Replace with A2A events or allowed interfaces:');
			console.log(`Allowed: ${this.allowedCrossPackageImports.join(', ')}`);
		}

		// Show direct file imports to replace
		const directImports = this.violations.filter((v) => v.type === 'direct-file-import');
		if (directImports.length > 0) {
			console.log('\\n📁 Direct File Imports to Replace:');
			console.log('Use @cortex-os/ scoped package names instead of file paths');
		}
	}
}

// Run scanner if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const scanner = new BrainwavImportScanner();
	await scanner.scanAllFiles();
}

export default BrainwavImportScanner;
