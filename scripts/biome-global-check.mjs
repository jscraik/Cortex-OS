#!/usr/bin/env node
/**
 * brAInwav Biome Global Installation Checker
 * Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
 *
 * Verifies Biome global installation and LSP readiness
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';

class BiomeGlobalChecker {
	constructor() {
		this.errors = [];
		this.warnings = [];
	}

	checkGlobalInstallation() {
		console.log('🔍 [brAInwav] Checking Biome global installation...');

		try {
			// Check if biome is in PATH
			const biomePath = execSync('which biome', { encoding: 'utf8' }).trim();
			console.log(`✅ [brAInwav] Biome found at: ${biomePath}`);

			// Check version
			const version = execSync('biome --version', { encoding: 'utf8' }).trim();
			console.log(`✅ [brAInwav] Biome version: ${version}`);

			return { path: biomePath, version };
		} catch (error) {
			this.errors.push('Biome not found in global PATH');
			console.error('❌ [brAInwav] Biome not found globally');
			return null;
		}
	}

	checkLSPCapability() {
		console.log('🔧 [brAInwav] Checking LSP proxy capability...');

		try {
			const lspHelp = execSync('biome lsp-proxy --help', { encoding: 'utf8' });
			if (lspHelp.includes('Language Server Protocol')) {
				console.log('✅ [brAInwav] LSP proxy available');
				return true;
			}
		} catch (error) {
			this.errors.push('LSP proxy not available');
			console.error('❌ [brAInwav] LSP proxy not working');
			return false;
		}
	}

	compareVersions() {
		console.log('📊 [brAInwav] Comparing global vs local versions...');

		try {
			const globalVersion = execSync('biome --version', { encoding: 'utf8' }).trim();
			
			// Check if we're in a project with local Biome
			if (existsSync('./node_modules/.bin/biome')) {
				const localVersion = execSync('./node_modules/.bin/biome --version', { encoding: 'utf8' }).trim();
				
				console.log(`📍 [brAInwav] Global: ${globalVersion}`);
				console.log(`📍 [brAInwav] Local:  ${localVersion}`);

				if (globalVersion !== localVersion) {
					this.warnings.push(`Version mismatch: Global (${globalVersion}) vs Local (${localVersion})`);
				}
			} else {
				console.log(`📍 [brAInwav] Global: ${globalVersion}`);
				console.log('📍 [brAInwav] No local Biome installation detected');
			}
		} catch (error) {
			this.errors.push('Version comparison failed');
		}
	}

	testLSPConnection() {
		console.log('🔌 [brAInwav] Testing LSP connection...');

		return new Promise((resolve) => {
			const lspProcess = spawn('biome', ['lsp-proxy'], {
				stdio: ['pipe', 'pipe', 'pipe']
			});

			// Send a simple LSP initialize request
			const initRequest = JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'initialize',
				params: {
					processId: process.pid,
					capabilities: {}
				}
			});

			lspProcess.stdin.write(`Content-Length: ${initRequest.length}\r\n\r\n${initRequest}`);

			let responseData = '';
			lspProcess.stdout.on('data', (data) => {
				responseData += data.toString();
				if (responseData.includes('Content-Length')) {
					console.log('✅ [brAInwav] LSP server responds to requests');
					lspProcess.kill();
					resolve(true);
				}
			});

			setTimeout(() => {
				if (lspProcess.exitCode === null) {
					console.log('✅ [brAInwav] LSP server started successfully');
					lspProcess.kill();
					resolve(true);
				} else {
					this.errors.push('LSP server failed to start');
					console.error('❌ [brAInwav] LSP server failed to start');
					resolve(false);
				}
			}, 2000);

			lspProcess.on('error', (error) => {
				this.errors.push(`LSP connection error: ${error.message}`);
				console.error('❌ [brAInwav] LSP connection failed:', error.message);
				resolve(false);
			});
		});
	}

	provideInstallationInstructions() {
		console.log('\n💡 [brAInwav] Installation Instructions:');
		
		if (process.platform === 'darwin') {
			console.log('   For macOS (Homebrew):');
			console.log('   brew install biome');
		} else if (process.platform === 'linux') {
			console.log('   For Linux:');
			console.log('   npm install -g @biomejs/biome');
			console.log('   # or');
			console.log('   curl -fsSL https://biomejs.dev/install.sh | bash');
		} else if (process.platform === 'win32') {
			console.log('   For Windows:');
			console.log('   npm install -g @biomejs/biome');
			console.log('   # or use winget');
			console.log('   winget install Biome.Biome');
		}

		console.log('\n🔧 [brAInwav] VS Code Extension Setup:');
		console.log('   1. Install the Biome extension');
		console.log('   2. Ensure "biome.lspBin" is set to the global path or left empty');
		console.log('   3. Restart VS Code after global installation');
	}

	async run() {
		console.log('🚀 [brAInwav] Starting Biome global installation check...\n');

		// Check global installation
		const installation = this.checkGlobalInstallation();
		
		if (!installation) {
			console.log('\n❌ [brAInwav] Biome global installation check failed');
			this.provideInstallationInstructions();
			return false;
		}

		// Check LSP capability
		this.checkLSPCapability();

		// Compare versions
		this.compareVersions();

		// Test LSP connection
		await this.testLSPConnection();

		// Summary
		console.log('\n📋 [brAInwav] Summary:');
		
		if (this.errors.length === 0) {
			console.log('✅ [brAInwav] All checks passed! Biome is ready for global LSP sessions');
		} else {
			console.log('❌ [brAInwav] Issues detected:');
			for (const error of this.errors) {
				console.log(`   • ${error}`);
			}
		}

		if (this.warnings.length > 0) {
			console.log('⚠️  [brAInwav] Warnings:');
			for (const warning of this.warnings) {
				console.log(`   • ${warning}`);
			}
		}

		console.log('\n💡 [brAInwav] The extension should now be able to start global LSP sessions');
		console.log('   for files outside of workspaces.');

		return this.errors.length === 0;
	}
}

// Run the checker if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const checker = new BiomeGlobalChecker();
	checker.run().then((success) => {
		process.exit(success ? 0 : 1);
	});
}

export { BiomeGlobalChecker };
