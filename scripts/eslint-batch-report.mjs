#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/**
 * Batch ESLint runner to avoid OOM when linting the whole monorepo.
 * Strategy:
 *  1. Build file list of TS/TSX/JS/JSX under src/ (git tracked) unless an explicit list file provided.
 *  2. Chunk the list (default 120 files) and invoke ESLint per chunk with JSON formatter (stdout capture).
 *  3. Aggregate all JSON result arrays into one and write reports/eslint-source.json.
 *  4. Optionally ( --summary ) invoke eslint-rule-summary script.
 */
import { execa } from 'execa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArg(flag, fallback) {
	const idx = process.argv.indexOf(flag);
	if (idx !== -1 && idx < process.argv.length - 1) return process.argv[idx + 1];
	return fallback;
}
const hasFlag = (flag) => process.argv.includes(flag);

const listFile = parseArg('--list', 'reports/eslint-filelist.txt');
const chunkSize = parseInt(parseArg('--chunk-size', '120'), 10) || 120;
const outFile = parseArg('--out', 'reports/eslint-source.json');
const summary = hasFlag('--summary');

async function ensureFileList() {
	if (fs.existsSync(listFile)) {
		const content = fs.readFileSync(listFile, 'utf8').trim();
		if (content.length > 0) return content.split(/\n+/);
	}
	// Build with git ls-files (fallback) using dynamic import
	const { execSync } = await import('node:child_process');
	const raw = execSync("git ls-files '*.ts' '*.tsx' '*.js' '*.jsx'", {
		encoding: 'utf8',
	})
		.split(/\n+/)
		.filter(
			(f) => f.includes('/src/') && !f.endsWith('.d.ts') && f.trim().length > 0,
		);
	fs.mkdirSync(path.dirname(listFile), { recursive: true });
	fs.writeFileSync(listFile, raw.join('\n'));
	return raw;
}

(async () => {
	const allFiles = await ensureFileList();
	if (!allFiles.length) {
		console.error('[eslint-batch] No files to lint.');
		process.exit(1);
	}
	console.log(
		`[eslint-batch] Files: ${allFiles.length}  Chunk size: ${chunkSize}`,
	);
	const chunks = [];
	for (let i = 0; i < allFiles.length; i += chunkSize) {
		chunks.push(allFiles.slice(i, i + chunkSize));
	}
	console.log(`[eslint-batch] Total chunks: ${chunks.length}`);

	const aggregated = [];
	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		console.log(
			`[eslint-batch] Linting chunk ${i + 1}/${chunks.length} (${chunk.length} files)`,
		);
		try {
			const { stdout } = await execa(
				'pnpm',
				[
					'exec',
					'eslint',
					'--config=eslint.config.js',
					'-f',
					'json',
					'--no-error-on-unmatched-pattern',
					...chunk,
				],
				{
					reject: false, // we want to continue on non-zero exit
					stdout: 'pipe',
					stderr: 'inherit',
				},
			);
			// ESLint JSON output should be an array; parse & concat
			try {
				const parsed = JSON.parse(stdout || '[]');
				if (Array.isArray(parsed)) aggregated.push(...parsed);
				else
					console.warn(
						'[eslint-batch] Unexpected JSON structure for chunk',
						i + 1,
					);
			} catch (err) {
				console.warn(
					'[eslint-batch] Failed to parse JSON for chunk',
					i + 1,
					err.message,
				);
			}
		} catch (err) {
			console.warn(
				'[eslint-batch] Chunk process error',
				err.shortMessage || err.message,
			);
		}
	}

	fs.mkdirSync(path.dirname(outFile), { recursive: true });
	fs.writeFileSync(outFile, JSON.stringify(aggregated, null, 2));
	const totalMessages = aggregated.reduce(
		(acc, r) => acc + (r.messages?.length || 0),
		0,
	);
	console.log(
		`[eslint-batch] Wrote ${aggregated.length} file results with ${totalMessages} total messages to ${outFile}`,
	);

	if (summary) {
		const summaryScript = path.join(__dirname, 'eslint-rule-summary.mjs');
		if (fs.existsSync(summaryScript)) {
			console.log('[eslint-batch] Generating rule frequency summary...');
			await execa('node', [summaryScript, outFile], { stdio: 'inherit' });
		} else {
			console.warn('[eslint-batch] Summary script not found, skipping');
		}
	}
})();
