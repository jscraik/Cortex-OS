#!/usr/bin/env node
/**
 * brAInwav CSpell Configuration Recovery Script
 * Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
 *
 * Resolves CSpell configuration issues and missing dictionary files
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const WORKSPACE_ROOT = process.cwd();

class CSpellRecoveryManager {
	constructor() {
		this.cspellConfigPath = join(WORKSPACE_ROOT, 'cspell.json');
		this.settingsPath = join(WORKSPACE_ROOT, 'config/settings.json');
	}

	async diagnose() {
		console.log('🔍 [brAInwav] Diagnosing CSpell configuration issues...');

		const issues = [];

		// Check if CSpell is installed
		try {
			execSync('npx cspell --version', { stdio: 'pipe' });
		} catch (error) {
			issues.push('CSpell is not installed');
		}

		// Check if configuration file exists
		if (!existsSync(this.cspellConfigPath)) {
			issues.push('CSpell configuration file missing');
		}

		// Check if dictionaries are installed
		const requiredDictionaries = [
			'@cspell/dict-typescript',
			'@cspell/dict-node',
			'@cspell/dict-npm',
			'@cspell/dict-html',
			'@cspell/dict-css',
		];

		for (const dict of requiredDictionaries) {
			const dictPath = join(WORKSPACE_ROOT, 'node_modules', dict);
			if (!existsSync(dictPath)) {
				issues.push(`Dictionary missing: ${dict}`);
			}
		}

		return issues;
	}

	async installDependencies() {
		console.log('📦 [brAInwav] Installing CSpell dependencies...');

		try {
			execSync(
				'pnpm add -D -w @cspell/dict-typescript @cspell/dict-node @cspell/dict-npm @cspell/dict-html @cspell/dict-css @cspell/dict-en-gb cspell',
				{ stdio: 'inherit' },
			);
			console.log('✅ [brAInwav] CSpell dependencies installed successfully');
		} catch (error) {
			console.error('❌ [brAInwav] Failed to install CSpell dependencies:', error.message);
			throw error;
		}
	}

	async createConfiguration() {
		console.log('⚙️ [brAInwav] Creating CSpell configuration...');

		const config = {
			version: '0.2',
			language: 'en',
			words: [
				'brainwav',
				'brAInwav',
				'actioned',
				'Agentic',
				'aiexclude',
				'apify',
				'ASBR',
				'autofetch',
				'autogeneration',
				'axios',
				'Codacy',
				'codesearch',
				'commitlintrc',
				'Dockerized',
				'dotenv',
				'eslintcache',
				'huggingface',
				'llms',
				'mypy',
				'Ollama',
				'pytest',
				'qdrant',
				'semgrep',
				'vitest',
				'WCAG',
			],
			dictionaries: ['typescript', 'node', 'npm', 'html', 'css', 'javascript', 'en-gb'],
			dictionaryDefinitions: [
				{
					name: 'typescript',
					path: './node_modules/@cspell/dict-typescript/cspell-ext.json',
					addWords: true,
				},
				{
					name: 'node',
					path: './node_modules/@cspell/dict-node/cspell-ext.json',
					addWords: true,
				},
				{
					name: 'npm',
					path: './node_modules/@cspell/dict-npm/cspell-ext.json',
					addWords: true,
				},
				{
					name: 'html',
					path: './node_modules/@cspell/dict-html/cspell-ext.json',
					addWords: true,
				},
				{
					name: 'css',
					path: './node_modules/@cspell/dict-css/cspell-ext.json',
					addWords: true,
				},
			],
			ignorePaths: [
				'node_modules/**',
				'dist/**',
				'build/**',
				'coverage/**',
				'*.min.js',
				'*.map',
				'package-lock.json',
				'pnpm-lock.yaml',
				'.git/**',
				'.vscode/**',
				'.idea/**',
				'*.log',
			],
			import: [],
			enabledFileTypes: ['typescript', 'javascript', 'javascriptreact', 'typescriptreact', 'json', 'jsonc', 'markdown', 'yaml', 'yml'],
			allowCompoundWords: true,
			minWordLength: 4,
			maxNumberOfProblems: 1000,
			numSuggestions: 8,
			spellCheckDelayMs: 50,
		};

		writeFileSync(this.cspellConfigPath, JSON.stringify(config, null, 2));
		console.log(`✅ [brAInwav] Configuration created: ${this.cspellConfigPath}`);
	}

	async updateVSCodeSettings() {
		console.log('🔧 [brAInwav] Updating VS Code settings...');

		if (!existsSync(this.settingsPath)) {
			console.log('⚠️ [brAInwav] VS Code settings file not found, skipping...');
			return;
		}

		try {
			const settings = JSON.parse(readFileSync(this.settingsPath, 'utf8'));

			// Add CSpell settings
			settings['cSpell.useLocallyInstalledCSpell'] = true;
			settings['cSpell.logLevel'] = 'Warning';
			settings['cSpell.showStatus'] = false;
			settings['cSpell.enabled'] = true;
			settings['cSpell.import'] = [];
			settings['cSpell.diagnosticLevel'] = 'Information';

			writeFileSync(this.settingsPath, JSON.stringify(settings, null, 4));
			console.log('✅ [brAInwav] VS Code settings updated');
		} catch (error) {
			console.error('❌ [brAInwav] Failed to update VS Code settings:', error.message);
		}
	}

	async validate() {
		console.log('✅ [brAInwav] Validating CSpell configuration...');

		try {
			const output = execSync('npx cspell --validate-directives cspell.json', { encoding: 'utf8' });
			if (output.includes('Issues found: 0')) {
				console.log('✅ [brAInwav] CSpell configuration is valid');
				return true;
			}
		} catch (error) {
			console.error('❌ [brAInwav] CSpell validation failed:', error.message);
			return false;
		}

		return false;
	}

	async recover() {
		console.log('🚀 [brAInwav] Starting CSpell configuration recovery...');

		try {
			const issues = await this.diagnose();

			if (issues.length === 0) {
				console.log('✅ [brAInwav] No CSpell configuration issues detected');
				return true;
			}

			console.log('🔍 [brAInwav] Issues detected:', issues);

			// Install dependencies if needed
			if (issues.some((issue) => issue.includes('not installed') || issue.includes('missing'))) {
				await this.installDependencies();
			}

			// Create configuration if missing
			if (issues.includes('CSpell configuration file missing')) {
				await this.createConfiguration();
			}

			// Update VS Code settings
			await this.updateVSCodeSettings();

			// Validate final configuration
			const isValid = await this.validate();

			if (isValid) {
				console.log('🎉 [brAInwav] CSpell configuration recovery completed successfully!');
				console.log('💡 [brAInwav] You can now run: pnpm spell:check');
			} else {
				console.error('❌ [brAInwav] CSpell configuration recovery failed');
			}

			return isValid;
		} catch (error) {
			console.error('❌ [brAInwav] Recovery process failed:', error.message);
			return false;
		}
	}
}

// Run recovery if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const recovery = new CSpellRecoveryManager();
	recovery.recover().then((success) => {
		process.exit(success ? 0 : 1);
	});
}

export { CSpellRecoveryManager };
