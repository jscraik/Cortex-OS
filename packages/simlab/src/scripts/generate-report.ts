#!/usr/bin/env tsx

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { SimReporter } from '../report.js';
import type { SimBatchResult, SimReport } from '../types.js';

/**
 * Generate simulation reports and analytics
 * - Reads JSONL files in sim/runs
 * - Aggregates latest N batches into a report
 * - Writes sim/reports/latest.json and a timestamped archive
 */
async function generateReport() {
	console.log('📊 Generating SimLab reports...');

	const cwd = process.cwd();
	const runsDir = join(cwd, 'sim/runs');
	const reportsDir = join(cwd, 'sim/reports');
	mkdirSync(reportsDir, { recursive: true });

	// Discover recent run files (JSON or JSONL)
	const files = safeListFiles(runsDir)
		.filter((f) => f.endsWith('.json') || f.endsWith('.jsonl'))
		.sort(); // lexicographic sort keeps date prefixes ordered

	if (files.length === 0) {
		console.warn('⚠️  No run files found in sim/runs — nothing to report.');
		return;
	}

	// Load up to the last 10 batches for trend calculation
	const take = Math.min(files.length, 10);
	const recent = files.slice(-take);

	const reporter = new SimReporter();
	const batchResults: SimBatchResult[] = [];

	for (const file of recent) {
		const abs = join(runsDir, file);
		const batch = parseBatchFromFile(abs);
		// If parsing fails or results empty, skip
		if (batch && batch.scenarios.length > 0) {
			const batchId = basename(file).replace(/\.(json|jsonl)$/i, '');
			const computed = reporter.createBatchResult(batchId, batch.scenarios as any);
			batchResults.push(computed);
		}
	}

	if (batchResults.length === 0) {
		console.warn('⚠️  No valid batch results parsed from sim/runs.');
		return;
	}

	const report: SimReport = reporter.createReport(batchResults);

	// Write outputs
	const latestPath = join(reportsDir, 'latest.json');
	writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf-8');

	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const archivePath = join(reportsDir, `${stamp}.json`);
	writeFileSync(archivePath, JSON.stringify(report, null, 2), 'utf-8');

	console.log(`✅ Report written: ${latestPath}`);
	console.log(`🗂️  Archived: ${archivePath}`);
}

function safeListFiles(dir: string): string[] {
	try {
		return readdirSync(dir);
	} catch {
		return [];
	}
}

function parseBatchFromFile(absPath: string): { scenarios: any[] } | null {
	try {
		const txt = readFileSync(absPath, 'utf-8');
		if (absPath.endsWith('.jsonl')) {
			const scenarios = txt
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter(Boolean)
				.map((l) => JSON.parse(l));
			return { scenarios };
		}
		// JSON: either a batch object or array of scenarios
		const parsed = JSON.parse(txt);
		if (Array.isArray(parsed)) return { scenarios: parsed };
		if (parsed && Array.isArray(parsed.scenarios)) return { scenarios: parsed.scenarios };
		return null;
	} catch (e) {
		console.warn(`⚠️  Failed to parse ${absPath}:`, e instanceof Error ? e.message : e);
		return null;
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	generateReport().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
