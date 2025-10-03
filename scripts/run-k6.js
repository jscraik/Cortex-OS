#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '..');
const workloadPath = resolve(projectRoot, 'apps/cortex-webui/tests/performance/load-test.js');

if (!existsSync(workloadPath)) {
	console.error('[k6-runner] missing tests/performance/load-test.js');
	process.exit(1);
}

function tryRun(command, args, options = {}) {
	const result = spawnSync(command, args, { stdio: 'inherit', ...options });
	return result.error ? { success: false, error: result.error } : { success: result.status === 0 };
}

function runK6Binary() {
	return tryRun('k6', ['run', workloadPath], { env: process.env });
}

function runK6Docker() {
	const volume = `${projectRoot}:/work`;
	return tryRun('docker', [
		'run',
		'--rm',
		'-v',
		volume,
		'-w',
		'/work/apps/cortex-webui/tests/performance',
		'grafana/k6',
		'run',
		'load-test.js',
	]);
}

let result = runK6Binary();

if (!result.success) {
	console.warn('[k6-runner] native k6 binary not found or failed, attempting Docker fallback...');
	result = runK6Docker();
}

if (!result.success) {
	console.error(
		'[k6-runner] Unable to execute k6. Install k6 (https://grafana.com/docs/k6/latest/) or ensure Docker is available.',
	);
	process.exit(1);
}
