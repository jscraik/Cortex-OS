import { writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AgentToolkitCodemapResult } from '@cortex-os/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAgentToolkit } from '../index.js';

const execMock = vi.hoisted(() => vi.fn());

const defaultExecImplementation = (
	_file: string,
	args: string[],
	_options: Record<string, unknown>,
	callback: Function,
) => {
	if (args.length === 1 && args[0] === '--version') {
		callback(null, { stdout: 'Python 3.11.0', stderr: '' });
		return;
	}
	const outIndex = args.indexOf('--out');
	const mdIndex = args.indexOf('--md');
	const jsonPath = args[outIndex + 1];
	const markdownPath = args[mdIndex + 1];

	writeFileSync(jsonPath, JSON.stringify({ repo_path: 'test' }), 'utf-8');
	writeFileSync(markdownPath, '# codemap', 'utf-8');
	callback(null, { stdout: '', stderr: '' });
};

vi.mock('node:child_process', async () => {
	const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
	return {
		...actual,
		execFile: (...args: Parameters<typeof execMock>) => execMock(...args),
	};
});

describe('Agent toolkit codemap integration', () => {
	let workdir: string;
	let scriptPath: string;

	beforeEach(async () => {
		workdir = await mkdtemp(`${tmpdir()}/agent-toolkit-codemap-toolkit-`);
		await mkdir(join(workdir, 'out'), { recursive: true });
		await mkdir(join(workdir, 'scripts'), { recursive: true });
		scriptPath = join('scripts', 'codemap.py');
		await writeFile(
			resolve(workdir, scriptPath),
			'#!/usr/bin/env python3\nprint("codemap")\n',
			'utf-8',
		);
		execMock.mockImplementation(defaultExecImplementation);
		execMock.mockClear();
	});

	afterEach(() => {
		execMock.mockReset();
	});

	it('exposes generateCodemap convenience method with publish events', async () => {
		const publishEvent = vi.fn();
		const toolkit = createAgentToolkit({
			publishEvent,
			codemap: {
				workingDirectory: workdir,
				scriptPath,
				pythonExecutable: 'python3',
				timeoutMs: 5_000,
			},
		});

		const result = await toolkit.generateCodemap({
			repoPath: '.',
			scope: 'repo',
			sections: ['git'],
			jsonOut: 'out/map.json',
			markdownOut: 'out/map.md',
		});

		expect(result.tool).toBe('codemap');
		const codemapResult = result as AgentToolkitCodemapResult;
		expect(codemapResult.results.codemap).toEqual({ repo_path: 'test' });
		expect(codemapResult.results.jsonPath).toBe(resolve(workdir, 'out/map.json'));
		expect(codemapResult.results.markdownPath).toBe(resolve(workdir, 'out/map.md'));

		expect(execMock).toHaveBeenCalledTimes(2);
		expect(publishEvent).toHaveBeenCalledTimes(1);
		expect(publishEvent.mock.calls[0][0]).toMatchObject({
			type: 'tool.run.completed',
			data: expect.objectContaining({ toolName: 'codemap', success: true }),
		});
	});

	it('propagates dependency errors from codemap adapter', async () => {
		execMock.mockImplementationOnce((_, args, __, callback) => {
			if (args[0] === '--version') {
				const err = Object.assign(new Error('spawn python3 ENOENT'), { code: 'ENOENT' as const });
				callback(err);
				return;
			}
			callback(null, { stdout: '', stderr: '' });
		});

		const toolkit = createAgentToolkit({
			codemap: {
				workingDirectory: workdir,
				scriptPath,
				pythonExecutable: 'python3',
			},
		});

		await expect(toolkit.generateCodemap({ repoPath: '.', scope: 'repo' })).rejects.toThrow(
			"python executable 'python3' not found",
		);
	});
});
