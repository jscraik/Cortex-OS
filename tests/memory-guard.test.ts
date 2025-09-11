import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hogScript = resolve(__dirname, 'fixtures/memory-hog.js');

describe('memory guard', () => {
	it('kills process exceeding memory', async () => {
		const hog = spawn(process.execPath, ['--expose-gc', hogScript], {
			stdio: 'ignore',
		});
		let logs = '';
		const guard = spawn(
			process.execPath,
			[
				'scripts/memory-guard.mjs',
				'--pid',
				String(hog.pid),
				'--max',
				'30',
				'--interval',
				'100',
			],
			{
				cwd: resolve(__dirname, '..'),
			},
		);
		guard.stdout.on('data', (d) => {
			logs += d.toString();
		});

		const exit = await new Promise<{
			code: number | null;
			signal: NodeJS.Signals | null;
		}>((resolve) =>
			hog.on('exit', (code, signal) => resolve({ code, signal })),
		);

		guard.kill('SIGINT');

		expect(exit.signal).toBe('SIGKILL');
		const actions = logs
			.trim()
			.split('\n')
			.map((l) => JSON.parse(l).action);
		expect(actions).toContain('sigusr2');
		expect(actions).toContain('killed');
	}, 10000);
});
