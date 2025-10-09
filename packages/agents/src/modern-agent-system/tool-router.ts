import type { SessionContextManager } from '@cortex-os/agent-toolkit';
import { createMcpClientHub, type McpClientHub } from './mcp-clients.js';
import type {
	ToolHandler,
	ToolInvocationRequest,
	ToolInvocationResult,
	ToolRouter,
} from './types.js';

export interface ToolRouterOptions {
	localTools?: Record<string, ToolHandler>;
	mcp?: {
		stdio: Array<{ name: string; command: string; args?: string[]; cwd?: string }>;
		streamableHttp: Array<{ name: string; url: string; headers?: Record<string, string> }>;
	};
	sessionContext: SessionContextManager;
}

const estimateTokens = (value: unknown) =>
	Math.max(1, Math.ceil(JSON.stringify(value ?? {}).length / 4));

const createInvocationRecorder =
	(sessionContext: SessionContextManager) => (request: ToolInvocationRequest, tokens: number) => {
		const kind = request.kind ?? 'analysis';
		sessionContext.addToolCall(
			kind,
			{ tool: request.tool, metadata: request.context?.metadata ?? {} },
			tokens,
		);
	};

const wrapHandler =
	(handler: ToolHandler, record: ReturnType<typeof createInvocationRecorder>) =>
	async (request: ToolInvocationRequest): Promise<ToolInvocationResult> => {
		const result = await handler(request);
		const tokens = result.tokensUsed || estimateTokens(result.result);
		record(request, tokens);
		return { ...result, tokensUsed: tokens } satisfies ToolInvocationResult;
	};

const createMcpHandler = (hub: McpClientHub): ToolHandler => hub.invoke;

const chooseHandler = (
	tool: string,
	localTools: Map<string, ToolHandler>,
	mcp: McpClientHub | undefined,
) => {
	if (localTools.has(tool)) return localTools.get(tool) as ToolHandler;
	if (mcp) return createMcpHandler(mcp);
	throw new Error(`brAInwav modern-agent-system: tool "${tool}" not found`);
};

export const createToolRouter = (options: ToolRouterOptions): ToolRouter => {
	const localTools = new Map(Object.entries(options.localTools ?? {}));
	const mcpHub = options.mcp ? createMcpClientHub(options.mcp) : undefined;
	const record = createInvocationRecorder(options.sessionContext);
	const invoke = async (request: ToolInvocationRequest) => {
		const handler = chooseHandler(request.tool, localTools, mcpHub);
		const wrapped = wrapHandler(handler, record);
		return wrapped(request);
	};
	const listTools = async () => {
		const names = new Set<string>(localTools.keys());
		if (mcpHub) for (const name of mcpHub.listClients()) names.add(name);
		return Array.from(names);
	};
	return { invoke, listTools };
};
