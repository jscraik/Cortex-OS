#!/usr/bin/env node
/**
 * brAInwav TypeScript Server Recovery Protocol
 * Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
 *
 * Implements comprehensive TypeScript server stability recovery following brAInwav protocols
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

class TypeScriptServerRecovery {
	constructor() {
		this.workspaceRoot = process.cwd();
		this.homeDir = homedir();
		this.vscodeSettingsPath = join(this.workspaceRoot, 'config', 'settings.json');
		this.errors = [];
		this.warnings = [];
		this.actions = [];
	}

	log(level, message) {
		const timestamp = new Date().toISOString();
		const logMessage = `${timestamp} [brAInwav] ${level}: ${message}`;
		console.log(logMessage);

		if (level === 'ERROR') {
			this.errors.push(message);
		} else if (level === 'WARN') {
			this.warnings.push(message);
		}
	}

	async terminateRogueProcesses() {
		this.log('INFO', 'Terminating rogue TSServer processes...');

		try {
			// Find and terminate tsserver processes
			const processes = execSync('ps aux | grep -E "(tsserver|typescript)" | grep -v grep', {
				encoding: 'utf8',
			}).trim();

			if (processes) {
				const lines = processes.split('\n');
				for (const line of lines) {
					const parts = line.trim().split(/\s+/);
					const pid = parts[1];
					const command = parts.slice(10).join(' ');

					if (command.includes('tsserver') || command.includes('typescript')) {
						this.log('INFO', `Terminating process ${pid}: ${command}`);
						try {
							execSync(`kill -9 ${pid}`);
							this.actions.push(`Terminated process ${pid}`);
						} catch (error) {
							this.log('WARN', `Failed to terminate process ${pid}: ${error.message}`);
						}
					}
				}
			} else {
				this.log('INFO', 'No rogue TSServer processes found');
			}
		} catch (error) {
			this.log('INFO', 'No TSServer processes running');
		}
	}

	async clearTypeScriptCaches() {
		this.log('INFO', 'Clearing TypeScript cache directories...');

		const cachePaths = [
			join(this.homeDir, '.vscode', 'extensions', 'typescript-language-features'),
			join(this.homeDir, '.cache', 'typescript'),
			join(this.homeDir, 'Library', 'Caches', 'typescript'),
			join(this.workspaceRoot, '.tscache'),
			join(this.workspaceRoot, 'node_modules', '.cache'),
			join(this.workspaceRoot, '.turbo'),
			join(this.workspaceRoot, 'dist'),
		];

		for (const cachePath of cachePaths) {
			if (existsSync(cachePath)) {
				try {
					rmSync(cachePath, { recursive: true, force: true });
					this.log('INFO', `Cleared cache: ${cachePath}`);
					this.actions.push(`Cleared cache: ${cachePath}`);
				} catch (error) {
					this.log('WARN', `Failed to clear cache ${cachePath}: ${error.message}`);
				}
			}
		}
	}

	async validateWorkspaceTypeScript() {
		this.log('INFO', 'Validating workspace TypeScript installation...');

		const tsServerPath = join(
			this.workspaceRoot,
			'node_modules',
			'typescript',
			'lib',
			'tsserver.js',
		);
		const tscPath = join(this.workspaceRoot, 'node_modules', 'typescript', 'lib', 'tsc.js');

		if (!existsSync(tsServerPath)) {
			this.log('ERROR', 'Workspace TypeScript server not found');
			return false;
		}

		if (!existsSync(tscPath)) {
			this.log('ERROR', 'Workspace TypeScript compiler not found');
			return false;
		}

		try {
			const version = execSync('npx tsc --version', {
				cwd: this.workspaceRoot,
				encoding: 'utf8',
			}).trim();
			this.log('INFO', `Workspace TypeScript version: ${version}`);
			this.actions.push(`Validated TypeScript: ${version}`);
			return true;
		} catch (error) {
			this.log('ERROR', `Failed to get TypeScript version: ${error.message}`);
			return false;
		}
	}

	async optimizeVSCodeSettings() {
		this.log('INFO', 'Optimizing VS Code TypeScript settings...');

		if (!existsSync(this.vscodeSettingsPath)) {
			this.log('WARN', 'VS Code settings file not found');
			return;
		}

		try {
			const settings = JSON.parse(readFileSync(this.vscodeSettingsPath, 'utf8'));

			// Apply performance optimizations from memory
			const optimizations = {
				'typescript.tsdk': 'node_modules/typescript/lib',
				'typescript.preferences.useLabelDetailsInCompletionEntries': false,
				'typescript.suggest.autoImports': false,
				'typescript.suggest.completeFunctionCalls': false,
				'typescript.tsserver.maxTsServerMemory': 8192,
				'typescript.tsserver.experimental.enableProjectDiagnostics': false,
				'typescript.disableAutomaticTypeAcquisition': true,
				'typescript.preferences.includePackageJsonAutoImports': 'off',
				'typescript.surveys.enabled': false,
				'javascript.validate.enable': false,
				'typescript.validate.enable': true,
				'typescript.updateImportsOnFileMove.enabled': 'never',
			};

			let hasChanges = false;
			for (const [key, value] of Object.entries(optimizations)) {
				if (settings[key] !== value) {
					settings[key] = value;
					hasChanges = true;
					this.log('INFO', `Updated setting: ${key} = ${value}`);
				}
			}

			if (hasChanges) {
				writeFileSync(this.vscodeSettingsPath, JSON.stringify(settings, null, 4));
				this.actions.push('Applied VS Code performance optimizations');
				this.log('INFO', 'VS Code settings optimized for performance');
			} else {
				this.log('INFO', 'VS Code settings already optimized');
			}
		} catch (error) {
			this.log('ERROR', `Failed to optimize VS Code settings: ${error.message}`);
		}
	}

	async checkTSConfigOptimization() {
		this.log('INFO', 'Checking tsconfig.json optimization...');

		const tsconfigPath = join(this.workspaceRoot, 'tsconfig.json');
		if (!existsSync(tsconfigPath)) {
			this.log('WARN', 'No tsconfig.json found in workspace');
			return;
		}

		try {
			const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
			const compilerOptions = tsconfig.compilerOptions || {};

			// Check for performance-critical settings
			const requiredSettings = {
				incremental: true,
				skipLibCheck: true,
				skipDefaultLibCheck: true,
			};

			const recommendations = [];
			for (const [key, value] of Object.entries(requiredSettings)) {
				if (compilerOptions[key] !== value) {
					recommendations.push(`${key}: ${value}`);
				}
			}

			if (recommendations.length > 0) {
				this.log('WARN', `Consider optimizing tsconfig.json: ${recommendations.join(', ')}`);
			} else {
				this.log('INFO', 'tsconfig.json appears optimized');
			}
		} catch (error) {
			this.log('ERROR', `Failed to analyze tsconfig.json: ${error.message}`);
		}
	}

	async installOptimalTypeScript() {
		this.log('INFO', 'Ensuring optimal TypeScript installation...');

		try {
			// Check current version
			const currentVersion = execSync('npx tsc --version', {
				cwd: this.workspaceRoot,
				encoding: 'utf8',
			}).trim();
			this.log('INFO', `Current TypeScript: ${currentVersion}`);

			// Reinstall to ensure clean state
			this.log('INFO', 'Reinstalling TypeScript for clean state...');
			execSync('pnpm install typescript@latest', { cwd: this.workspaceRoot, stdio: 'inherit' });

			const newVersion = execSync('npx tsc --version', {
				cwd: this.workspaceRoot,
				encoding: 'utf8',
			}).trim();
			this.log('INFO', `Updated TypeScript: ${newVersion}`);
			this.actions.push(`TypeScript updated: ${newVersion}`);
		} catch (error) {
			this.log('ERROR', `Failed to install TypeScript: ${error.message}`);
		}
	}

	async testTSServerConnection() {
		this.log('INFO', 'Testing TypeScript server connection...');

		return new Promise((resolve) => {
			const tsServerPath = join(
				this.workspaceRoot,
				'node_modules',
				'typescript',
				'lib',
				'tsserver.js',
			);

			const tsserver = spawn('node', [tsServerPath], {
				stdio: ['pipe', 'pipe', 'pipe'],
				cwd: this.workspaceRoot,
			});

			let responseReceived = false;

			// Send a simple request
			const request =
				JSON.stringify({
					seq: 1,
					type: 'request',
					command: 'configure',
					arguments: {
						file: join(this.workspaceRoot, 'package.json'),
						formatOptions: {},
					},
				}) + '\n';

			tsserver.stdin.write(request);

			tsserver.stdout.on('data', (data) => {
				const response = data.toString();
				if (response.includes('"success":true') || response.includes('"seq":1')) {
					responseReceived = true;
					this.log('INFO', 'TypeScript server responding correctly');
					this.actions.push('Verified TSServer connection');
					tsserver.kill();
					resolve(true);
				}
			});

			tsserver.stderr.on('data', (data) => {
				this.log('WARN', `TSServer stderr: ${data.toString().trim()}`);
			});

			setTimeout(() => {
				if (!responseReceived) {
					this.log('ERROR', 'TypeScript server failed to respond');
					tsserver.kill();
					resolve(false);
				}
			}, 5000);

			tsserver.on('error', (error) => {
				this.log('ERROR', `TSServer process error: ${error.message}`);
				resolve(false);
			});
		});
	}

	async checkProblematicExtensions() {
		this.log('INFO', 'Checking for problematic VS Code extensions...');

		const problematicExtensions = ['nrwl.angular-console', 'ms-vscode.vscode-typescript-next'];

		const extensionsDir = join(this.homeDir, '.vscode', 'extensions');
		if (!existsSync(extensionsDir)) {
			this.log('INFO', 'No VS Code extensions directory found');
			return;
		}

		try {
			const extensions = execSync('ls ~/.vscode/extensions/', { encoding: 'utf8' })
				.trim()
				.split('\n');

			for (const extension of problematicExtensions) {
				const found = extensions.find((ext) => ext.includes(extension));
				if (found) {
					this.log('WARN', `Problematic extension detected: ${found}`);
					this.warnings.push(`Consider disabling extension: ${extension}`);
				}
			}
		} catch (error) {
			this.log('WARN', `Could not check extensions: ${error.message}`);
		}
	}

	generateRecoveryReport() {
		const report = {
			timestamp: new Date().toISOString(),
			workspace: this.workspaceRoot,
			branding: 'brAInwav TypeScript Server Recovery',
			summary: {
				errors: this.errors.length,
				warnings: this.warnings.length,
				actionsPerformed: this.actions.length,
			},
			details: {
				errors: this.errors,
				warnings: this.warnings,
				actions: this.actions,
			},
			recommendations: [
				'Restart VS Code after recovery',
				'Monitor memory usage with Activity Monitor',
				'Consider disabling non-essential extensions',
				'Use incremental builds for large projects',
			],
		};

		const reportPath = join(this.workspaceRoot, 'ts-server-recovery-report.json');
		writeFileSync(reportPath, JSON.stringify(report, null, 2));
		this.log('INFO', `Recovery report saved: ${reportPath}`);

		return report;
	}

	async executeRecoveryProtocol() {
		this.log('INFO', 'Starting brAInwav TypeScript Server Recovery Protocol...');

		try {
			// Step 1: Terminate rogue processes
			await this.terminateRogueProcesses();

			// Step 2: Clear TypeScript caches
			await this.clearTypeScriptCaches();

			// Step 3: Validate workspace installation
			const isValid = await this.validateWorkspaceTypeScript();
			if (!isValid) {
				await this.installOptimalTypeScript();
			}

			// Step 4: Optimize VS Code settings
			await this.optimizeVSCodeSettings();

			// Step 5: Check tsconfig optimization
			await this.checkTSConfigOptimization();

			// Step 6: Check problematic extensions
			await this.checkProblematicExtensions();

			// Step 7: Test TSServer connection
			await this.testTSServerConnection();

			// Generate recovery report
			const report = this.generateRecoveryReport();

			// Summary
			this.log('INFO', '='.repeat(60));
			this.log('INFO', 'brAInwav TypeScript Server Recovery Complete');
			this.log('INFO', '='.repeat(60));
			this.log('INFO', `Errors: ${this.errors.length}`);
			this.log('INFO', `Warnings: ${this.warnings.length}`);
			this.log('INFO', `Actions Performed: ${this.actions.length}`);

			if (this.errors.length === 0) {
				this.log('INFO', '✅ Recovery successful! TypeScript server should now work properly.');
				this.log('INFO', '💡 Please restart VS Code to apply all changes.');
			} else {
				this.log(
					'ERROR',
					'❌ Recovery completed with errors. Manual intervention may be required.',
				);
			}

			return report;
		} catch (error) {
			this.log('ERROR', `Recovery protocol failed: ${error.message}`);
			throw error;
		}
	}
}

// Execute recovery if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const recovery = new TypeScriptServerRecovery();
	recovery
		.executeRecoveryProtocol()
		.then(() => {
			process.exit(0);
		})
		.catch((error) => {
			console.error('[brAInwav] Recovery failed:', error);
			process.exit(1);
		});
}

export { TypeScriptServerRecovery };
