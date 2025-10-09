#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const baselinePath = path.join(repoRoot, 'reports', 'baseline', 'dependency-watch.json');

function loadBaseline() {
	if (!existsSync(baselinePath)) {
		return {};
	}
	try {
		return JSON.parse(readFileSync(baselinePath, 'utf8'));
	} catch (error) {
		console.warn('brAInwav dependency watch: failed to read baseline, starting fresh', error);
		return {};
	}
}

function selectLatestVersion(payload) {
	const buckets = [];
	if (Array.isArray(payload)) buckets.push(...payload);
	if (payload && typeof payload === 'object') {
		if (Array.isArray(payload.versions)) buckets.push(...payload.versions);
		if (Array.isArray(payload.available_versions)) buckets.push(...payload.available_versions);
		if (payload.releases && typeof payload.releases === 'object')
			buckets.push(...Object.keys(payload.releases));
	}
	const flat = buckets
		.map((entry) => {
			if (!entry) return null;
			if (typeof entry === 'string') return entry;
			if (typeof entry === 'object' && typeof entry.version === 'string') return entry.version;
			return null;
		})
		.filter((entry) => typeof entry === 'string');
	return flat.length > 0 ? flat[0] : null;
}

async function runCommand(command, args) {
	const { stdout } = await execFileAsync(command, args, {
		cwd: repoRoot,
		timeout: 20_000,
	});
	return stdout;
}

function parsePipIndexOutput(stdout) {
	const lines = stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	const versions = [];
	for (const line of lines) {
		if (line.startsWith('* ')) {
			versions.push(line.slice(2).trim());
		} else if (/^[0-9]/.test(line)) {
			versions.push(line);
		}
	}
	return { versions };
}

async function fetchCodecarbonVersions() {
	try {
		const stdout = await runCommand('uvx', ['pip', 'index', 'versions', 'codecarbon', '--json']);
		return JSON.parse(stdout);
	} catch (error) {
		console.warn(
			'brAInwav dependency watch: uvx lookup failed, attempting pip fallback',
			error?.message ?? error,
		);
		const stdout = await runCommand('python3', ['-m', 'pip', 'index', 'versions', 'codecarbon']);
		return parsePipIndexOutput(stdout);
	}
}

function writeBaseline(data) {
	writeFileSync(baselinePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
	const baseline = loadBaseline();
	const record = baseline.codecarbon ?? {};

	try {
		const payload = await fetchCodecarbonVersions();
		const latest = selectLatestVersion(payload);
		const today = new Date().toISOString().slice(0, 10);
		record.last_checked = today;
		if (latest) record.observed_version = latest;
		record.available_snapshot = payload;
		record.notes = record.notes ?? 'brAInwav automated dependency watch via uvx';
		baseline.codecarbon = record;
		writeBaseline(baseline);
		console.log(
			`brAInwav dependency watch updated: codecarbon -> ${record.observed_version ?? 'unknown'}`,
		);
	} catch (error) {
		console.error('brAInwav dependency watch failed to refresh via uvx:', error);
		process.exitCode = 1;
	}
}

main();
