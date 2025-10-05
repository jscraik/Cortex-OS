#!/usr/bin/env node
/**
 * brAInwav Emergency TypeScript Language Service Crash Recovery
 * Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
 *
 * Immediate recovery protocol for TypeScript language service crashes
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

class EmergencyTSCrashRecovery {
	constructor() {
		this.homeDir = homedir();
		this.workspaceRoot = process.cwd();
		this.crashedExtensions = ['github.copilot-chat', 'nrwl.angular-console'];
		this.actions = [];
	}

	log(level, message) {
		const timestamp = new Date().toISOString();
		console.log(`${timestamp} [brAInwav] ${level}: ${message}`);
	}

	async emergencyProcessKill() {
		this.log('CRITICAL', 'Terminating all TypeScript language service processes...');

		try {
			// Find all TypeScript-related processes
			const processes = execSync('ps aux | grep -E "(tsserver|typescript)" | grep -v grep', {
				encoding: 'utf8',
			}).trim();

			if (processes) {
				const lines = processes.split('\n');
				let killedCount = 0;

				for (const line of lines) {
					const parts = line.trim().split(/\s+/);
					const pid = parts[1];
					const command = parts.slice(10).join(' ');

					if (
						(command.includes('tsserver') || command.includes('typescript')) &&
						(command.includes('copilot') ||
							command.includes('angular-console') ||
							command.includes('Code Helper'))
					) {
						this.log('WARNING', `Force killing crashed process ${pid}`);
						try {
							execSync(`kill -9 ${pid}`);
							killedCount++;
							this.actions.push(`Emergency killed process ${pid}`);
						} catch (error) {
							this.log('ERROR', `Failed to kill process ${pid}: ${error.message}`);
						}
					}
				}

				this.log('INFO', `Emergency terminated ${killedCount} processes`);
			} else {
				this.log('INFO', 'No TypeScript processes found running');
			}
		} catch (error) {
			this.log('INFO', 'No TypeScript processes currently running');
		}
	}

	async disableProblematicExtensions() {
		this.log('CRITICAL', 'Temporarily disabling problematic extensions...');

		const vscodeSettingsPath = join(this.workspaceRoot, 'config', 'settings.json');

		if (existsSync(vscodeSettingsPath)) {
			try {
				const settings = JSON.parse(readFileSync(vscodeSettingsPath, 'utf8'));

				// Add extension disable list
				if (!settings['extensions.disabled']) {
					settings['extensions.disabled'] = [];
				}

				let addedDisabled = false;
				for (const ext of this.crashedExtensions) {
					if (!settings['extensions.disabled'].includes(ext)) {
						settings['extensions.disabled'].push(ext);
						addedDisabled = true;
						this.log('WARNING', `Disabled extension: ${ext}`);
					}
				}

				// Add additional safety settings
				settings['typescript.tsserver.pluginPaths'] = [];
				settings['typescript.tsserver.experimental.enableProjectDiagnostics'] = false;
				settings['typescript.suggest.autoImports'] = false;

				if (addedDisabled) {
					writeFileSync(vscodeSettingsPath, JSON.stringify(settings, null, 4));
					this.actions.push('Disabled problematic extensions');
					this.log('INFO', 'Extensions disabled in workspace settings');
				}
			} catch (error) {
				this.log('ERROR', `Failed to modify settings: ${error.message}`);
			}
		}
	}

	async aggressiveCacheClear() {
		this.log('CRITICAL', 'Performing aggressive cache clearing...');

		const cachePaths = [
			join(this.homeDir, '.vscode', 'CachedExtensions'),
			join(this.homeDir, '.vscode', 'logs'),
			join(this.homeDir, 'Library', 'Caches', 'com.microsoft.VSCode'),
			join(this.homeDir, 'Library', 'Caches', 'typescript'),
			join(this.homeDir, 'Library', 'Saved Application State', 'com.microsoft.VSCode.savedState'),
			join(this.workspaceRoot, '.vscode', 'settings.json.backup'),
			join(this.workspaceRoot, 'node_modules', '.cache'),
			join(this.workspaceRoot, '.nx', 'cache'),
			join(this.workspaceRoot, '.turbo'),
			join(this.workspaceRoot, 'dist'),
		];

		for (const cachePath of cachePaths) {
			if (existsSync(cachePath)) {
				try {
					rmSync(cachePath, { recursive: true, force: true });
					this.log('INFO', `Cleared critical cache: ${cachePath}`);
					this.actions.push(`Cleared cache: ${cachePath}`);
				} catch (error) {
					this.log('WARN', `Could not clear cache ${cachePath}: ${error.message}`);
				}
			}
		}
	}

	async createVSCodeRestart() {
		this.log('CRITICAL', 'Creating VS Code restart script...');

		const restartScript = `#!/bin/bash
# brAInwav Emergency VS Code Restart
# Co-authored-by: brAInwav Development Team <dev@brainwav.dev>

echo "[brAInwav] Emergency restart of VS Code..."

# Kill all VS Code processes
pkill -f "Visual Studio Code" || true
pkill -f "Code Helper" || true

# Wait for processes to terminate
sleep 3

# Clear additional runtime caches
rm -rf ~/Library/Saved\\ Application\\ State/com.microsoft.VSCode.savedState/ || true

echo "[brAInwav] Restarting VS Code in safe mode..."

# Restart VS Code with extensions disabled temporarily
open -a "Visual Studio Code" --args --disable-extensions

echo "[brAInwav] VS Code restarted in safe mode"
echo "[brAInwav] Re-enable extensions one by one to identify the culprit"
`;

		const scriptPath = join(this.workspaceRoot, 'scripts', 'emergency-vscode-restart.sh');
		writeFileSync(scriptPath, restartScript);
		execSync(`chmod +x "${scriptPath}"`);

		this.log('INFO', `Emergency restart script created: ${scriptPath}`);
		this.actions.push('Created emergency restart script');
	}

	async generateCrashReport() {
		const report = {
			timestamp: new Date().toISOString(),
			branding: 'brAInwav Emergency TypeScript Language Service Crash Recovery',
			crashDetails: {
				frequency: '5 crashes in 5 minutes',
				suspectedExtensions: this.crashedExtensions,
				severity: 'CRITICAL',
			},
			actions: this.actions,
			nextSteps: [
				'Restart VS Code using the emergency script',
				'Re-enable extensions one by one',
				'Monitor for stability',
				'Consider permanent removal of problematic extensions',
			],
			recommendations: [
				'Disable nrwl.angular-console permanently in large monorepos',
				'Use GitHub Copilot without chat extension if possible',
				'Increase TypeScript server memory limit',
				'Enable TypeScript server logging for debugging',
			],
		};

		const reportPath = join(this.workspaceRoot, 'emergency-crash-recovery-report.json');
		writeFileSync(reportPath, JSON.stringify(report, null, 2));
		this.log('INFO', `Emergency crash report saved: ${reportPath}`);

		return report;
	}

	async executeEmergencyRecovery() {
		this.log('CRITICAL', '🚨 EMERGENCY: TypeScript Language Service Crash Recovery Starting...');

		try {
			// Step 1: Kill all rogue processes immediately
			await this.emergencyProcessKill();

			// Step 2: Disable problematic extensions
			await this.disableProblematicExtensions();

			// Step 3: Aggressive cache clearing
			await this.aggressiveCacheClear();

			// Step 4: Create restart script
			await this.createVSCodeRestart();

			// Step 5: Generate report
			const report = await this.generateCrashReport();

			// Summary
			this.log('CRITICAL', '='.repeat(80));
			this.log('CRITICAL', '🚨 brAInwav EMERGENCY RECOVERY COMPLETE');
			this.log('CRITICAL', '='.repeat(80));
			this.log('WARNING', `Actions Performed: ${this.actions.length}`);
			this.log('WARNING', 'Problematic Extensions: github.copilot-chat, nrwl.angular-console');
			this.log('CRITICAL', '⚠️  IMMEDIATE ACTION REQUIRED:');
			this.log('CRITICAL', '1. Run: ./scripts/emergency-vscode-restart.sh');
			this.log('CRITICAL', '2. VS Code will restart in safe mode');
			this.log('CRITICAL', '3. Re-enable extensions one by one');
			this.log('CRITICAL', '4. Monitor stability closely');
			this.log('CRITICAL', '='.repeat(80));

			return report;
		} catch (error) {
			this.log('CRITICAL', `Emergency recovery failed: ${error.message}`);
			throw error;
		}
	}
}

// Execute emergency recovery
const recovery = new EmergencyTSCrashRecovery();
recovery
	.executeEmergencyRecovery()
	.then(() => {
		console.log(
			'\n[brAInwav] 🚨 Emergency recovery completed. Execute restart script immediately.',
		);
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n[brAInwav] 🚨 CRITICAL: Emergency recovery failed:', error);
		process.exit(1);
	});
