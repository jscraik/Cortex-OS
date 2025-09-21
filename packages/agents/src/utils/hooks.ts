import type { HookResult } from '@cortex-os/hooks';

type Tool = { name: string; invoke: (input: unknown) => Promise<unknown> };

export async function runWithHooks(
	hooks: {
		run: (
			event: 'PreToolUse' | 'PostToolUse',
			ctx: Record<string, unknown>,
		) => Promise<HookResult[]>;
	},
	tool: Tool,
	input: unknown,
	meta: { cwd: string; user: string; tags?: string[] },
) {
	let effective = input;
	const pre = await hooks.run('PreToolUse', {
		event: 'PreToolUse',
		tool: { name: tool.name, input },
		cwd: meta.cwd,
		user: meta.user,
		tags: meta.tags ?? ['agents'],
	});
	for (const r of pre) {
		if (r.action === 'deny') throw new Error(r.reason);
		if (r.action === 'allow' && typeof r.input !== 'undefined') effective = r.input;
	}
	const out = await tool.invoke(effective);
	await hooks.run('PostToolUse', {
		event: 'PostToolUse',
		tool: { name: tool.name, input: effective },
		cwd: meta.cwd,
		user: meta.user,
		tags: meta.tags ?? ['agents'],
	});
	return out;
}
