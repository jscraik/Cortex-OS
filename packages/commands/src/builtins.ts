import type { BuiltinsApi, LoadedCommand, RunResult } from './types.js';

export function createBuiltinCommands(api: BuiltinsApi): LoadedCommand[] {
	const help: LoadedCommand = {
		name: 'help',
		description: 'List available commands',
		scope: 'builtin',
		execute: async () => {
			const text = `Usage: /help, /agents, /model [name], /compact [focus], /status, /test [pattern], /format [changed], /lint [changed]\n`;
			return { text } satisfies RunResult;
		},
	};

	const agents: LoadedCommand = {
		name: 'agents',
		description: 'List or create subagents',
		scope: 'builtin',
		execute: async (args) => {
			if (args[0] === 'create' && api.createAgent) {
				const name = args[1] || `agent-${Date.now()}`;
				const created = await api.createAgent({ name });
				return { text: `Created agent ${created.name} (${created.id})` };
			}
			const list = (await api.listAgents?.()) || [];
			const lines = list.map((a) => {
				const suffix = a.description ? ` — ${a.description}` : '';
				return `- ${a.name} (${a.id})${suffix}`;
			});
			return { text: lines.length ? lines.join('\n') : 'No agents found' };
		},
	};

	const model: LoadedCommand = {
		name: 'model',
		description: 'Show or change parent model for session',
		scope: 'builtin',
		execute: async (args) => {
			if (!args[0]) {
				const cur = api.getModel?.() ?? 'unknown';
				return { text: `Current model: ${cur}` };
			}
			await api.setModel?.(args.join(' '));
			return { text: `Model set to: ${args.join(' ')}` };
		},
	};

	const compact: LoadedCommand = {
		name: 'compact',
		description: 'Compact thread with optional focus',
		scope: 'builtin',
		execute: async (args) => {
			const focus = args.join(' ') || undefined;
			const res = await api.compact?.({ focus });
			return { text: res ?? 'Compaction triggered' };
		},
	};

	const status: LoadedCommand = {
		name: 'status',
		description: 'Show health, model, and repo branch',
		scope: 'builtin',
		execute: async () => {
			const s = await api.systemStatus?.();
			if (!s) return { text: 'No status available' };
			if (typeof s === 'string') return { text: s };
			const lines = [
				`cwd: ${s.cwd}`,
				`model: ${s.model ?? 'inherit'}`,
				s.branch ? `branch: ${s.branch}` : undefined,
			].filter(Boolean) as string[];
			return { text: lines.join('\n') };
		},
	};

	const test: LoadedCommand = {
		name: 'test',
		description: 'Run test runner (optional pattern)',
		scope: 'builtin',
		execute: async (args) => {
			const pattern = args.join(' ') || undefined;
			const res = await api.runTests?.({ pattern });
			if (!res) return { text: 'No test runner wired' };
			return { text: `tests: ${res.passed} passed, ${res.failed} failed` };
		},
	};

	const format: LoadedCommand = {
		name: 'format',
		description: 'Run formatter (biome)',
		scope: 'builtin',
		execute: async (args) => {
			const changedOnly = args[0]?.toLowerCase() === 'changed' || args[0] === '--changed';
			const res = await api.runFormat?.({ changedOnly });
			if (!res) return { text: 'No format runner wired' };
			return { text: `format: ${res.success ? 'ok' : 'issues found'}` };
		},
	};

	const lint: LoadedCommand = {
		name: 'lint',
		description: 'Run linter (eslint + security)',
		scope: 'builtin',
		execute: async (args) => {
			const changedOnly = args[0]?.toLowerCase() === 'changed' || args[0] === '--changed';
			const res = await api.runLint?.({ changedOnly });
			if (!res) return { text: 'No lint runner wired' };
			return { text: `lint: ${res.success ? 'ok' : 'issues found'}` };
		},
	};

	return [help, agents, model, compact, status, test, format, lint];
}
