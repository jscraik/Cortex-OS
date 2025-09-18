import * as child_process from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use a dynamic import to get the module under test after mocking
let mod: typeof import('../exec');

const fakeProc = {
	pid: 12345,
	stdout: { on: vi.fn() },
	stderr: { on: vi.fn() },
	stdin: { write: vi.fn(), end: vi.fn() },
	on: vi.fn((event: string, cb: unknown) => {
		if (event === 'spawn') setTimeout(cb, 0);
	}),
	kill: vi.fn(),
};

describe('spawnPythonProcess env merging and PYTHONPATH behavior', () => {
	let spawnMock: unknown;

	beforeEach(async () => {
		spawnMock = vi.spyOn(child_process, 'spawn').mockImplementation((..._args: unknown[]) => {
			// capture call and return fake proc
			return fakeProc as unknown;
		});

		// Clear env for deterministic tests
		delete process.env.PYTHONPATH;
		delete process.env.PYTHON_EXEC;

		mod = await import('../exec');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('resolves PYTHON_EXEC over legacy PYTHON_PATH and default', () => {
		process.env.PYTHON_EXEC = '/usr/bin/python3.11';
		const python = mod.resolvePython();
		expect(python).toBe('/usr/bin/python3.11');
	});

	it('sets merged PYTHONPATH when setModulePath provided and existing PYTHONPATH present', () => {
		process.env.PYTHONPATH = '/existing/path';
		const options = { setModulePath: '/repo/packages/python-agents' };
		mod.spawnPythonProcess(['-m', 'something'], options as unknown);

		expect(spawnMock).toHaveBeenCalled();
		const callArgs = spawnMock.mock.calls[0];
		const envPassed = callArgs[2].env as Record<string, string>;

		expect(envPassed.PYTHONPATH).toBe(
			`/repo/packages/python-agents${require('node:path').delimiter}/existing/path`,
		);
	});

	it('sets PYTHONPATH to provided value when no existing PYTHONPATH', () => {
		delete process.env.PYTHONPATH;
		const options = { setModulePath: '/only/new/path' };
		mod.spawnPythonProcess(['-m', 'x'], options as unknown);
		const callArgs = spawnMock.mock.calls[0];
		const envPassed = callArgs[2].env as Record<string, string>;
		expect(envPassed.PYTHONPATH).toBe('/only/new/path');
	});
});
