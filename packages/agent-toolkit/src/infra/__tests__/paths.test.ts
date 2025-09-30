import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const accessMock = vi.fn();
const homedirMock = vi.fn(() => '/home/default');

vi.mock('node:fs/promises', () => ({
	access: accessMock,
}));

vi.mock('node:os', async () => {
	const os = await vi.importActual<typeof import('node:os')>('node:os');
	return {
		...os,
		homedir: homedirMock,
	};
});

async function loadModule() {
	return import('../paths.js');
}

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_CWD = process.cwd();

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	accessMock.mockReset();
	homedirMock.mockReset();
	homedirMock.mockReturnValue('/home/default');
	process.env = { ...ORIGINAL_ENV };
	vi.spyOn(process, 'cwd').mockReturnValue(ORIGINAL_CWD);
});

afterEach(() => {
	process.env = { ...ORIGINAL_ENV };
	vi.restoreAllMocks();
});

describe('resolveToolsDir', () => {
	it('prefers AGENT_TOOLKIT_TOOLS_DIR when accessible', async () => {
		const customDir = '/override/tools';
		process.env.AGENT_TOOLKIT_TOOLS_DIR = customDir;
		accessMock.mockResolvedValueOnce(undefined);

		const { resolveToolsDir } = await loadModule();

		await expect(resolveToolsDir()).resolves.toBe(customDir);
		expect(accessMock).toHaveBeenCalledWith(customDir);
	});

	it('falls back to CORTEX_HOME/tools/agent-toolkit when override missing', async () => {
		delete process.env.AGENT_TOOLKIT_TOOLS_DIR;
		process.env.CORTEX_HOME = '/cortex-home';
		const cortexPath = join(process.env.CORTEX_HOME, 'tools/agent-toolkit');
		accessMock.mockResolvedValueOnce(undefined);

		const { resolveToolsDir } = await loadModule();

		await expect(resolveToolsDir()).resolves.toBe(cortexPath);
		expect(accessMock).toHaveBeenLastCalledWith(cortexPath);
	});

	it('uses $HOME/.Cortex-OS/tools/agent-toolkit when available', async () => {
		delete process.env.AGENT_TOOLKIT_TOOLS_DIR;
		delete process.env.CORTEX_HOME;
		process.env.HOME = '/home/alt';
		homedirMock.mockReturnValue('/home/alt');
		const homePath = join(process.env.HOME, '.Cortex-OS/tools/agent-toolkit');
		accessMock.mockResolvedValueOnce(undefined);

		const { resolveToolsDir } = await loadModule();

		await expect(resolveToolsDir()).resolves.toBe(homePath);
		expect(accessMock).toHaveBeenCalledWith(homePath);
	});

	it('falls back to repo packages/agent-toolkit/tools', async () => {
		delete process.env.AGENT_TOOLKIT_TOOLS_DIR;
		delete process.env.CORTEX_HOME;
		delete process.env.HOME;
		const repoRoot = '/repo';
		vi.spyOn(process, 'cwd').mockReturnValue(repoRoot);
		const fallbackPath = resolve(repoRoot, 'packages/agent-toolkit/tools');
		accessMock.mockRejectedValueOnce(
			Object.assign(new Error('missing home path'), { code: 'ENOENT' }),
		);
		accessMock.mockResolvedValueOnce(undefined);

		const { resolveToolsDir } = await loadModule();

		await expect(resolveToolsDir()).resolves.toBe(fallbackPath);
		expect(accessMock).toHaveBeenLastCalledWith(fallbackPath);
	});

	it('throws helpful error when no candidate is accessible', async () => {
		delete process.env.AGENT_TOOLKIT_TOOLS_DIR;
		delete process.env.CORTEX_HOME;
		homedirMock.mockReturnValue('/home/default');
		vi.spyOn(process, 'cwd').mockReturnValue('/repo');
		accessMock.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));

		const { resolveToolsDir } = await loadModule();

		await expect(resolveToolsDir()).rejects.toThrow('agent-toolkit tools directory not found');
	});
});
