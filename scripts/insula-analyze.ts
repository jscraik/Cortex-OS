/**
 * Local Insula (@insula analyze) runner for Cortex-OS
 * Scans the workspace, runs StructureValidator, and prints a concise report.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import validator directly from source to avoid a build step
import {
	CORTEX_STRUCTURE_RULES,
	StructureValidator,
} from '../packages/cortex-structure-github/src/core/structure-validator.js';

const __filename = fileURLToPath(import.meta.url);

type Options = {
	root: string;
	maxFiles: number;
	ignore: string[];
};

function parseArgs(): Options {
	const args = process.argv.slice(2);
	const get = (flag: string, fallback?: string) => {
		const idx = args.indexOf(flag);
		return idx !== -1 ? args[idx + 1] : fallback;
	};

	const rootArg = get('--root', process.cwd());
	const root = path.resolve(rootArg ?? process.cwd());
	const maxStr = get('--max', '3000') ?? '3000';
	const maxFiles = Number.parseInt(maxStr, 10);
	const ignoreCsv = get('--ignore', 'node_modules,.git,.pnpm,dist,build,.next,coverage') ?? '';
	const ignore = ignoreCsv
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	return { root, maxFiles, ignore };
}

async function walkFiles(root: string, ignore: string[], maxFiles: number): Promise<string[]> {
	const files: string[] = [];

	const isIgnored = (rel: string) => {
		// Folder/file prefix ignore
		return ignore.some((ig) => rel === ig || rel.startsWith(`${ig}/`));
	};

	async function walk(dir: string, relBase = ''): Promise<void> {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const rel = path.posix.join(relBase, entry.name);
			if (entry.name.startsWith('.DS_') || isIgnored(rel)) continue;

			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(full, rel);
				if (files.length >= maxFiles) return;
			} else {
				files.push(rel);
				if (files.length >= maxFiles) return;
			}
		}
	}

	await walk(root);
	return files;
}

function printReport(
	root: string,
	fileCount: number,
	result: ReturnType<StructureValidator['analyzeRepository']>,
) {
	const { score, summary, violations } = result;

	// Summarize by type
	const byType = violations.reduce<Record<string, number>>((acc, v) => {
		acc[v.type] = (acc[v.type] || 0) + 1;
		return acc;
	}, {});

	// Top sample
	const samples = violations.slice(0, 10);

	const lines: string[] = [];
	lines.push(`Insula Structure Analysis`);
	lines.push(``);
	lines.push(`Root: ${root}`);
	lines.push(`Files scanned: ${fileCount}`);
	lines.push(`Score: ${score}/100`);
	lines.push(`Violations: ${summary.violationsCount} (auto-fixable: ${summary.autoFixableCount})`);
	if (Object.keys(byType).length) {
		lines.push(``);
		lines.push(`By type:`);
		for (const [t, c] of Object.entries(byType)) {
			lines.push(`- ${t}: ${c}`);
		}
	}
	if (samples.length) {
		lines.push(``);
		lines.push(`Samples:`);
		for (const v of samples) {
			const base = `- ${v.file} → ${v.message}`;
			const extra = v.suggestedPath ? ` (suggested: ${v.suggestedPath})` : '';
			lines.push(base + extra);
		}
	}

	// Output compact JSON as well for downstream tooling
	const json = {
		root,
		scanned: fileCount,
		score,
		summary,
		byType,
		sample: samples,
	};

	console.log(`\n${lines.join('\n')}`);
	console.log('\nJSON_RESULT_START');
	console.log(JSON.stringify(json));
	console.log('JSON_RESULT_END');
}

async function main() {
	const opts = parseArgs();

	// Ensure we run from repo root if invoked elsewhere
	const root = opts.root;
	const ignore = opts.ignore;
	const maxFiles = opts.maxFiles;

	const files = await walkFiles(root, ignore, maxFiles);
	const validator = new StructureValidator(CORTEX_STRUCTURE_RULES);
	const result = validator.analyzeRepository(files);
	printReport(root, files.length, result);
}

main().catch((err) => {
	console.error('Analysis failed:', err);
	process.exit(1);
});
