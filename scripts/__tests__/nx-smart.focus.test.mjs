import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// We'll dynamically import the script after mocking child_process

describe('nx-smart focus filtering', () => {
	const scriptPath = path.join(process.cwd(), 'scripts', 'nx-smart.mjs');

	beforeEach(async () => {
		vi.resetModules();
		vi.doMock('node:child_process', () => {
			return {
				execSync: (cmd, _opts) => {
					if (cmd.startsWith('git rev-parse --is-inside-work-tree')) return '';
					if (cmd.startsWith('git rev-parse HEAD')) return 'HEADSHA';
					if (cmd.startsWith('git --no-pager diff'))
						return 'fileA.js\nfileB.ts';
					if (cmd.includes('nx show projects --affected')) {
						return JSON.stringify([
							'pkg-a',
							'pkg-b',
							'@cortex-os/agent-toolkit',
							'@cortex-os/telemetry',
						]);
					}
					return '';
				},
				spawnSync: (_cmd) => ({ status: 0 }),
			};
		});
	});

	it('reduces affected set when focus matches subset', async () => {
		process.argv = [
			'node',
			'nx-smart.mjs',
			'lint',
			'--dry-run',
			'--focus',
			'@cortex-os/telemetry',
		];
		const output = [];
		const origLog = console.log;
		const origExit = process.exit;
		let exitCode;
		// @ts-expect-error
		process.exit = (code) => {
			exitCode = code;
			throw new Error(`__early_exit_${code}`);
		};
		console.log = (msg) => {
			output.push(String(msg));
		};
		try {
			await import(`${scriptPath}?cacheBust=${Date.now()}`).catch((e) => {
				if (!String(e.message).startsWith('__early_exit_')) throw e;
			});
		} finally {
			console.log = origLog;
			process.exit = origExit;
		}
		const summaryIdx = output.findIndex((l) =>
			l.includes('Affected Projects Summary'),
		);
		expect(summaryIdx).toBeGreaterThan(-1);
		const affectedLine = output.find((l) => l.startsWith('Affected projects:'));
		expect(affectedLine).toContain('@cortex-os/telemetry');
		expect(affectedLine).not.toContain('@cortex-os/agent-toolkit');
		expect(exitCode).toBe(0);
	});

	it('falls back to original list if no overlap', async () => {
		process.argv = [
			'node',
			'nx-smart.mjs',
			'lint',
			'--dry-run',
			'--focus',
			'non-existent',
		];
		const output = [];
		const origLog = console.log;
		const origExit = process.exit;
		let exitCode;
		// @ts-expect-error
		process.exit = (code) => {
			exitCode = code;
			throw new Error(`__early_exit_${code}`);
		};
		console.log = (msg) => {
			output.push(String(msg));
		};
		try {
			await import(`${scriptPath}?cacheBust=${Date.now()}`).catch((e) => {
				if (!String(e.message).startsWith('__early_exit_')) throw e;
			});

			it('--validate-focus warns when focused project not affected', async () => {
				process.argv = [
					'node',
					'nx-smart.mjs',
					'lint',
					'--dry-run',
					'--focus',
					'missing-project',
					'--validate-focus',
				];
				const origLog = console.log;
				const origWarn = console.warn;
				const origExit = process.exit;
				let exitCode;
				// @ts-expect-error
				process.exit = (code) => {
					exitCode = code;
					throw new Error(`__early_exit_${code}`);
				};
				console.log = () => {};
				const warnings = [];
				console.warn = (msg) => {
					warnings.push(String(msg));
				};
				try {
					await import(`${scriptPath}?cacheBust=${Date.now()}`).catch((e) => {
						if (!String(e.message).startsWith('__early_exit_')) throw e;
					});
				} finally {
					console.log = origLog;
					console.warn = origWarn;
					process.exit = origExit;
				}
				expect(exitCode).toBe(0);
				// Because missing-project isn't in affected list, we expect a validate-focus warning
				const foundWarn = warnings.some((w) => w.includes('[validate-focus]'));
				expect(foundWarn).toBe(true);
			});
		} finally {
			console.log = origLog;
			process.exit = origExit;
		}
		const affectedLine = output.find((l) => l.startsWith('Affected projects:'));
		expect(affectedLine).toContain('@cortex-os/agent-toolkit');
		expect(affectedLine).toContain('@cortex-os/telemetry');
		expect(exitCode).toBe(0);
	});
});
