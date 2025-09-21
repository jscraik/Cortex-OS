import { describe, expect, it } from 'vitest';
import { createBuiltinCommands } from '../src/builtins.js';
import type { BuiltinsApi, RenderContext } from '../src/types.js';

describe('built-in commands: format & lint', () => {
	const api: Pick<BuiltinsApi, 'runFormat' | 'runLint'> = {
		runFormat: async (opts?: { changedOnly?: boolean }) => ({
			success: !opts?.changedOnly,
			output: 'ok',
		}),
		runLint: async (opts?: { changedOnly?: boolean }) => ({
			success: opts?.changedOnly !== true,
			output: 'ok',
		}),
	};

	it('/format returns summary', async () => {
		const cmds = createBuiltinCommands(api as BuiltinsApi);
		const format = cmds.find((c) => c.name === 'format');
		expect(Boolean(format?.execute)).toBe(true);
		if (!format?.execute) {
			throw new Error('format missing');
		}
		const ctx: RenderContext = { cwd: process.cwd() };
		const res = await format.execute([], ctx);
		expect(res.text).toContain('format:');
	});

	it('/lint returns summary', async () => {
		const cmds = createBuiltinCommands(api as BuiltinsApi);
		const lint = cmds.find((c) => c.name === 'lint');
		expect(Boolean(lint?.execute)).toBe(true);
		if (!lint?.execute) {
			throw new Error('lint missing');
		}
		const ctx: RenderContext = { cwd: process.cwd() };
		const res = await lint.execute(['changed'], ctx);
		expect(res.text).toContain('lint:');
	});
});
