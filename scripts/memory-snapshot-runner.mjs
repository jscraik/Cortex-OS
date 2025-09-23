#!/usr/bin/env node
/**
 * memory-snapshot-runner.mjs
 *
 * Execute a target command under strict memory flags while:
 *  - Capturing a near-heap-limit snapshot (Node --heapsnapshot-near-heap-limit)
 *  - Optionally forcing an additional manual snapshot via inspector
 *  - Recording periodic RSS samples (ps) to a JSONL log
 *  - Emitting a final summary + optional diff vs previous run
 *
 * Usage:
 *   node scripts/memory-snapshot-runner.mjs -- cmd args...
 *   node scripts/memory-snapshot-runner.mjs --label vitest-core -- node scripts/vitest-safe.mjs run --reporter=dot
 *
 * Options:
 *   --label <name>          Logical label; used in output filenames (default: generic)
 *   --interval <ms>         Sampling interval (default 3000)
 *   --no-manual-snapshot    Skip manual inspector heap snapshot trigger
 *   --limit-mb <mb>         RSS soft limit; warn when exceeded
 *   --fail-over-mb <mb>     Hard fail if RSS exceeds this value
 *   --json                  Emit machine-readable summary JSON to stdout
 *   --prom                  Emit Prometheus metrics file (.memory/metrics/<label>.prom)
 *
 * Output:
 *   .memory/snapshots/<timestamp>-<label>-auto.heapsnapshot   (auto, from near-heap-limit trigger if reached)
 *   .memory/snapshots/<timestamp>-<label>-manual.heapsnapshot (manual, if enabled)
 *   .memory/logs/<timestamp>-<label>.jsonl (RSS samples)
 *   reports/memory-snapshot-summary.json (latest summary)
 */

import { execSync, spawn } from 'node:child_process';
import {
	createWriteStream,
	existsSync,
	mkdirSync,
	readdirSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const memoryDir = join(rootDir, '.memory');
const snapshotDir = join(memoryDir, 'snapshots');
const logDir = join(memoryDir, 'logs');

for (const d of [memoryDir, snapshotDir, logDir]) {
	try {
		if (!existsSync(d)) mkdirSync(d, { recursive: true });
	} catch { }
}

function log(level, msg) {
	const ts = new Date().toISOString();
	console.error(`[${ts}] [MEM-SNAPSHOT] [${level}] ${msg}`);
}

function parseArgs() {
	const args = process.argv.slice(2);
	const opts = {
		label: 'generic',
		interval: 3000,
		manual: true,
		limitMb: null,
		failOverMb: null,
		json: false,
		prom: false,
		cmd: [],
	};
	let i = 0;
	while (i < args.length) {
		const a = args[i];
		if (a === '--') {
			opts.cmd = args.slice(i + 1);
			break;
		}
		switch (a) {
			case '--label':
				opts.label = args[i + 1] || opts.label;
				i += 2;
				break;
			case '--interval':
				opts.interval = parseInt(args[i + 1] || '3000', 10);
				i += 2;
				break;
			case '--no-manual-snapshot':
				opts.manual = false;
				i += 1;
				break;
			case '--limit-mb':
				opts.limitMb = parseInt(args[i + 1], 10);
				i += 2;
				break;
			case '--fail-over-mb':
				opts.failOverMb = parseInt(args[i + 1], 10);
				i += 2;
				break;
			case '--json':
				opts.json = true;
				i += 1;
				break;
			case '--prom':
				opts.prom = true;
				i += 1;
				break;
			case '--help':
			case '-h':
				console.log(
					'Usage: node scripts/memory-snapshot-runner.mjs [options] -- <command> [args...]',
				);
				process.exit(0);
				break;
			default:
				i += 1;
				break;
		}
	}
	if (opts.cmd.length === 0) {
		log('ERROR', 'No command provided after --');
		process.exit(1);
	}
	return opts;
}

function listRecentSnapshots(limit = 5) {
	try {
		const files = readdirSync(snapshotDir)
			.filter((f) => f.endsWith('.heapsnapshot'))
			.map((f) => ({
				file: f,
				path: join(snapshotDir, f),
				mtime: statSync(join(snapshotDir, f)).mtimeMs,
				size: statSync(join(snapshotDir, f)).size,
			}))
			.sort((a, b) => b.mtime - a.mtime)
			.slice(0, limit);
		return files;
	} catch {
		return [];
	}
}

function listChildPidsRecursive(pid) {
	// Recursively collect child PIDs using pgrep -P. Handles multiple generations.
	const seen = new Set();
	const queue = [pid];
	const all = new Set();
	while (queue.length) {
		const current = queue.pop();
		if (!current || seen.has(current)) continue;
		seen.add(current);
		try {
			const out = execSync(`pgrep -P ${current} || true`, { encoding: 'utf8' }).trim();
			if (!out) continue;
			const children = out
				.split('\n')
				.map((s) => s.trim())
				.filter(Boolean)
				.map((s) => parseInt(s, 10))
				.filter((n) => Number.isFinite(n));
			for (const c of children) {
				if (!all.has(c)) {
					all.add(c);
					queue.push(c);
				}
			}
		} catch {
			/* ignore */
		}
	}
	return Array.from(all);
}

function rssForPid(pid) {
	try {
		const out = execSync(`ps -o rss= -p ${pid}`).toString().trim();
		return parseInt(out, 10) || 0; // KB
	} catch {
		return 0;
	}
}

function rssForProcessTree(rootPid) {
	// Sum RSS for root + all descendants (KB)
	let total = rssForPid(rootPid);
	const children = listChildPidsRecursive(rootPid);
	for (const c of children) total += rssForPid(c);
	return total;
}

function manualHeapSnapshot(_label, _ts) {
	// Manual snapshot via inspector protocol (requires --inspect / can use node --heap-prof) – simplified approach: use kill -USR2 for node >=16 to trigger heap profile (works for CPU profile; for heap snapshot we rely on near-heap-limit). As a fallback, we simply log.
	// NOTE: Advanced manual snapshot automation (inspector client) intentionally deferred to keep script dependency-light.
	log('INFO', 'Manual snapshot trigger placeholder (inspector automation can be added later).');
	// This placeholder keeps script lightweight and avoids complex deps.
	return null;
}

function formatMB(kb) {
	return (kb / 1024).toFixed(2);
}

function main() {
	const opts = parseArgs();
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const logFile = join(logDir, `${timestamp}-${opts.label}.jsonl`);
	const outStream = createWriteStream(logFile, { flags: 'a' });
	log('INFO', `Starting memory snapshot run label=${opts.label} interval=${opts.interval}ms`);

	const childEnv = {
		...process.env,
		NODE_OPTIONS:
			`${process.env.NODE_OPTIONS || ''} --max-old-space-size=1536 --heapsnapshot-near-heap-limit=1 --expose-gc`.trim(),
	};

	// If the first element is '--' (edge case), drop it
	const cmdParts = opts.cmd[0] === '--' ? opts.cmd.slice(1) : opts.cmd;
	const child = spawn(cmdParts[0], cmdParts.slice(1), {
		stdio: 'inherit',
		env: childEnv,
	});

	let peakRssKB = 0;
	const samples = [];
	const sampleInterval = setInterval(() => {
		const rssKB = rssForProcessTree(child.pid);
		if (rssKB === 0) return; // child exited
		const sample = { t: Date.now(), rssKB };
		samples.push(sample);
		if (rssKB > peakRssKB) peakRssKB = rssKB;
		outStream.write(`${JSON.stringify(sample)}\n`);
		if (opts.limitMb && rssKB / 1024 > opts.limitMb) {
			log('WARN', `RSS exceeded soft limit (${formatMB(rssKB)}MB > ${opts.limitMb}MB)`);
		}
		if (opts.failOverMb && rssKB / 1024 > opts.failOverMb) {
			log(
				'ERROR',
				`RSS exceeded hard limit (${formatMB(rssKB)}MB > ${opts.failOverMb}MB). Terminating.`,
			);
			try {
				child.kill('SIGTERM');
			} catch { }
			setTimeout(() => {
				try {
					child.kill('SIGKILL');
				} catch { }
			}, 2000);
		}
	}, opts.interval);

	child.on('close', (code, signal) => {
		clearInterval(sampleInterval);
		outStream.end();
		let manualSnapshotFile = null;
		if (opts.manual) {
			manualSnapshotFile = manualHeapSnapshot(opts.label, timestamp);
		}
		const recent = listRecentSnapshots(3);
		const summary = {
			label: opts.label,
			timestamp,
			exitCode: code,
			signal,
			peakRssMB: parseFloat(formatMB(peakRssKB)),
			samples: samples.length,
			logFile,
			manualSnapshotFile,
			recentSnapshots: recent,
		};
		try {
			mkdirSync(join(rootDir, 'reports'), { recursive: true });
		} catch { }
		try {
			writeFileSync(
				join(rootDir, 'reports', 'memory-snapshot-summary.json'),
				JSON.stringify(summary, null, 2),
			);
		} catch { }

		// Optional Prometheus metrics emission
		const promEnabled = opts.prom || process.env.MEMORY_PROM_METRICS === '1';
		if (promEnabled) {
			try {
				const metricsDir = join(memoryDir, 'metrics');
				if (!existsSync(metricsDir)) mkdirSync(metricsDir, { recursive: true });
				const promLines = [];
				promLines.push(
					'# HELP cortex_memory_peak_rss_bytes Peak resident set size during monitored run',
				);
				promLines.push('# TYPE cortex_memory_peak_rss_bytes gauge');
				promLines.push(`cortex_memory_peak_rss_bytes{label="${opts.label}"} ${peakRssKB * 1024}`);
				promLines.push('# HELP cortex_memory_samples_total Number of RSS samples collected');
				promLines.push('# TYPE cortex_memory_samples_total counter');
				promLines.push(`cortex_memory_samples_total{label="${opts.label}"} ${samples.length}`);
				const durationsMs = samples.length > 1 ? samples[samples.length - 1].t - samples[0].t : 0;
				promLines.push(
					'# HELP cortex_memory_observation_window_ms Milliseconds covered by sampling window',
				);
				promLines.push('# TYPE cortex_memory_observation_window_ms gauge');
				promLines.push(`cortex_memory_observation_window_ms{label="${opts.label}"} ${durationsMs}`);
				writeFileSync(join(metricsDir, `${opts.label}.prom`), `${promLines.join('\n')}\n`);
				log('INFO', `Prometheus metrics written (${opts.label}.prom)`);
			} catch (e) {
				log('WARN', `Failed to write Prometheus metrics: ${e.message}`);
			}
		}
		if (opts.json) {
			console.log(JSON.stringify(summary));
		} else {
			log('INFO', `Peak RSS: ${summary.peakRssMB}MB over ${samples.length} samples`);
			const recentStr = recent
				.map((r) => `${r.file}(${(r.size / 1024 / 1024).toFixed(1)}MB)`)
				.join(', ');
			log('INFO', `Recent snapshots: ${recentStr || 'none'}`);
		}
		process.exit(code || 0);
	});
	child.on('error', (err) => {
		clearInterval(sampleInterval);
		outStream.end();
		log('ERROR', `Child process error: ${err.message}`);
		process.exit(1);
	});
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		main();
	} catch (err) {
		log('ERROR', err.stack || err.message);
		process.exit(1);
	}
}
