import { exec as _exec, execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AgentInfo, BuiltinsApi, CreateAgentSpec, ModelStore } from './types.js';

const exec = promisify(_exec);
const execFile = promisify(_execFile);

export function createDefaultAdapters(sessionId = 'default', modelStore?: ModelStore): BuiltinsApi {
	const sessionStore = modelStore ?? createInMemoryModelStore();
	// Use dynamic import via Function to avoid TS path mapping pulling source files into this project
	type AgentMsg = {
		id: string;
		from: string;
		to: string;
		type: 'request' | 'response' | 'notification' | 'error';
		protocol: unknown;
		payload: unknown;
		timestamp: Date;
		action?: string;
		params?: Record<string, unknown>;
		correlationId?: string;
	};
	const dynImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>;
	let agentsPromise: Promise<{ handleMessage: (msg: AgentMsg) => Promise<AgentMsg> }> | null = null;
	const getAgents = async (): Promise<{ handleMessage: (msg: AgentMsg) => Promise<AgentMsg> }> => {
		agentsPromise ??= (
			dynImport('@cortex-os/agents') as Promise<{
				createAgentsAgent: (id?: string) => {
					handleMessage: (msg: AgentMsg) => Promise<AgentMsg>;
				};
			}>
		).then((m) => m.createAgentsAgent('commands-agents'));
		return agentsPromise;
	};

	return {
		// Agents: uses exposed A2A-like skills on AgentsAgent
		listAgents: async (): Promise<AgentInfo[]> => {
			const agents = await getAgents();
			const req = createLocalA2ARequest('agent_list_agents');
			const resp = await agents.handleMessage(req);
			const payload = (resp && (resp as { payload?: unknown }).payload) as
				| { agents?: Array<{ id: string; name: string; specialization?: string }> }
				| undefined;
			const list = Array.isArray(payload?.agents) ? payload.agents : [];
			return list.map((a) => ({ id: a.id, name: a.name, description: a.specialization }));
		},
		createAgent: async (spec?: CreateAgentSpec): Promise<AgentInfo> => {
			const name = spec?.name ?? `agent-${Date.now()}`;
			const payload = {
				name,
				specialization: 'code-analysis',
				capabilities: ['analyze'],
				model: 'inherit',
			};
			const agents = await getAgents();
			const req = createLocalA2ARequest('agent_create_subagent', payload);
			const resp = await agents.handleMessage(req);
			const agentId =
				(resp && (resp as { payload: { agentId?: string } }).payload?.agentId) ||
				`agent-${Date.now()}`;
			const id = agentId;
			return { id, name, description: 'created' };
		},
		getModel: () => sessionStore.getModel(sessionId),
		setModel: async (model: string) => sessionStore.setModel(sessionId, model),
		systemStatus: async () => {
			try {
				const { stdout: branch } = await execFile('git', ['rev-parse', '--abbrev-ref', HEAD']);
				return {
					cwd: process.cwd(),
					model: sessionStore.getModel(sessionId),
					branch: branch.trim(),
				};
			} catch {
				return { cwd: process.cwd(), model: sessionStore.getModel(sessionId) };
			}
		},
		runTests: async (opts?: { pattern?: string }) => {
			// Minimal: call workspace test smart script with pattern suggestion
			const cmd = opts?.pattern ? `pnpm -w test:smart -- ${opts.pattern}` : 'pnpm -w test:smart';
			try {
				const { stdout } = await exec(cmd);
				// naive parse of vitest summary lines
				const re = /Tests\s+(\d+) failed \| (\d+) passed/;
				const m = re.exec(stdout);
				const failed = m ? Number(m[1]) : 0;
				const passed = m ? Number(m[2]) : 0;
				return { passed, failed, output: stdout.slice(-2000) };
			} catch (e) {
				const err = e as { stdout?: string; message?: string };
				const out = err?.stdout || '';
				const re = /Tests\s+(\d+) failed \| (\d+) passed/;
				const m = re.exec(out);
				const failed = m ? Number(m[1]) : 1;
				const passed = m ? Number(m[2]) : 0;
				return {
					passed,
					failed,
					output: (err?.stdout || err?.message || '').toString().slice(-2000),
				};
			}
		},
		runFormat: async (opts?: { changedOnly?: boolean }) => {
			const cmd = opts?.changedOnly ? 'pnpm biome:changed' : 'pnpm format:check';
			try {
				const { stdout } = await exec(cmd);
				return { success: true, output: stdout.slice(-2000) };
			} catch (e) {
				const err = e as { stdout?: string; message?: string };
				return {
					success: false,
					output: (err.stdout || err.message || '').toString().slice(-2000),
				};
			}
		},
		runLint: async (opts?: { changedOnly?: boolean }) => {
			const cmd = opts?.changedOnly ? 'pnpm biome:changed && pnpm lint:source' : 'pnpm lint';
			try {
				const { stdout } = await exec(cmd);
				return { success: true, output: stdout.slice(-2000) };
			} catch (e) {
				const err = e as { stdout?: string; message?: string };
				return {
					success: false,
					output: (err.stdout || err.message || '').toString().slice(-2000),
				};
			}
		},
	};
}

function createInMemoryModelStore() {
	const map = new Map<string, string>();
	return {
		getModel: (id: string) => map.get(id) ?? 'inherit',
		setModel: (id: string, model: string) => {
			map.set(id, model);
		},
	};
}

function createLocalA2ARequest(
	action: string,
	params: Record<string, unknown> = {},
): {
	id: string;
	from: string;
	to: string;
	type: 'request';
	protocol: unknown;
	payload: unknown;
	timestamp: Date;
	action: string;
	params: Record<string, unknown>;
} {
	return {
		id: `req-${Date.now()}`,
		from: 'commands',
		to: 'cortex-agents',
		type: 'request' as const,
		protocol: 'http',
		payload: {},
		timestamp: new Date(),
		action,
		params,
	};
}
