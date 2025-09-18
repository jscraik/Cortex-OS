import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test deep graph validation warnings and --projects narrowing

describe('nx-smart graph validation', () => {
	const scriptPath = path.join(process.cwd(), 'scripts', 'nx-smart.mjs');

	beforeEach(() => {
		vi.resetModules();
	});

	it('emits validation warning when focused excludes affected dependency', async () => {
		vi.doMock('node:child_process', () => {
			return {
				execSync: (cmd) => {
					if (cmd.startsWith('git rev-parse --is-inside-work-tree')) return '';
					if (cmd.startsWith('git rev-parse HEAD')) return 'HEADSHA';
					if (cmd.startsWith('git --no-pager diff')) return 'a.js';
					if (cmd.includes('nx show projects --affected')) {
						return JSON.stringify(['pkg-root', 'pkg-dep']);
					}
					if (cmd.startsWith('nx graph')) {
						// Minimal fake graph file
						const fs = require('node:fs');
						const graphContent = `(function(){ window.projectGraph = ${JSON.stringify(
							{
								graph: {
									nodes: { 'pkg-root': {}, 'pkg-dep': {} },
									dependencies: {
										'pkg-root': [{ target: 'pkg-dep' }],
										'pkg-dep': [],
									},
								},
							},
						)}; })();`;
						const file = cmd.split('--file=')[1].split(' ')[0];
						fs.writeFileSync(file, graphContent, 'utf8');
						return '';
					}
					return '';
				},
				spawnSync: () => ({ status: 0 }),
			};
		});
		process.argv = [
			'node',
			'nx-smart.mjs',
			'test',
			'--dry-run',
			'--focus',
			'pkg-root',
			'--validate-focus',
		];
		const warnings = [];
		const origWarn = console.warn;
		const origLog = console.log;
		// Capture output then early exit from process.exit replacement
		const origExit = process.exit;
		// @ts-expect-error
		process.exit = (code) => {
			throw new Error(`__exit_${code}`);
		};
		console.warn = (m) => {
			warnings.push(String(m));
		};
		console.log = () => {};
		try {
			await import(`${scriptPath}?cacheBust=${Date.now()}`).catch((e) => {
				if (!e.message.startsWith('__exit_')) throw e;
			});
		} finally {
			console.warn = origWarn;
			console.log = origLog;
			process.exit = origExit;
		}
		expect(warnings.some((w) => w.includes('[validate-focus]'))).toBe(true);
	});
});
