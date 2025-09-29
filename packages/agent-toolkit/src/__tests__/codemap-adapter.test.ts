import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodemapAdapter } from '../infra/CodemapAdapter.js';

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

describe('CodemapAdapter', () => {
	let workdir: string;
	let scriptPath: string;

	beforeEach(async () => {
		workdir = await mkdtemp(`${tmpdir()}/agent-toolkit-codemap-`);
		await mkdir(join(workdir, 'out'), { recursive: true });
		await mkdir(join(workdir, 'scripts'), { recursive: true });
		scriptPath = join('scripts', 'codemap.py');
		await writeFile(resolve(workdir, scriptPath), '#!/usr/bin/env python3\nprint("codemap")\n', 'utf-8');
		execMock.mockImplementation(defaultExecImplementation);
		execMock.mockClear();
	});

	afterEach(() => {
		execMock.mockReset();
	});

	it('runs codemap script and parses JSON output', async () => {
		const adapter = new CodemapAdapter({
			workingDirectory: workdir,
			scriptPath: 'scripts/codemap.py',
			pythonExecutable: 'python3',
		});

		const result = await adapter.generate({
			repoPath: '.',
			scope: 'repo',
			jsonOut: 'out/map.json',
			markdownOut: 'out/map.md',
		});

		expect(result.tool).toBe('codemap');
		expect(result.inputs.scope).toBe('repo');
		expect(result.results.codemap).toEqual({ repo_path: 'test' });
		expect(result.results.jsonPath).toBe(resolve(workdir, 'out/map.json'));
		expect(result.results.markdownPath).toBe(resolve(workdir, 'out/map.md'));

		expect(execMock).toHaveBeenCalledTimes(2);
		const versionArgs = execMock.mock.calls[0][1] as string[];
		expect(versionArgs).toEqual(['--version']);
		const scriptArgs = execMock.mock.calls[1][1] as string[];
		expect(scriptArgs).toContain('--scope');
		expect(scriptArgs).toContain('repo');
	});

	it('throws descriptive error when python executable is missing', async () => {
		execMock.mockImplementationOnce((_, args, __, callback) => {
			if (args[0] === '--version') {
				const err = Object.assign(new Error('spawn python3 ENOENT'), { code: 'ENOENT' as const });
				callback(err);
				return;
			}
			callback(null, { stdout: '', stderr: '' });
		});

		const adapter = new CodemapAdapter({
			workingDirectory: workdir,
			scriptPath: 'scripts/codemap.py',
			pythonExecutable: 'python3',
		});

		await expect(
			adapter.generate({ repoPath: '.', scope: 'repo' }),
		).rejects.toThrow("python executable 'python3' not found");
	});

	it('throws descriptive error when codemap script is missing', async () => {
		const adapter = new CodemapAdapter({
			workingDirectory: workdir,
			scriptPath: 'scripts/missing.py',
			pythonExecutable: 'python3',
		});

		await expect(
			adapter.generate({ repoPath: '.', scope: 'repo' }),
		).rejects.toThrow('codemap script not found');
		expect(execMock).not.toHaveBeenCalled();
	});

	it('throws helpful error when output JSON is invalid', async () => {
		execMock
			.mockImplementationOnce((_, args, __, callback) => {
				callback(null, { stdout: 'Python 3.11.0', stderr: '' });
			})
			.mockImplementationOnce((_, args, __, callback) => {
				const outIndex = args.indexOf('--out');
				const mdIndex = args.indexOf('--md');
				const jsonPath = args[outIndex + 1];
				const markdownPath = args[mdIndex + 1];
				writeFileSync(jsonPath, '{ not-json }', 'utf-8');
				writeFileSync(markdownPath, '# codemap', 'utf-8');
				callback(null, { stdout: '', stderr: '' });
			});

		const adapter = new CodemapAdapter({
			workingDirectory: workdir,
			scriptPath: 'scripts/codemap.py',
			pythonExecutable: 'python3',
		});

		await expect(
			adapter.generate({
				repoPath: '.',
				scope: 'repo',
				jsonOut: 'out/map.json',
				markdownOut: 'out/map.md',
			}),
		).rejects.toThrow('unable to parse JSON output');
	});
});
