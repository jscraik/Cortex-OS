import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HookContext, HookResult } from '../../src/types.js';

const loadHookConfigs = vi.fn<() => Promise<Record<string, unknown>>>();
const runJS = vi.fn<(code: string, ctx: HookContext, timeout: number) => Promise<HookResult>>();

vi.mock('../../src/loaders.js', () => ({
	loadHookConfigs,
	getHookDirs: vi.fn(() => []),
}));

vi.mock('../../src/runners/js.js', () => ({
	runJS,
}));

const buildConfig = () => ({
	PreToolUse: [
		{
			matcher: 'allowed.tool',
			hooks: [{ type: 'js', code: 'ALLOW' }],
		},
		{
			matcher: 'denied.tool',
			hooks: [{ type: 'js', code: 'DENY' }],
		},
	],
	PostToolUse: [
		{
			matcher: 'allowed.tool',
			hooks: [{ type: 'js', code: 'POST' }],
		},
	],
});

runJS.mockImplementation(async (code: string, ctx: HookContext) => {
	switch (code) {
		case 'ALLOW': {
			const original = ctx.tool?.input as Record<string, unknown> | undefined;
			return {
				action: 'allow',
				input: { ...(original ?? {}), mutated: true },
			};
		}
		case 'DENY':
			return { action: 'deny', reason: 'policy-blocked' };
		case 'POST':
			return { action: 'emit', note: `post:${ctx.tool?.name ?? 'unknown'}` };
		default:
			return { action: 'emit', note: 'noop' };
	}
});

describe('CortexHooks tool dispatch integration', () => {
	beforeEach(() => {
		runJS.mockClear();
		loadHookConfigs.mockReset();
		loadHookConfigs.mockResolvedValue(buildConfig());
	});

	async function createHooks() {
		const { CortexHooks } = await import('../../src/manager.js');
		const hooks = new CortexHooks();
		await hooks.init();
		return hooks;
	}

	it('mutates tool input when PreToolUse hook allows with override', async () => {
		const hooks = await createHooks();
		const captured: HookResult[] = [];
		hooks.on('hook:result', ({ result }) => captured.push(result));

		const ctx: HookContext = {
			event: 'PreToolUse',
			tool: { name: 'allowed.tool', input: { original: true } },
			user: 'tester',
			cwd: '/repo',
		};

		const results = await hooks.run('PreToolUse', ctx);

		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			action: 'allow',
			input: { original: true, mutated: true },
		});
		expect(runJS).toHaveBeenCalledWith(
			'ALLOW',
			expect.objectContaining({ event: 'PreToolUse' }),
			expect.any(Number),
		);
		expect(captured[0]?.action).toBe('allow');
	});

	it('denies tool execution when a matching PreToolUse hook returns deny', async () => {
		const hooks = await createHooks();
		const ctx: HookContext = {
			event: 'PreToolUse',
			tool: { name: 'denied.tool', input: null },
			user: 'tester',
			cwd: '/repo',
		};

		const [result] = await hooks.run('PreToolUse', ctx);

		expect(result).toMatchObject({ action: 'deny', reason: 'policy-blocked' });
	});

	it('runs PostToolUse hooks after execution', async () => {
		const hooks = await createHooks();
		const ctx: HookContext = {
			event: 'PostToolUse',
			tool: { name: 'allowed.tool', input: { ok: true } },
			user: 'tester',
			cwd: '/repo',
		};

		const [result] = await hooks.run('PostToolUse', ctx);

		expect(runJS).toHaveBeenCalledWith(
			'POST',
			expect.objectContaining({ event: 'PostToolUse' }),
			expect.any(Number),
		);
		expect(result).toMatchObject({ action: 'emit', note: 'post:allowed.tool' });
	});
});
