import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { type CortexOsToolName, cortexOsMcpTools, getToolDefinition } from './tools';

// Basic rate limiter per tool (token bucket style simplified)
interface RateState {
	count: number;
	windowStart: number;
}
const RATE_LIMIT_WINDOW_MS = 10_000; // 10s
const RATE_LIMIT_MAX = 50; // per tool per window (simple default)
const rateState: Record<string, RateState> = {};

// Simple in-memory cache for read operations
interface CacheEntry {
	expires: number;
	value: unknown;
}
const cache: Record<string, CacheEntry> = {};

// Minimal dependency shapes (avoid 'any') – expand with richer contracts later
export interface MemoriesLike {
	// Extend: retrieval, vector ops, etc.
	// Using index signature for early integration while avoiding 'any'
	[k: string]: unknown;
}

export interface OrchestrationLike {
	config: Record<string, unknown>;
	// Future: run(workflow, input) -> result, status(runId)
}

export interface GatewayDeps {
	memories: MemoriesLike;
	orchestration: OrchestrationLike;
	config?: { runtime: Record<string, unknown> };
	audit?: (event: Record<string, unknown>) => void;
	security?: { allowTool?: (name: string) => boolean };
	publishMcpEvent?: (evt: { type: string; payload: Record<string, unknown> }) => void; // optional A2A bus publisher
}

export class McpGateway {
	private readonly deps: GatewayDeps;
	// In-memory workflow run persistence (simple ephemeral store)
	private readonly workflowRuns: Map<
		string,
		{
			workflow: string;
			runId: string;
			status: 'queued' | 'running' | 'completed' | 'failed';
			startedAt: string;
			finishedAt?: string;
			result?: unknown;
			error?: {
				code: string;
				message: string;
				details?: Record<string, unknown>;
			};
		}
	> = new Map();
	constructor(deps: GatewayDeps) {
		this.deps = deps;
	}

	listTools() {
		return cortexOsMcpTools.map((t) => ({
			name: t.name,
			description: t.description,
		}));
	}

	async callTool(name: CortexOsToolName, input: unknown) {
		const def = getToolDefinition(name);
		if (!def) return this.error('not_found', `Unknown tool: ${name}`);

		// Security check
		if (def.secure && this.deps.security && !this.deps.security.allowTool?.(name)) {
			return this.error('forbidden', `Access denied for tool: ${name}`);
		}

		// Rate limiting
		if (!this.consumeRate(name)) return this.error('rate_limited', 'Rate limit exceeded');

		// Cache check (key = tool + JSON input) only for tools with cacheTtlMs and no side effects
		const cacheKey = def.cacheTtlMs ? `${name}:${JSON.stringify(input)}` : undefined;
		if (cacheKey) {
			const entry = cache[cacheKey];
			if (entry && entry.expires > Date.now()) return entry.value;
		}

		const started = performance.now();
		try {
			const parsed = def.inputSchema.parse(input);
			const result = await this.dispatch(name, parsed);
			const output = def.outputSchema.parse(result); // ensure contract
			if (cacheKey && def.cacheTtlMs) {
				cache[cacheKey] = {
					value: output,
					expires: Date.now() + def.cacheTtlMs,
				};
			}
			this.audit(name, 'success', performance.now() - started, parsed);
			return output;
		} catch (err) {
			return this.handleError(name, err, started);
		}
	}

	private async dispatch(name: CortexOsToolName, input: unknown): Promise<unknown> {
		switch (name) {
			case 'system.status':
				return this.handleSystemStatus();
			case 'system.restart_service':
				return this.handleRestartService(input as { service: string; mode: 'graceful' | 'force' });
			case 'system.resources':
				return this.handleSystemResources();
			case 'orchestration.run_workflow':
				return this.handleRunWorkflow(
					input as {
						workflow: string;
						input?: Record<string, unknown>;
						async: boolean;
					},
				);
			case 'orchestration.get_workflow_status':
				return this.handleGetWorkflowStatus(input as { runId: string });
			case 'orchestration.list_workflows':
				return this.handleListWorkflows();
			case 'config.get':
				return this.handleConfigGet(input as { key: string });
			case 'config.set':
				return this.handleConfigSet(input as { key: string; value: unknown });
			case 'config.list':
				return this.handleConfigList(input as { prefix?: string; limit: number });
			default:
				throw new Error(`Unhandled tool ${name}`);
		}
	}

	private handleError(name: string, err: unknown, started: number) {
		if (err instanceof z.ZodError) {
			this.audit(name, 'validation_error', performance.now() - started, {
				issues: err.issues,
			});
			return this.error('validation_failed', 'Input validation failed', {
				issues: err.issues,
			});
		}
		this.audit(name, 'error', performance.now() - started, {
			error: err instanceof Error ? err.message : String(err),
		});
		return this.error('internal_error', err instanceof Error ? err.message : 'Unknown error');
	}

	private error(code: string, message: string, details?: Record<string, unknown>) {
		const base: {
			error: {
				code: string;
				message: string;
				details?: Record<string, unknown>;
			};
		} = {
			error: { code, message },
		};
		if (details) base.error.details = details;
		return base;
	}

	private audit(tool: string, outcome: string, durationMs: number, meta?: Record<string, unknown>) {
		const event = {
			tool,
			outcome,
			durationMs,
			ts: new Date().toISOString(),
			...(meta || {}),
		};
		try {
			this.deps.audit?.(event);
		} catch {
			/* local audit swallow */
		}
		try {
			this.deps.publishMcpEvent?.({
				type: 'mcp.tool.audit.v1',
				payload: event,
			});
		} catch {
			/* swallow bus errors */
		}
	}

	private consumeRate(name: string): boolean {
		const now = Date.now();
		if (!rateState[name]) {
			rateState[name] = { count: 0, windowStart: now };
		}
		const st = rateState[name];
		if (now - st.windowStart > RATE_LIMIT_WINDOW_MS) {
			st.windowStart = now;
			st.count = 0;
		}
		if (st.count >= RATE_LIMIT_MAX) return false;
		st.count += 1;
		return true;
	}

	// Handlers (initial minimal implementations / placeholders) -----------------
	private async handleSystemStatus() {
		// For now gather subset of status (placeholder values)
		const services = [
			{ name: 'memories', status: 'running', version: '1.0.0' },
			{ name: 'orchestration', status: 'running', version: '0.1.0' },
		];
		const resources = { cpu: 5, memoryMB: 256, load: 0.2 };
		const uptimeSec = Math.floor(process.uptime());
		const version = process.env.APP_VERSION || 'dev';
		return { services, resources, uptimeSec, version };
	}

	private async handleRestartService(input: { service: string; mode: 'graceful' | 'force' }) {
		// Fake restart simulation
		const start = performance.now();
		const previousStatus = 'running';
		await new Promise((r) => setTimeout(r, 25));
		const newStatus = 'running';
		return {
			service: input.service,
			previousStatus,
			newStatus,
			durationMs: Math.round(performance.now() - start),
			mode: input.mode,
		};
	}

	private async handleSystemResources() {
		return {
			cpu: 7,
			memory: { usedMB: 300, totalMB: 2048 },
			loadAvg: [0.1, 0.15, 0.2],
		};
	}

	private async handleRunWorkflow(input: {
		workflow: string;
		input?: Record<string, unknown>;
		async: boolean;
	}) {
		const runId = `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
		const startedAt = new Date().toISOString();
		if (input.async === false) {
			const record = {
				workflow: input.workflow,
				runId,
				status: 'completed' as const,
				startedAt,
				finishedAt: new Date().toISOString(),
				result: { echo: input.input || null },
			};
			this.workflowRuns.set(runId, record);
			return record;
		}
		const record = {
			workflow: input.workflow,
			runId,
			status: 'queued' as const,
			startedAt,
		};
		this.workflowRuns.set(runId, record);
		return record;
	}

	private async handleGetWorkflowStatus(input: { runId: string }) {
		const record = this.workflowRuns.get(input.runId);
		if (record) return record;
		// Return a failed status object conforming to schema (no separate error envelope)
		return {
			workflow: 'unknown',
			runId: input.runId,
			status: 'failed' as const,
			startedAt: new Date().toISOString(),
			error: { code: 'not_found', message: 'Workflow run not found' },
		};
	}

	private async handleListWorkflows() {
		const workflows = [
			{
				id: 'wf.cleanup',
				name: 'System Cleanup',
				description: 'Perform routine cleanup',
				version: '1.0.0',
			},
		];
		return { workflows };
	}

	private async handleConfigGet(input: { key: string }) {
		const runtimeHas = this.deps.config?.runtime[input.key] !== undefined;
		const runtimeVal = runtimeHas ? this.deps.config?.runtime[input.key] : undefined;
		const envVal = process.env[input.key];
		const value = runtimeHas ? runtimeVal : (envVal ?? null);
		let source: 'runtime' | 'env' | 'default' = 'default';
		if (runtimeHas) source = 'runtime';
		else if (envVal !== undefined) source = 'env';
		return { key: input.key, value, source };
	}

	private async handleConfigSet(input: { key: string; value: unknown }) {
		this.deps.config ??= { runtime: {} };
		const previous = this.deps.config.runtime[input.key];
		this.deps.config.runtime[input.key] = input.value;
		return { key: input.key, previous, value: input.value, scope: 'runtime' };
	}

	private async handleConfigList(input: { prefix?: string; limit: number }) {
		const items: { key: string; value: unknown; source?: string }[] = [];
		const runtime = this.deps.config?.runtime ?? {};

		const pushRuntime = () => {
			for (const [k, v] of Object.entries(runtime)) {
				if (input.prefix && !k.startsWith(input.prefix)) continue;
				items.push({ key: k, value: v, source: 'runtime' });
				if (items.length >= input.limit) return;
			}
		};

		const pushEnv = () => {
			for (const [k, v] of Object.entries(process.env)) {
				if (input.prefix && !k.startsWith(input.prefix)) continue;
				if (runtime[k] !== undefined) continue;
				items.push({ key: k, value: v, source: 'env' });
				if (items.length >= input.limit) return;
			}
		};

		pushRuntime();
		if (items.length < input.limit) pushEnv();
		return { items };
	}
}

export function createMcpGateway(deps: GatewayDeps) {
	return new McpGateway(deps);
}
