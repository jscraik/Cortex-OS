import { EventEmitter } from 'node:events';
import chokidar from 'chokidar';
import picomatch from 'picomatch';
import { getHookDirs, loadHookConfigs, type LoadOptions } from './loaders.js';
import { runCommand } from './runners/command.js';
import { runGraph, setGraphInvoker } from './runners/graph.js';
import { runHTTP } from './runners/http.js';
import { runJS } from './runners/js.js';
import type { Hook, HookConfig, HookContext, HookEntry, HookEvent, HookResult } from './types.js';

export type GraphInvoker = (graphName: string, ctx: HookContext) => Promise<HookResult>;

export class CortexHooks extends EventEmitter {
        private cfg: HookConfig = {};
        async init(opts: LoadOptions = {}) {
                this.cfg = await loadHookConfigs(opts);
        }
	private watcher: chokidar.FSWatcher | null = null;
	private lastReload = 0;

	// Start watching hook directories and hot-reload on changes
	watch(opts: { projectDir?: string; userDir?: string } = {}) {
		if (this.watcher) return this.watcher;
		const dirs = getHookDirs(opts);
		this.watcher = chokidar.watch(dirs, { ignoreInitial: true, depth: 3 });
		const onChange = async () => {
			const now = Date.now();
			if (now - this.lastReload < 250) return; // debounce
			this.lastReload = now;
			try {
				this.cfg = await loadHookConfigs(opts);
				console.info('[cortex-hooks] reloaded hook config');
			} catch (e) {
				console.warn('[cortex-hooks] failed to reload hook config:', (e as Error)?.message || e);
			}
		};
		this.watcher.on('add', onChange).on('change', onChange).on('unlink', onChange);
		return this.watcher;
	}

	// allow host to provide how to call a subgraph
	static setGraphInvoker(invoker: GraphInvoker) {
		setGraphInvoker(invoker);
	}

	async run(event: HookEvent, ctx: HookContext): Promise<HookResult[]> {
		const entries: HookEntry[] = this.cfg[event] ?? [];
		const out: HookResult[] = [];
		for (const { matcher, hooks } of entries) {
			if (!this.matches(matcher, ctx)) continue;
			for (const h of hooks) {
				const result = await this.execute(h, ctx);
				out.push(result);
				// Lightweight observability: emit debug log per result
				try {
					const mutated =
						result.action === 'allow' &&
						'input' in result &&
						(result as { input?: unknown }).input !== undefined;
					const summary = mutated ? 'allow+mutate' : result.action;
					console.debug('[cortex-hooks]', event, matcher, h.type, summary);
					this.emit('hook:result', { event, matcher, hook: h, result, ctx });
				} catch (e) {
					// best-effort observability logging failure
					console.warn('[cortex-hooks] observability log failed:', (e as Error)?.message || e);
				}
			}
		}
		return out;
	}

	private matches(matcher: string, ctx: HookContext) {
		if (matcher === '*') return true;
		const name = ctx.tool?.name ?? ctx.subagent?.name ?? '';
		let regexHit = false;
		try {
			regexHit = new RegExp(matcher).test(name);
		} catch {
			regexHit = false;
		}
		const glob = picomatch(matcher);
		const globHit = (ctx.files ?? []).some((f) => glob(f));
		return regexHit || globHit;
	}

	private async execute(h: Hook, ctx: HookContext): Promise<HookResult> {
		const timeout = h.timeout_ms ?? 60000;
		switch (h.type) {
			case 'command':
				return runCommand(h.command ?? '', ctx, timeout, this.cfg.settings?.command?.allowlist);
			case 'js':
				return runJS(h.code ?? '', ctx, timeout);
			case 'graph':
				return runGraph(h.graph ?? '', ctx, timeout);
			case 'http':
				return runHTTP(h.url ?? '', ctx, timeout);
			default:
				return { action: 'emit', note: 'unknown hook type' };
		}
	}
}
