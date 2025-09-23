#!/usr/bin/env node
/**
 * brAInwav NX Configuration Validation Script
 *
 * Validates all project.json files for:
 * - Proper {workspaceRoot} token usage
 * - Valid NX schema compliance
 * - brAInwav configuration standards
 *
 * Co-authored-by: brAInwav Development Team
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

class BrainwavNXValidator {
	constructor() {
		this.errors = [];
		this.warnings = [];
		this.validatedFiles = 0;
	}

	async validateWorkspaceRootTokens(config, filePath) {
		const configStr = JSON.stringify(config, null, 2);
		const lines = configStr.split('\n');

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Check for improper {workspaceRoot} usage in command strings
			if (line.includes('{workspaceRoot}')) {
				// Valid cases: at beginning of args array items, or in dedicated command/args structure
				const isInCommand = line.includes('"command":') && line.includes('{workspaceRoot}');
				const isInArgsArray =
					(line.trim().startsWith('"') && line.trim().endsWith('",')) || line.trim().endsWith('"');

				if (isInCommand && !isInArgsArray) {
					// Check if it's a multi-token command (invalid)
					const commandMatch = line.match(/"command":\s*"([^"]+)"/);
					if (commandMatch?.[1].includes(' ') && commandMatch[1].includes('{workspaceRoot}')) {
						this.errors.push({
							file: filePath,
							line: i + 1,
							issue: 'brAInwav: {workspaceRoot} token used in multi-token command string',
							detail: `Line: ${line.trim()}`,
							solution: 'Split command into "command" and "args" array structure',
						});
					}
				}
			}
		}
	}

	async validateNXSchema(config, filePath) {
		// Check required fields
		if (!config.name) {
			this.errors.push({
				file: filePath,
				issue: 'brAInwav: Missing required "name" field',
				solution: 'Add package name field',
			});
		}

		if (!config.targets) {
			this.warnings.push({
				file: filePath,
				issue: 'brAInwav: No targets defined',
				detail: 'Consider adding build, test, or lint targets',
			});
		}

		// Validate target structure
		if (config.targets) {
			for (const [targetName, target] of Object.entries(config.targets)) {
				if (!target.executor) {
					this.errors.push({
						file: filePath,
						issue: `brAInwav: Target "${targetName}" missing executor`,
						solution: 'Add valid executor field',
					});
				}
			}
		}
	}

	async validateBrainwavStandards(config, filePath) {
		// Check for brAInwav naming conventions
		if (config.name && !config.name.startsWith('@cortex-os/')) {
			this.warnings.push({
				file: filePath,
				issue: 'brAInwav: Package name should use @cortex-os/ scope',
				detail: `Current: ${config.name}`,
			});
		}

		// Check for required brAInwav targets
		const requiredTargets = ['build', 'test', 'lint'];
		const definedTargets = Object.keys(config.targets || {});

		for (const requiredTarget of requiredTargets) {
			if (!definedTargets.includes(requiredTarget)) {
				this.warnings.push({
					file: filePath,
					issue: `brAInwav: Missing recommended target "${requiredTarget}"`,
					detail: 'Consider adding standard brAInwav targets',
				});
			}
		}
	}

	async validateProjectFile(filePath) {
		try {
			const content = await readFile(filePath, 'utf8');
			const config = JSON.parse(content);

			await this.validateWorkspaceRootTokens(config, filePath);
			await this.validateNXSchema(config, filePath);
			await this.validateBrainwavStandards(config, filePath);

			this.validatedFiles++;
		} catch (error) {
			this.errors.push({
				file: filePath,
				issue: 'brAInwav: Failed to parse project.json',
				detail: error.message,
				solution: 'Fix JSON syntax errors',
			});
		}
	}

	async findProjectFiles(dir = workspaceRoot, projectFiles = []) {
		const entries = await readdir(dir);

		for (const entry of entries) {
			const fullPath = join(dir, entry);
			const stats = await stat(fullPath);

			if (stats.isDirectory()) {
				// Skip node_modules, dist, .nx directories
				if (!['node_modules', 'dist', '.nx', '.git'].includes(entry)) {
					await this.findProjectFiles(fullPath, projectFiles);
				}
			} else if (entry === 'project.json') {
				projectFiles.push(fullPath);
			}
		}

		return projectFiles;
	}

	async validateAllProjects() {
		console.log('🎯 brAInwav NX Configuration Validation Starting...\n');

		try {
			// Find all project.json files
			const projectFiles = await this.findProjectFiles();

			console.log(`📋 Found ${projectFiles.length} project.json files to validate`);

			// Validate each file
			for (const file of projectFiles) {
				await this.validateProjectFile(file);
			}

			// Report results
			this.printReport();
		} catch (error) {
			console.error('❌ brAInwav validation failed:', error.message);
			process.exit(1);
		}
	}

	printReport() {
		console.log('\n📊 brAInwav NX Configuration Validation Report');
		console.log('='.repeat(60));
		console.log(`📁 Files validated: ${this.validatedFiles}`);
		console.log(`❌ Errors found: ${this.errors.length}`);
		console.log(`⚠️  Warnings found: ${this.warnings.length}`);

		if (this.errors.length > 0) {
			console.log('\n🚨 CRITICAL ERRORS (Must Fix):');
			this.errors.forEach((error, index) => {
				console.log(`\n${index + 1}. ${error.file}`);
				console.log(`   Issue: ${error.issue}`);
				if (error.detail) console.log(`   Detail: ${error.detail}`);
				if (error.solution) console.log(`   Solution: ${error.solution}`);
				if (error.line) console.log(`   Line: ${error.line}`);
			});
		}

		if (this.warnings.length > 0) {
			console.log('\n⚠️  WARNINGS (Recommended Fixes):');
			this.warnings.forEach((warning, index) => {
				console.log(`\n${index + 1}. ${warning.file}`);
				console.log(`   Issue: ${warning.issue}`);
				if (warning.detail) console.log(`   Detail: ${warning.detail}`);
			});
		}

		if (this.errors.length === 0 && this.warnings.length === 0) {
			console.log('\n✅ brAInwav NX Configuration Validation: ALL PASS');
			console.log('🏆 No issues found - configurations meet brAInwav standards!');
		} else if (this.errors.length === 0) {
			console.log('\n✅ brAInwav NX Configuration Validation: PASS');
			console.log('💡 No critical errors, but consider addressing warnings');
		} else {
			console.log('\n❌ brAInwav NX Configuration Validation: FAIL');
			console.log('🔧 Critical errors must be fixed before proceeding');
			process.exit(1);
		}
	}
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const validator = new BrainwavNXValidator();
	await validator.validateAllProjects();
}

export default BrainwavNXValidator;
