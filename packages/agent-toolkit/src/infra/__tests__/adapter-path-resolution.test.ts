import type { AgentToolkitSearchInput, AgentToolkitValidationInput } from '@cortex-os/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveToolsDirMock = vi.fn<() => Promise<string>>();
const execWithRetryMock = vi.fn();
const execCommandMock = vi.fn();
const writeFileMock = vi.fn(async () => undefined);
const unlinkMock = vi.fn(async () => undefined);

vi.mock('../paths.js', () => ({
	resolveToolsDir: resolveToolsDirMock,
	resolveToolsDirFromOverride: (override?: string | Promise<string>) =>
		override ? Promise.resolve(override) : resolveToolsDirMock(),
}));

vi.mock('../execUtil.js', () => ({
	execWithRetry: execWithRetryMock,
}));

vi.mock('node:child_process', () => ({
	exec: (command: string, callback: (error: unknown, stdout: string, stderr: string) => void) => {
		execCommandMock(command);
		callback(
			null,
			JSON.stringify({
				tool: 'comby',
				op: 'rewrite',
				inputs: {
					find: 'a',
					replace: 'b',
					path: '.',
				},
				results: [],
			}),
			'',
		);
	},
}));

vi.mock('node:fs/promises', () => ({
	writeFile: writeFileMock,
	unlink: unlinkMock,
}));

beforeEach(() => {
	vi.resetModules();
	execWithRetryMock.mockReset();
	execCommandMock.mockReset();
	writeFileMock.mockClear();
	unlinkMock.mockClear();
	resolveToolsDirMock.mockReset();
	resolveToolsDirMock.mockResolvedValue('/mock/tools');
	execWithRetryMock.mockImplementation(async (command: string) => {
		if (command.includes('rg_search.sh')) {
			return {
				stdout: JSON.stringify({
					tool: 'ripgrep',
					op: 'search',
					inputs: sampleSearchInput,
					results: [],
				}),
			};
		}
		if (command.includes('semgrep_search.sh')) {
			return {
				stdout: JSON.stringify({
					tool: 'semgrep',
					op: 'search',
					inputs: sampleSearchInput,
					results: [],
				}),
			};
		}
		if (command.includes('astgrep_search.sh')) {
			return {
				stdout: JSON.stringify({
					tool: 'ast-grep',
					op: 'search',
					inputs: sampleSearchInput,
					results: [],
				}),
			};
		}
		if (command.includes('eslint_verify.sh')) {
			return {
				stdout: JSON.stringify({
					tool: 'eslint',
					op: 'validate',
					inputs: sampleValidationInput,
					results: [],
					summary: { total: 0, errors: 0, warnings: 0 },
				}),
			};
		}
		if (command.includes('ruff_verify.sh')) {
			return {
				stdout: JSON.stringify({
					tool: 'ruff',
					op: 'validate',
					inputs: sampleValidationInput,
					results: [],
					summary: { total: 0, errors: 0, warnings: 0 },
				}),
			};
		}
		if (command.includes('cargo_verify.sh')) {
			return {
				stdout: JSON.stringify({
					tool: 'cargo',
					op: 'validate',
					inputs: sampleValidationInput,
					results: [],
					summary: { total: 0, errors: 0, warnings: 0 },
				}),
			};
		}
		if (command.includes('run_validators.sh')) {
			return { stdout: JSON.stringify({ tool: 'validator', op: 'validate', results: [] }) };
		}
		throw new Error(`Unexpected command: ${command}`);
	});
});

const sampleSearchInput: AgentToolkitSearchInput = {
	pattern: 'TODO',
	path: '.',
};

const sampleValidationInput: AgentToolkitValidationInput = {
	files: ['src/index'],
};

async function importSearchAdapters() {
	const mod = await import('../SearchAdapters.js');
	return {
		RipgrepAdapter: mod.RipgrepAdapter,
		SemgrepAdapter: mod.SemgrepAdapter,
		AstGrepAdapter: mod.AstGrepAdapter,
	};
}

async function importCodemodAdapter() {
	const mod = await import('../CodemodAdapters.js');
	return mod.CombyAdapter;
}

async function importValidationAdapters() {
	const mod = await import('../ValidationAdapters.js');
	return {
		ESLintAdapter: mod.ESLintAdapter,
		RuffAdapter: mod.RuffAdapter,
		CargoAdapter: mod.CargoAdapter,
		MultiValidatorAdapter: mod.MultiValidatorAdapter,
	};
}

describe('adapter tool path resolution', () => {
	it('search adapters compute script path via resolveToolsDir()', async () => {
		const { RipgrepAdapter, SemgrepAdapter, AstGrepAdapter } = await importSearchAdapters();

		const ripgrep = new RipgrepAdapter();
		await ripgrep.search(sampleSearchInput);
		const semgrep = new SemgrepAdapter();
		await semgrep.search(sampleSearchInput);
		const astgrep = new AstGrepAdapter();
		await astgrep.search(sampleSearchInput);

		expect(resolveToolsDirMock).toHaveBeenCalledTimes(3);
		expect(execWithRetryMock).toHaveBeenCalledTimes(3);

		const commands = execWithRetryMock.mock.calls.map(([command]) => command as string);
		expect(commands).toEqual(
			expect.arrayContaining([
				expect.stringContaining('/mock/tools/rg_search.sh'),
				expect.stringContaining('/mock/tools/semgrep_search.sh'),
				expect.stringContaining('/mock/tools/astgrep_search.sh'),
			]),
		);
	});

	it('codemod adapter uses resolved directory for script execution', async () => {
		const CombyAdapter = await importCodemodAdapter();
		const adapter = new CombyAdapter();

		await adapter.rewrite({ find: 'a', replace: 'b', path: '.' });

		expect(resolveToolsDirMock).toHaveBeenCalled();
		expect(execCommandMock).toHaveBeenCalledWith(
			expect.stringContaining('/mock/tools/comby_rewrite.sh'),
		);
	});

	it('validation adapters execute scripts from resolved directory', async () => {
		const { ESLintAdapter, RuffAdapter, CargoAdapter, MultiValidatorAdapter } =
			await importValidationAdapters();

		await new ESLintAdapter().validate(sampleValidationInput);
		await new RuffAdapter().validate(sampleValidationInput);
		await new CargoAdapter().validate(sampleValidationInput);
		await new MultiValidatorAdapter().validate(sampleValidationInput);

		expect(resolveToolsDirMock).toHaveBeenCalledTimes(4);

		const commands = execWithRetryMock.mock.calls.slice(-4).map(([command]) => command as string);
		for (const expected of [
			'/mock/tools/eslint_verify.sh',
			'/mock/tools/ruff_verify.sh',
			'/mock/tools/cargo_verify.sh',
			'/mock/tools/run_validators.sh',
		]) {
			expect(commands.some((command) => command.includes(expected))).toBe(true);
		}

		expect(writeFileMock).toHaveBeenCalled();
		expect(unlinkMock).toHaveBeenCalled();
	});
});
