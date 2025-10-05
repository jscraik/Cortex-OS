#!/usr/bin/env node
/**
 * brAInwav TypeScript Server Monitor
 * Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
 *
 * Monitors TypeScript server health and provides early warning of issues
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const REPORTS_DIR = './reports';
const MONITOR_FILE = join(REPORTS_DIR, 'ts-server-monitor.json');

class TypeScriptServerMonitor {
	ensureReportsDir() {
		if (!existsSync(REPORTS_DIR)) {
			mkdirSync(REPORTS_DIR, { recursive: true });
		}
	}

	getProcessInfo() {
		try {
			const output = execSync('ps aux | grep -i tsserver | grep -v grep', { encoding: 'utf8' });
			const lines = output
				.trim()
				.split('\n')
				.filter((line) => line.trim());

			return lines.map((line) => {
				const parts = line.trim().split(/\s+/);
				const pid = parts[1];
				const cpu = parseFloat(parts[2]) || 0;
				const memory = parseFloat(parts[3]) || 0;
				const memoryMB = parseInt(parts[5]) / 1024; // Convert KB to MB
				const command = parts.slice(10).join(' ');

				// Extract relevant info from command
				const isPartialSemantic = command.includes('--serverMode partialSemantic');
				const hasNxPlugin = command.includes('@nx-console/vscode-typescript-import-plugin');
				const hasCopilotPlugin = command.includes('@vscode/copilot-typescript-server-plugin');
				const memoryLimit = command.match(/--max-old-space-size=(\d+)/)?.[1] || 'default';

				return {
					pid,
					cpu,
					memory,
					memoryMB: Math.round(memoryMB),
					isPartialSemantic,
					hasNxPlugin,
					hasCopilotPlugin,
					memoryLimit,
					command: command.substring(0, 100) + '...',
				};
			});
		} catch (error) {
			return [];
		}
	}

	analyzeHealth(processes) {
		const issues = [];
		const warnings = [];

		// Check number of processes
		if (processes.length === 0) {
			warnings.push('No TypeScript server processes found');
		} else if (processes.length > 4) {
			issues.push(`Too many TypeScript processes running (${processes.length}). Recommended: ≤4`);
		} else if (processes.length > 2) {
			warnings.push(
				`Multiple TypeScript processes detected (${processes.length}). Monitor memory usage`,
			);
		}

		// Check memory usage
		const totalMemory = processes.reduce((sum, proc) => sum + proc.memoryMB, 0);
		const maxMemory = Math.max(...processes.map((proc) => proc.memoryMB));

		if (maxMemory > 2000) {
			issues.push(`High memory usage detected: ${maxMemory}MB per process`);
		} else if (maxMemory > 1500) {
			warnings.push(`Elevated memory usage: ${maxMemory}MB per process`);
		}

		if (totalMemory > 4000) {
			issues.push(`Total TypeScript memory usage: ${totalMemory}MB`);
		}

		// Check for problematic plugins
		const nxPluginCount = processes.filter((proc) => proc.hasNxPlugin).length;
		if (nxPluginCount > 0) {
			issues.push(
				`Nx Console plugin detected in ${nxPluginCount} processes (known to cause crashes)`,
			);
		}

		// Check memory limits
		const lowMemoryLimits = processes.filter(
			(proc) => proc.memoryLimit !== 'default' && parseInt(proc.memoryLimit) < 8192,
		).length;

		if (lowMemoryLimits > 0) {
			warnings.push(`${lowMemoryLimits} processes with memory limit <8192MB`);
		}

		return {
			status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy',
			issues,
			warnings,
			totalMemory,
			maxMemory,
			processCount: processes.length,
		};
	}

	generateReport(processes, health) {
		const report = {
			timestamp: new Date().toISOString(),
			processCount: processes.length,
			totalMemoryMB: health.totalMemory,
			maxMemoryMB: health.maxMemory,
			status: health.status,
			issues: health.issues,
			warnings: health.warnings,
			processes: processes,
			recommendations: this.getRecommendations(health, processes),
		};

		return report;
	}

	getRecommendations(health, processes) {
		const recommendations = [];

		if (health.status === 'critical') {
			recommendations.push('Run: pnpm ts:server:recovery');
			recommendations.push('Restart your IDE');
			recommendations.push('Disable nrwl.angular-console extension');
		}

		if (health.processCount > 4) {
			recommendations.push('Terminate excess TypeScript processes');
		}

		if (health.maxMemory > 1500) {
			recommendations.push('Apply performance configuration: pnpm ts:configure:performance');
		}

		if (processes.some((proc) => proc.hasNxPlugin)) {
			recommendations.push('Disable Nx Console extension to prevent crashes');
		}

		if (health.status === 'healthy') {
			recommendations.push('TypeScript server is running optimally');
		}

		return recommendations;
	}

	printReport(report) {
		console.log('🔍 brAInwav TypeScript Server Monitor');
		console.log('=====================================');
		console.log(`Status: ${this.getStatusEmoji(report.status)} ${report.status.toUpperCase()}`);
		console.log(`Processes: ${report.processCount}`);
		console.log(`Total Memory: ${report.totalMemoryMB}MB`);
		console.log(`Peak Memory: ${report.maxMemoryMB}MB`);

		if (report.issues.length > 0) {
			console.log('\n❌ Critical Issues:');
			for (const issue of report.issues) {
				console.log(`  • ${issue}`);
			}
		}

		if (report.warnings.length > 0) {
			console.log('\n⚠️ Warnings:');
			for (const warning of report.warnings) {
				console.log(`  • ${warning}`);
			}
		}

		if (report.processes.length > 0) {
			console.log('\n📊 Process Details:');
			report.processes.forEach((proc, i) => {
				console.log(`  ${i + 1}. PID ${proc.pid}: ${proc.memoryMB}MB, CPU ${proc.cpu}%`);
				if (proc.hasNxPlugin) console.log('     ⚠️ Has Nx Console plugin');
				if (proc.hasCopilotPlugin) console.log('     ℹ️ Has Copilot plugin');
				if (proc.isPartialSemantic) console.log('     ℹ️ Partial semantic mode');
			});
		}

		console.log('\n💡 Recommendations:');
		for (const rec of report.recommendations) {
			console.log(`  • ${rec}`);
		}

		console.log(`\n📝 Report saved: ${MONITOR_FILE}`);
	}

	getStatusEmoji(status) {
		switch (status) {
			case 'healthy':
				return '✅';
			case 'warning':
				return '⚠️';
			case 'critical':
				return '❌';
			default:
				return '❓';
		}
	}

	async run() {
		this.ensureReportsDir();

		const processes = this.getProcessInfo();
		const health = this.analyzeHealth(processes);
		const report = this.generateReport(processes, health);

		// Save report
		writeFileSync(MONITOR_FILE, JSON.stringify(report, null, 2));

		// Print summary
		this.printReport(report);

		// Exit with appropriate code
		process.exit(health.status === 'critical' ? 1 : 0);
	}
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
	const monitor = new TypeScriptServerMonitor();
	monitor.run().catch((error) => {
		console.error('❌ TypeScript server monitor failed:', error);
		process.exit(1);
	});
}

export { TypeScriptServerMonitor };
