import type {
	GenerateTimelineInput,
	NavigateInput,
	OpenPanelInput,
	RenderChartInput,
	RenderTreeInput,
	SendChatMessageInput,
	SimulateClickInput,
	SubmitFormInput,
	UpdateComponentStateInput,
} from '@cortex-os/contracts';
import {
	createWebuiErrorResponse,
	validateWebuiToolInput,
	WebuiToolError,
	webuiMcpTools,
} from '@cortex-os/contracts';
import type { Request, Response } from 'express';
import logger from '../utils/logger.js';

// Cortex WebUI MCP Tool Execution Layer
// -------------------------------------
// Provides an Express handler that can be mounted (e.g. POST /mcp/execute) to
// execute a tool by name using the webui MCP contracts. This is an initial
// scaffold: business logic is largely stubbed and will be wired to concrete
// services in subsequent integration work (Task 2.12.3).

interface McpExecutionResult {
	success: true;
	tool: string;
	data?: unknown;
	correlationId?: string;
	timestamp: string;
}

// ---------------- Service Abstractions ----------------
// These are intentionally minimal; real implementations will live under services/ and be
// dependency-injected later. For now they provide seam points + typing.
export interface PanelService {
	open(input: OpenPanelInput): Promise<unknown>;
}
export interface ComponentStateService {
	update(input: UpdateComponentStateInput): Promise<unknown>;
}
export interface NavigationService {
	navigate(input: NavigateInput): Promise<unknown>;
}
export interface InteractionService {
	click(input: SimulateClickInput): Promise<unknown>;
}
export interface FormService {
	submit(input: SubmitFormInput): Promise<unknown>;
}
export interface ChatService {
	send(input: SendChatMessageInput): Promise<unknown>;
}
export interface ChartService {
	render(input: RenderChartInput): Promise<unknown>;
}
export interface TimelineService {
	generate(input: GenerateTimelineInput): Promise<unknown>;
}
export interface TreeService {
	render(input: RenderTreeInput): Promise<unknown>;
}

export interface WebuiMcpServices {
	panel: PanelService;
	componentState: ComponentStateService;
	navigation: NavigationService;
	interaction: InteractionService;
	form: FormService;
	chat: ChatService;
	chart: ChartService;
	timeline: TimelineService;
	tree: TreeService;
}

// Default stub implementations (pure, deterministic) – replace later.
const defaultServices: WebuiMcpServices = {
	panel: { open: async (i) => ({ opened: i.panelId, focus: i.focus }) },
	componentState: {
		update: async (i) => ({
			updated: true,
			componentId: i.componentId,
			path: i.path,
		}),
	},
	navigation: { navigate: async (i) => ({ navigated: true, to: i.to }) },
	interaction: { click: async (i) => ({ simulated: true, target: i.target }) },
	form: { submit: async (i) => ({ submitted: !i.validateOnly }) },
	chat: {
		send: async (i) => ({
			queued: true,
			messageId: `msg_${Date.now()}`,
			role: i.role,
		}),
	},
	chart: { render: async (i) => ({ chartId: i.chartId, status: 'scheduled' }) },
	timeline: {
		generate: async (i) => ({
			timelineId: i.timelineId,
			events: i.events.length,
		}),
	},
	tree: {
		render: async (i) => ({ treeId: i.treeId, nodes: countNodes(i.root) }),
	},
};

// ---------------- Rate Limiter (overridable) ----------------
let RATE_LIMIT = Number(process.env.WEBUI_MCP_RATE_LIMIT || 100);
let WINDOW_MS = Number(process.env.WEBUI_MCP_RATE_WINDOW_MS || 60_000);
const rateState = new Map<string, { count: number; windowStart: number }>();

export function __setMcpRateLimitForTests(limit: number, windowMs: number) {
	RATE_LIMIT = limit;
	WINDOW_MS = windowMs;
	rateState.clear();
}

function checkRateLimit(tool: string) {
	const now = Date.now();
	const state = rateState.get(tool);
	if (!state || now - state.windowStart > WINDOW_MS) {
		rateState.set(tool, { count: 1, windowStart: now });
		return;
	}
	state.count += 1;
	if (state.count > RATE_LIMIT) {
		throw new WebuiToolError('rate_limited', `Rate limit exceeded for tool ${tool}`);
	}
}

function countNodes(node: unknown): number {
	if (!node || typeof node !== 'object') return 0;
	const anyNode = node as { children?: unknown[] };
	const children = Array.isArray(anyNode.children) ? anyNode.children : [];
	return 1 + children.reduce((acc: number, c) => acc + countNodes(c), 0);
}

async function executeTool(
	tool: string,
	args: unknown,
	services: WebuiMcpServices = defaultServices,
) {
	switch (tool) {
		case 'open_panel': {
			const input = validateWebuiToolInput<OpenPanelInput>(tool, args);
			return services.panel.open(input);
		}
		case 'update_component_state': {
			const input = validateWebuiToolInput<UpdateComponentStateInput>(tool, args);
			return services.componentState.update(input);
		}
		case 'navigate': {
			const input = validateWebuiToolInput<NavigateInput>(tool, args);
			return services.navigation.navigate(input);
		}
		case 'simulate_click': {
			const input = validateWebuiToolInput<SimulateClickInput>(tool, args);
			return services.interaction.click(input);
		}
		case 'submit_form': {
			const input = validateWebuiToolInput<SubmitFormInput>(tool, args);
			return services.form.submit(input);
		}
		case 'send_chat_message': {
			const input = validateWebuiToolInput<SendChatMessageInput>(tool, args);
			return services.chat.send(input);
		}
		case 'render_chart': {
			const input = validateWebuiToolInput<RenderChartInput>(tool, args);
			return services.chart.render(input);
		}
		case 'generate_timeline': {
			const input = validateWebuiToolInput<GenerateTimelineInput>(tool, args);
			return services.timeline.generate(input);
		}
		case 'render_tree': {
			const input = validateWebuiToolInput<RenderTreeInput>(tool, args);
			return services.tree.render(input);
		}
		default:
			throw new WebuiToolError('unknown_tool', `Unsupported tool: ${tool}`);
	}
}

export async function mcpExecuteHandler(req: Request, res: Response) {
	const { tool, args, correlationId } = req.body || {};
	const timestamp = new Date().toISOString();
	try {
		if (typeof tool !== 'string') {
			throw new WebuiToolError('validation_error', 'tool must be a string');
		}
		checkRateLimit(tool);
		const data = await executeTool(tool, args);
		const payload: McpExecutionResult = {
			success: true,
			tool,
			data,
			correlationId,
			timestamp,
		};
		res.json(payload);
	} catch (error: unknown) {
		if (error instanceof WebuiToolError) {
			const toolErr: WebuiToolError = error; // now typed
			logger.warn('webui_mcp_tool_failed', {
				tool,
				correlationId,
				code: toolErr.code,
				details: toolErr.details,
			});
			const errorResponse = createWebuiErrorResponse(tool || 'unknown', toolErr, correlationId);
			res
				.status(toolErr.code === 'rate_limited' ? 429 : 400)
				.json(JSON.parse(errorResponse.content[0].text));
			return;
		}
		const genericMessage = (error as Error)?.message;
		logger.error('webui_mcp_tool_internal_error', {
			tool,
			correlationId,
			error: genericMessage,
		});
		const errorResponse = createWebuiErrorResponse(tool || 'unknown', error, correlationId);
		res.status(500).json(JSON.parse(errorResponse.content[0].text));
	}
}

export function listWebuiMcpTools() {
	return webuiMcpTools.map((t: { name: string; description: string }) => ({
		name: t.name,
		description: t.description,
	}));
}

// ----------- CLEANUP: remove accidental duplicated trailing blocks -----------
// (File had prior corruption; ensure no stray repeated code below this line.)
