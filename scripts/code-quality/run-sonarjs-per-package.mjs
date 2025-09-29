#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { ESLint } from 'eslint';

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.ts', '.tsx']);
const IGNORED_DIRECTORIES = new Set([
	'dist',
	'node_modules',
	'coverage',
	'build',
	'.turbo',
	'.next',
	'out',
]);

const isIgnoredDirectory = (name) => IGNORED_DIRECTORIES.has(name);
const shouldIncludeFile = (name) => SOURCE_EXTENSIONS.has(path.extname(name));

function formatResultsAsUnix(results) {
	const lines = [];
	for (const result of results) {
		for (const message of result.messages) {
			const line = message.line ?? 0;
			const column = message.column ?? 0;
			const severity = message.severity === 2 ? 'error' : 'warning';
			const ruleSuffix = message.ruleId ? ` (${message.ruleId})` : '';
			lines.push(
				`${result.filePath}:${line}:${column}: ${severity} ${message.message}${ruleSuffix}`,
			);
		}
	}
	return lines.join('\n');
}

async function readDirEntries(current) {
	try {
		return await fs.promises.readdir(current, { withFileTypes: true });
	} catch (error) {
		if (error?.code === 'ENOTDIR') return [];
		throw error;
	}
}

function handleDirectoryEntry(entry, fullPath, pending) {
	if (!isIgnoredDirectory(entry.name)) pending.push(fullPath);
}

function handleFileEntry(entry, fullPath, files) {
	if (shouldIncludeFile(entry.name)) files.push(fullPath);
}

async function collectSourceFiles(rootDir) {
	const pending = [rootDir];
	const files = [];
	while (pending.length) {
		const current = pending.pop();
		const entries = await readDirEntries(current);
		for (const entry of entries) {
			const fullPath = path.join(current, entry.name);
			if (entry.isDirectory()) {
				handleDirectoryEntry(entry, fullPath, pending);
				continue;
			}
			if (!entry.isFile()) continue;
			handleFileEntry(entry, fullPath, files);
		}
	}
	return files;
}

function loadScanConfig(requireCJS) {
	const configCandidates = [
		path.resolve(process.cwd(), 'eslint.scan.config.cjs'),
		path.resolve(process.cwd(), 'config/eslint.scan.config.cjs'),
	];
	let lastError;
	for (const candidate of configCandidates) {
		try {
			return requireCJS(candidate);
		} catch (error) {
			lastError = error;
		}
	}
	const tried = configCandidates.join(', ');
	throw new Error(
		`Failed to load eslint scan config from [${tried}]: ${lastError?.message ?? 'unknown error'}`,
	);
}

async function runForDir(dir) {
	const name = path.basename(dir);
	const outPath = path.resolve(process.cwd(), 'reports', `eslint-sonar-${name}.out`);
	// ensure reports directory exists
	await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
	try {
		// Load the flat config (CJS file) and pass it as overrideConfig so ESLint
		// receives an object instead of an array/file path which avoids the
		// "configuration in --config is invalid" errors we hit earlier.
		const requireCJS = createRequire(import.meta.url);
		const scanCfg = loadScanConfig(requireCJS);
		const DEFAULT_IGNORES = [
			'**/dist/**',
			'**/node_modules/**',
			'**/coverage/**',
			'**/build/**',
			'**/.turbo/**',
			'**/.next/**',
			'**/out/**',
		];
		const rawConfigs = Array.isArray(scanCfg) ? scanCfg.slice(0, 1) : [scanCfg];
		const [primaryEntry] = rawConfigs;
		const restOfConfig = { ...(primaryEntry ?? {}) };
		if ('files' in restOfConfig) delete restOfConfig.files;
		const overrideConfig = [
			{
				...restOfConfig,
				ignores: [...(primaryEntry?.ignores ?? []), ...DEFAULT_IGNORES],
			},
		];

		// DEBUG: dump the overrideConfig to help diagnose CLIOptions validation
		// eslint-disable-next-line no-console
		console.log('DEBUG overrideConfig length:', overrideConfig.length);

		const eslint = new ESLint({
			overrideConfig,
			globInputPaths: false,
			cwd: process.cwd(),
			allowInlineConfig: true,
			overrideConfigFile: true,
		});

		const filesToLint = await collectSourceFiles(dir);
		if (!filesToLint.length) {
			const skipMessage = `Skipping ${name}: no .js/.mjs/.ts/.tsx sources found under ${dir}`;
			await fs.promises.writeFile(outPath, `${skipMessage}\n`, 'utf8');
			console.log(skipMessage);
			return { name, outPath, results: [] };
		}

		const results = await eslint.lintFiles(filesToLint);
		const output = formatResultsAsUnix(results);
		await fs.promises.writeFile(outPath, output, 'utf8');
		console.log(`${name}: wrote ${outPath}`);
		return { name, outPath, results };
	} catch (err) {
		const msg = `ERROR running sonar scan for ${name}: ${err?.stack ? err.stack : String(err)}`;
		await fs.promises.writeFile(outPath, msg, 'utf8');
		console.error(msg);
		return { name, outPath, results: [] };
	}
}

async function findTargets() {
	const root = process.cwd();
	const dirs = [];
	const entries = await fs.promises.readdir(root, { withFileTypes: true });
	for (const e of entries) {
		if ((e.name === 'apps' || e.name === 'packages') && e.isDirectory()) {
			const d = path.join(root, e.name);
			const children = await fs.promises.readdir(d, { withFileTypes: true });
			for (const c of children) {
				if (c.isDirectory()) dirs.push(path.join(d, c.name));
			}
		}
	}
	return dirs;
}

async function main() {
	const targets = await findTargets();
	if (!targets.length) {
		console.log('No package or app directories found to scan.');
		process.exit(0);
	}

	const results = [];
	for (const t of targets) {
		// run sequentially to avoid heavy parallel load
		// eslint-disable-next-line no-await-in-loop
		const r = await runForDir(t);
		results.push(r);
	}

	// write an index of reports
	const indexPath = path.resolve(process.cwd(), 'eslint-sonar-per-package-index.json');
	await fs.promises.writeFile(
		indexPath,
		JSON.stringify(
			results.map((r) => ({ name: r.name, out: r.outPath })),
			null,
			2,
		),
	);
	console.log(`Wrote index to ${indexPath}`);
}

main().catch((err) => {
	console.error(err?.stack ? err.stack : String(err));
	process.exit(2);
});
