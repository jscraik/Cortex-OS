#!/usr/bin/env node
import { execSync } from 'node:child_process';
import os from 'node:os';
import { Command } from 'commander';

const platform = os.platform();

// Check if we're on a POSIX-compliant system (Linux/macOS)
const isPosix = platform !== 'win32';

function getProcessList(pattern) {
	if (!isPosix) {
		console.warn('[brAInwav memory-guard] Process monitoring not supported on Windows');
		return [];
	}
	const output = execSync('ps -eo pid,rss,command').toString().trim().split('\n').slice(1);

	return output
		.map((line) => {
			const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
			if (!match) return null;
			const pid = Number(match[1]);
			const rssMB = Number(match[2]) / 1024;
			const cmd = match[3];
			if (pattern && !cmd.includes(pattern)) return null;
			if (pid === process.pid) return null;
			return { pid, rssMB, cmd };
		})
		.filter(Boolean);
}

function getRssMB(pid) {
	// Validate that pid is a positive integer
	if (!Number.isInteger(pid) || pid <= 0) {
		return 0;
	}
	if (!isPosix) {
		return 0;
	}
	try {
		const out = execSync(`ps -o rss= -p ${pid}`).toString().trim();
		return Number(out) / 1024;
	} catch {
		return 0;
	}
}

function log(entry) {
	console.log(JSON.stringify({ timestamp: new Date().toISOString(), platform, ...entry }));
}

export function startGuard({ pids = [], pattern = 'node', maxRssMB, intervalMs }) {
	// Validate pids are all positive integers
	const validPids = pids.filter(pid => Number.isInteger(pid) && pid > 0);
	if (validPids.length !== pids.length && pids.length > 0) {
		console.warn('[brAInwav memory-guard] Invalid PIDs detected and filtered out');
	}

	const warned = new Map();
	const timer = setInterval(() => {
		const targets =
			validPids.length > 0
				? validPids.map((pid) => ({ pid, rssMB: getRssMB(pid) }))
				: getProcessList(pattern);
		targets.forEach(({ pid, rssMB }) => {
			log({ pid, rssMB, action: 'check' });
			if (rssMB > maxRssMB) {
				if (!warned.has(pid)) {
					if (isPosix) {
						try {
							process.kill(pid, 'SIGUSR2');
						} catch {}
						warned.set(pid, true);
						log({ pid, rssMB, action: 'sigusr2' });
					} else {
						// On Windows, warn that process control is not available
						console.warn(`[brAInwav memory-guard] Process ${pid} exceeds memory limit (${rssMB}MB > ${maxRssMB}MB) but cannot be controlled on Windows`);
						warned.set(pid, true);
						log({ pid, rssMB, action: 'windows-warning' });
					}
				} else {
					if (isPosix) {
						try {
							process.kill(pid, 'SIGKILL');
						} catch {}
						log({ pid, rssMB, action: 'killed' });
					} else {
						console.warn(`[brAInwav memory-guard] Process ${pid} still exceeds memory limit on Windows - manual intervention required`);
						log({ pid, rssMB, action: 'windows-fatal-warning' });
					}
				}
			}
		});
	}, intervalMs);
	return timer;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const program = new Command();
	program
		.option('--pid <pid...>', 'specific PIDs to monitor', (value) => value.map(Number))
		.option('--pattern <pattern>', 'process command pattern', 'node')
		.option('--max <mb>', 'max RSS in MB', (value) => parseInt(value, 10), 1024)
		.option('--interval <ms>', 'polling interval in ms', (value) => parseInt(value, 10), 5000);
	program.parse(process.argv);
	const opts = program.opts();
	startGuard({
		pids: opts.pid || [],
		pattern: opts.pid ? '' : opts.pattern,
		maxRssMB: opts.max,
		intervalMs: opts.interval,
	});
}
