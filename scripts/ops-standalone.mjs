#!/usr/bin/env node

/**
 * brAInwav Operational Management CLI (Standalone)
 * Performance monitoring and maintenance tools
 */

import { program } from 'commander';
import { existsSync, statSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

program
	.name('brAInwav-ops')
	.description('brAInwav Cortex-OS operational management tools')
	.version('1.0.0');

// Cache management commands
const cacheCommand = program
	.command('cache')
	.description('Nx cache management operations');

cacheCommand
	.command('stats')
	.description('Show cache statistics')
	.action(async () => {
		const cacheDir = join(process.cwd(), '.nx', 'cache');
		
		console.log('📊 brAInwav Nx Cache Statistics:');
		
		if (!existsSync(cacheDir)) {
			console.log('  Status: ❌ Not Found');
			return;
		}
		
		console.log('  Status: ✅ Active');
		
		try {
			// Calculate cache size and file count
			let totalSize = 0;
			let fileCount = 0;
			let oldestTime = Date.now();
			let newestTime = 0;
			
			const scanDir = (dir) => {
				try {
					const entries = readdirSync(dir, { withFileTypes: true });
					for (const entry of entries) {
						const fullPath = join(dir, entry.name);
						if (entry.isDirectory()) {
							scanDir(fullPath);
						} else {
							const stats = statSync(fullPath);
							totalSize += stats.size;
							fileCount++;
							oldestTime = Math.min(oldestTime, stats.mtime.getTime());
							newestTime = Math.max(newestTime, stats.mtime.getTime());
						}
					}
				} catch (error) {
					// Skip directories we can't read
				}
			};
			
			scanDir(cacheDir);
			
			console.log(`  Size: ${formatBytes(totalSize)}`);
			console.log(`  Files: ${fileCount.toLocaleString()}`);
			
			if (fileCount > 0) {
				console.log(`  Oldest: ${new Date(oldestTime).toLocaleString()}`);
				console.log(`  Newest: ${new Date(newestTime).toLocaleString()}`);
			}
		} catch (error) {
			console.log(`  Error: ${error.message}`);
		}
	});

cacheCommand
	.command('clean')
	.description('Clean cache')
	.option('-f, --force', 'Force cleanup')
	.option('-r, --reset', 'Reset entire cache')
	.action(async (options) => {
		console.log('🧹 brAInwav Cache Cleanup Starting...');
		
		if (options.reset) {
			try {
				execSync('npx nx reset', { stdio: 'pipe', timeout: 30000 });
				console.log('✅ Nx cache reset completed');
			} catch (error) {
				console.log('⚠️ Nx reset failed, trying manual cleanup...');
				const cacheDir = join(process.cwd(), '.nx', 'cache');
				if (existsSync(cacheDir)) {
					rmSync(cacheDir, { recursive: true, force: true });
					console.log('✅ Manual cache cleanup completed');
				}
			}
		} else {
			console.log('💡 Use --reset flag for full cache reset');
		}
	});

// System info commands
const infoCommand = program
	.command('info')
	.description('System information and diagnostics');

infoCommand
	.command('system')
	.description('Show system information')
	.action(() => {
		console.log('💻 brAInwav System Information:');
		console.log(`  Node.js: ${process.version}`);
		console.log(`  Platform: ${process.platform} ${process.arch}`);
		console.log(`  Memory: ${formatBytes(process.memoryUsage().rss)} RSS`);
		console.log(`  Uptime: ${formatDuration(process.uptime() * 1000)}`);
		console.log(`  Working Directory: ${process.cwd()}`);
	});

infoCommand
	.command('env')
	.description('Show environment configuration')
	.action(() => {
		console.log('🌍 brAInwav Environment Configuration:');
		
		const envVars = [
			'NODE_ENV',
			'CORTEX_HTTP_PORT',
			'CORTEX_MCP_MANAGER_PORT',
			'CORTEX_RAG_HTTP_PORT',
			'CORTEX_PRIVACY_MODE',
			'NX_INTERACTIVE',
		];
		
		for (const envVar of envVars) {
			const value = process.env[envVar];
			console.log(`  ${envVar}: ${value || '(not set)'}`);
		}
	});

// Performance optimization commands
const perfCommand = program
	.command('perf')
	.description('Performance optimization operations');

perfCommand
	.command('optimize')
	.description('Run performance optimization')
	.action(async () => {
		console.log('⚡ brAInwav Performance Optimization:');
		
		// Check cache
		const cacheDir = join(process.cwd(), '.nx', 'cache');
		if (existsSync(cacheDir)) {
			console.log('  🔍 Checking cache...');
			try {
				const cacheSize = parseInt(execSync(`du -sm "${cacheDir}" 2>/dev/null | cut -f1`, { encoding: 'utf8' }).trim()) || 0;
				console.log(`    Cache size: ${cacheSize}MB`);
				
				if (cacheSize > 5000) {  // > 5GB
					console.log('  🧹 Cache is large, consider cleaning...');
					console.log('    Run: pnpm ops:cache:clean --reset');
				} else {
					console.log('  ✅ Cache size is reasonable');
				}
			} catch (error) {
				console.log('  ⚠️ Could not check cache size');
			}
		} else {
			console.log('  ✅ No cache found');
		}
		
		// Check node_modules
		if (existsSync('node_modules')) {
			console.log('  🔍 Checking node_modules...');
			try {
				const nodeModulesSize = parseInt(execSync('du -sm node_modules 2>/dev/null | cut -f1', { encoding: 'utf8' }).trim()) || 0;
				console.log(`    node_modules size: ${nodeModulesSize}MB`);
				
				if (nodeModulesSize > 5000) {  // > 5GB
					console.log('  ⚠️ node_modules is large, consider: pnpm prune');
				} else {
					console.log('  ✅ node_modules size is reasonable');
				}
			} catch (error) {
				console.log('  ⚠️ Could not check node_modules size');
			}
		}
		
		console.log('✅ Performance check complete');
	});

// Utility functions
function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDuration(ms) {
	const seconds = Math.floor(ms / 1000) % 60;
	const minutes = Math.floor(ms / 60000) % 60;
	const hours = Math.floor(ms / 3600000) % 24;
	const days = Math.floor(ms / 86400000);
	
	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

// Error handling
process.on('unhandledRejection', (error) => {
	console.error('❌ brAInwav operational command failed:', error);
	process.exit(1);
});

program.parse();