import { spawn } from 'node:child_process';
import { expect, test } from 'vitest';

test('kernel package compiles without TypeScript errors', async () => {
	const tscProcess = spawn('pnpm', ['exec', 'tsc', '--noEmit'], {
		cwd: './packages/kernel',
		stdio: 'pipe',
		env: { ...process.env, FORCE_COLOR: '0' },
	});

	let stderr = '';
	let stdout = '';

	tscProcess.stdout.on('data', (data) => {
		stdout += data.toString();
	});

	tscProcess.stderr.on('data', (data) => {
		stderr += data.toString();
	});

	const exitCode = await new Promise((resolve) => {
		tscProcess.on('close', resolve);
	});

	expect(exitCode).toBe(0);
	// Should have no compilation errors
	expect(stderr).not.toMatch(/error ts/i);
	expect(stdout).not.toContain('error TS');
});
