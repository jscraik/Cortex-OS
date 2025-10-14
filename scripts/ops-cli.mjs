#!/usr/bin/env node

/**
 * brAInwav Operational Management CLI
 * Provides operational commands for performance monitoring and maintenance
 */

import { program } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NxCacheManager } from '../apps/cortex-os/src/operational/nx-cache-manager.js';

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
		const manager = new NxCacheManager();
		const stats = manager.getCacheStats();
		
		console.log('📊 brAInwav Nx Cache Statistics:');
		console.log(`  Status: ${stats.exists ? '✅ Active' : '❌ Not Found'}`);
		if (stats.exists) {
			console.log(`  Size: ${formatBytes(stats.sizeBytes)} (${stats.utilizationPercent.toFixed(1)}% of limit)`);
			console.log(`  Files: ${stats.fileCount.toLocaleString()}`);
			console.log(`  Oldest: ${stats.oldestFile?.toLocaleString() || 'N/A'}`);
			console.log(`  Newest: ${stats.newestFile?.toLocaleString() || 'N/A'}`);
		}
	});

cacheCommand
	.command('clean')
	.description('Clean cache based on age and size limits')
	.option('-f, --force', 'Force cleanup regardless of thresholds')
	.option('-r, --reset', 'Reset entire cache')
	.action(async (options) => {
		const manager = new NxCacheManager();
		
		console.log('🧹 brAInwav Cache Cleanup Starting...');
		
		const result = await manager.cleanCache({
			force: options.force,
			reset: options.reset,
		});
		
		console.log('✅ Cleanup Complete:');
		console.log(`  Strategy: ${result.strategy}`);
		console.log(`  Files removed: ${result.filesRemoved.toLocaleString()}`);
		console.log(`  Space saved: ${formatBytes(result.spaceSaved)}`);
		console.log(`  Size: ${formatBytes(result.initialSize)} → ${formatBytes(result.finalSize)}`);
	});

// Process management commands
const processCommand = program
	.command('process')
	.description('Process management operations');

processCommand
	.command('list')
	.description('List managed processes')
	.action(() => {
		console.log('📋 brAInwav Managed Processes:');
		console.log('  Process management requires active runtime');
		console.log('  Use: pnpm dev (in another terminal) to see active processes');
	});

processCommand
	.command('health')
	.description('Check process health')
	.action(() => {
		console.log('🏥 brAInwav Process Health Check:');
		console.log('  Process health monitoring requires active runtime');
	});

// Performance optimization commands
const perfCommand = program
	.command('perf')
	.description('Performance optimization operations');

perfCommand
	.command('optimize')
	.description('Run comprehensive performance optimization')
	.action(async () => {
		console.log('⚡ brAInwav Performance Optimization:');
		
		// Cache optimization
		const cacheManager = new NxCacheManager();
		const cacheStats = cacheManager.getCacheStats();
		
		if (cacheStats.exists && cacheStats.utilizationPercent > 70) {
			console.log('  🧹 Optimizing cache...');
			const result = await cacheManager.cleanCache({ force: false });
			console.log(`    Saved: ${formatBytes(result.spaceSaved)}`);
		} else {
			console.log('  ✅ Cache is optimal');
		}
		
		// Node modules cleanup
		console.log('  🔍 Checking node_modules...');
		const nodeModulesSize = await getDirectorySize('node_modules');
		if (nodeModulesSize > 5 * 1024 * 1024 * 1024) { // 5GB
			console.log('  ⚠️  node_modules is large (>5GB), consider: pnpm prune');
		} else {
			console.log('  ✅ node_modules size is reasonable');
		}
		
		console.log('✅ Performance optimization complete');
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

async function getDirectorySize(path) {
	if (!existsSync(path)) return 0;
	
	try {
		const { execSync } = await import('child_process');
		const output = execSync(`du -sb ${path} 2>/dev/null || echo "0"`, { 
			encoding: 'utf8',
			timeout: 10000 
		});
		return parseInt(output.trim().split('\t')[0] || '0', 10);
	} catch {
		return 0;
	}
}

// Error handling
process.on('unhandledRejection', (error) => {
	console.error('❌ brAInwav operational command failed:', error);
	process.exit(1);
});

program.parse();