import { z } from 'zod';
// Cortex WebUI MCP Tool Contracts
// These schemas define the input contracts for MCP tools that allow
// programmatic UI management, user interaction simulation, and generation
// of lightweight visualizations (charts, timelines, trees) inside the
// cortex-webui application. They follow the established pattern used by
// observability and other packages: each tool has a name, description,
// and Zod input schema. Errors SHOULD be returned using the shared
// ErrorResponseSchema (import from index if needed by consumers) with
// codes: validation_error | security_error | internal_error | rate_limited.
// Common primitives
const ULIDSchema = z
    .string()
    .regex(/^[0-9A-HJKMNP-TV-Z]{26}$/i, 'Invalid ULID');
const ISODateTime = () => z.string().datetime({ offset: true });
// 1. UI Management Tools -------------------------------------------------
// open_panel: open (or focus) a named UI panel (sidebar/modal/drawer)
export const OpenPanelInputSchema = z.object({
    panelId: z.string().min(2).max(64),
    focus: z.boolean().default(true),
    // Allow optional context payload (must be JSON-serializable primitives)
    context: z.record(z.unknown()).optional(),
});
// update_component_state: patch component-local state identified by a path
export const UpdateComponentStateInputSchema = z.object({
    componentId: z.string().min(2).max(128),
    path: z.string().min(1).max(256), // e.g. "filters.status"
    value: z.unknown(),
    merge: z.boolean().default(true),
    // optimistic concurrency to avoid clobbering stale state
    expectedVersion: z.number().int().positive().optional(),
});
// navigate: perform internal route navigation
export const NavigateInputSchema = z.object({
    to: z.string().min(1).max(256),
    replace: z.boolean().default(false),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    scroll: z.boolean().default(true),
});
// 2. User Interaction Tools ---------------------------------------------
// simulate_click: synthetic click on an element (by test-id or selector)
export const SimulateClickInputSchema = z.object({
    target: z.string().min(1).max(256), // data-testid or CSS selector (restricted)
    button: z.enum(['left', 'middle', 'right']).default('left'),
    meta: z
        .object({
        altKey: z.boolean().default(false),
        ctrlKey: z.boolean().default(false),
        shiftKey: z.boolean().default(false),
        metaKey: z.boolean().default(false),
    })
        .default({
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
    }),
});
// submit_form: submit or validate a form with field values
export const SubmitFormInputSchema = z.object({
    formId: z.string().min(2).max(128),
    // At least 1 key check will be performed post-parse; Zod record lacks .min
    fields: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    validateOnly: z.boolean().default(false),
});
// send_chat_message: push a chat message into active conversation
export const SendChatMessageInputSchema = z.object({
    sessionId: ULIDSchema.optional(),
    message: z.string().min(1).max(4000),
    role: z.enum(['user', 'assistant']).default('user'),
    metadata: z.record(z.string()).optional(),
});
// 3. Visualization Tools -------------------------------------------------
// render_chart: request rendering of a lightweight chart (client picks lib)
export const RenderChartInputSchema = z.object({
    chartId: z.string().min(2).max(64),
    type: z.enum(['line', 'bar', 'pie', 'scatter', 'area']),
    data: z.object({
        // arrays must align in client; minimal structural validation here
        series: z
            .array(z.object({
            name: z.string().min(1).max(64),
            points: z
                .array(z.object({
                x: z.union([z.number(), z.string()]),
                y: z.number(),
            }))
                .min(1),
        }))
            .min(1),
    }),
    options: z
        .object({
        title: z.string().max(120).optional(),
        xLabel: z.string().max(64).optional(),
        yLabel: z.string().max(64).optional(),
        stacked: z.boolean().optional(),
        legend: z.boolean().default(true),
    })
        .optional(),
});
// generate_timeline: produce structured timeline events display
export const GenerateTimelineInputSchema = z.object({
    timelineId: z.string().min(2).max(64),
    events: z
        .array(z.object({
        id: ULIDSchema.optional(),
        ts: ISODateTime(),
        label: z.string().min(1).max(140),
        detail: z.string().max(1000).optional(),
        severity: z.enum(['info', 'warn', 'error']).default('info'),
        tags: z.record(z.string()).optional(),
    }))
        .min(1)
        .max(500),
    collapseAdjacentMs: z.number().int().positive().max(60_000).optional(),
});
export const RenderTreeNodeSchema = z.lazy(() => z.object({
    id: z.string().min(1).max(128),
    label: z.string().min(1).max(140),
    children: z.array(RenderTreeNodeSchema).optional(),
}));
export const RenderTreeInputSchema = z.object({
    treeId: z.string().min(2).max(64),
    root: RenderTreeNodeSchema,
    depthLimit: z.number().int().positive().max(25).default(10),
});
export const webuiMcpTools = [
    {
        name: 'open_panel',
        description: 'Open or focus a UI panel',
        inputSchema: OpenPanelInputSchema,
    },
    {
        name: 'update_component_state',
        description: 'Patch component state via path',
        inputSchema: UpdateComponentStateInputSchema,
    },
    {
        name: 'navigate',
        description: 'Navigate internal application route',
        inputSchema: NavigateInputSchema,
    },
    {
        name: 'simulate_click',
        description: 'Simulate a click user interaction',
        inputSchema: SimulateClickInputSchema,
    },
    {
        name: 'submit_form',
        description: 'Submit or validate a form with field values',
        inputSchema: SubmitFormInputSchema,
    },
    {
        name: 'send_chat_message',
        description: 'Send a chat message in the active session',
        inputSchema: SendChatMessageInputSchema,
    },
    {
        name: 'render_chart',
        description: 'Render a lightweight chart from provided series',
        inputSchema: RenderChartInputSchema,
    },
    {
        name: 'generate_timeline',
        description: 'Generate a timeline visualization of events',
        inputSchema: GenerateTimelineInputSchema,
    },
    {
        name: 'render_tree',
        description: 'Render a hierarchical tree structure',
        inputSchema: RenderTreeInputSchema,
    },
];
// Validation helper – defensive sanitation (basic example, handlers can extend)
export class WebuiToolError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}
export function validateWebuiToolInput(tool, input) {
    const def = webuiMcpTools.find((t) => t.name === tool);
    if (!def)
        throw new WebuiToolError('unknown_tool', `Unknown webui MCP tool: ${tool}`);
    try {
        const parsed = def.inputSchema.parse(input);
        // Additional manual validations not expressible directly in schema
        if (tool === 'submit_form') {
            const parsedObj = parsed;
            const fields = parsedObj.fields;
            if (!fields || Object.keys(fields).length === 0) {
                throw new WebuiToolError('validation_error', 'fields must include at least one key');
            }
        }
        return parsed;
    }
    catch (err) {
        if (err instanceof z.ZodError) {
            throw new WebuiToolError('validation_error', 'Input validation failed', err.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
        }
        throw new WebuiToolError('internal_error', 'Unhandled validation failure');
    }
}
export function createWebuiErrorResponse(tool, err, correlationId) {
    const base = {
        tool,
        correlationId,
        timestamp: new Date().toISOString(),
    };
    if (err instanceof WebuiToolError) {
        return {
            isError: true,
            metadata: base,
            content: [
                {
                    type: 'application/json',
                    text: JSON.stringify({
                        success: false,
                        error: {
                            code: err.code,
                            message: err.message,
                            details: err.details,
                        },
                        correlationId,
                        timestamp: base.timestamp,
                    }),
                },
            ],
        };
    }
    return {
        isError: true,
        metadata: base,
        content: [
            {
                type: 'application/json',
                text: JSON.stringify({
                    success: false,
                    error: { code: 'internal_error', message: 'Unexpected error' },
                    correlationId,
                    timestamp: base.timestamp,
                }),
            },
        ],
    };
}
//# sourceMappingURL=webui-tools.js.map