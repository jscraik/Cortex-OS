import { spawn } from 'node:child_process';
import { expect, test } from 'vitest';

test('kernel package builds without invalid flag errors', async () => {
	const buildProcess = spawn('pnpm', ['exec', 'tsc'], {
		cwd: './packages/kernel',
		stdio: 'pipe',
		env: { ...process.env, FORCE_COLOR: '0' },
	});

	let stderr = '';
	let stdout = '';

	buildProcess.stdout.on('data', (data) => {
		stdout += data.toString();
	});

	buildProcess.stderr.on('data', (data) => {
		stderr += data.toString();
	});

	const exitCode = await new Promise((resolve) => {
		buildProcess.on('close', resolve);
	});

	expect(exitCode).toBe(0);

	// Should not have invalid flag errors
	expect(stderr).not.toMatch(/unknown (?:option|compiler option)/i);
	expect(stdout).not.toContain('error TS');
});
