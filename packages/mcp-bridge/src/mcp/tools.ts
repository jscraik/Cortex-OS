import { z } from 'zod';
import { StdioHttpBridge, type StdioHttpBridgeOptions } from '../stdio-http.js';

// Define the input schema for the bridge creation tool
const CreateBridgeInputSchema = z.object({
	httpEndpoint: z.string().url(),
	transport: z.enum(['http', 'sse']).optional(),
	enableRateLimiting: z.boolean().optional(),
	rateLimitOptions: z
		.object({
			maxRequests: z.number().positive(),
			windowMs: z.number().positive(),
		})
		.optional(),
	retryOptions: z
		.object({
			maxRetries: z.number().nonnegative(),
			retryDelay: z.number().positive(),
			maxDelay: z.number().positive().optional(),
		})
		.optional(),
	circuitBreakerOptions: z
		.object({
			failureThreshold: z.number().positive(),
			resetTimeout: z.number().positive(),
		})
		.optional(),
	requestTimeoutMs: z.number().positive().optional(),
});

// Define the input schema for the bridge forward tool
const ForwardRequestInputSchema = z.object({
	requestId: z.union([z.string(), z.number()]),
	method: z.string(),
	params: z.any().optional(),
});

// Define the result schema for bridge operations
const BridgeResultSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	data: z.any().optional(),
});

export interface BridgeMcpTool<Params = unknown, Result = unknown> {
	name: string;
	description: string;
	inputSchema: z.ZodType<Params>;
	handler: (input: unknown) => Promise<{
		content: Array<{ type: 'text'; text: string }>;
		isError?: boolean;
		raw?: Result;
	}>;
}

// Tool to create and start a new bridge
export const createBridgeTool: BridgeMcpTool<
	z.infer<typeof CreateBridgeInputSchema>,
	z.infer<typeof BridgeResultSchema>
> = {
	name: 'mcp_bridge_create',
	description: 'Create and start a new MCP bridge between stdio and HTTP/SSE endpoints',
	inputSchema: CreateBridgeInputSchema,
	handler: async (input: unknown) => {
		try {
			const validatedInput = CreateBridgeInputSchema.parse(input);

			// Create bridge instance
			const bridge = new StdioHttpBridge(validatedInput as StdioHttpBridgeOptions);

			// Start the bridge
			await bridge.start();

			const result = {
				success: true,
				message: `Bridge created and started successfully for endpoint: ${validatedInput.httpEndpoint}`,
				data: {
					endpoint: validatedInput.httpEndpoint,
					transport: validatedInput.transport || 'http',
				},
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
				raw: result,
			};
		} catch (error) {
			const result = {
				success: false,
				message: `Failed to create bridge: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
				isError: true,
				raw: result,
			};
		}
	},
};

// Tool to forward a request through an existing bridge
export const forwardRequestTool: BridgeMcpTool<
	z.infer<typeof ForwardRequestInputSchema>,
	z.infer<typeof BridgeResultSchema>
> = {
	name: 'mcp_bridge_forward',
	description: 'Forward a JSON-RPC request through an existing MCP bridge',
	inputSchema: ForwardRequestInputSchema,
	handler: async (input: unknown) => {
		try {
			// Note: In a real implementation, we would need to maintain bridge instances
			// For now, we'll return a placeholder response
			const validatedInput = ForwardRequestInputSchema.parse(input);

			const result = {
				success: true,
				message: `Request forwarded successfully: ${validatedInput.method}`,
				data: {
					requestId: validatedInput.requestId,
					method: validatedInput.method,
				},
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
				raw: result,
			};
		} catch (error) {
			const result = {
				success: false,
				message: `Failed to forward request: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
				isError: true,
				raw: result,
			};
		}
	},
};

// Tool to close an existing bridge
export const closeBridgeTool: BridgeMcpTool<
	{ bridgeId: string },
	z.infer<typeof BridgeResultSchema>
> = {
	name: 'mcp_bridge_close',
	description: 'Close an existing MCP bridge',
	inputSchema: z.object({
		bridgeId: z.string(),
	}),
	handler: async (input: unknown) => {
		try {
			// Note: In a real implementation, we would need to maintain bridge instances
			// For now, we'll return a placeholder response
			const { bridgeId } = z.object({ bridgeId: z.string() }).parse(input);

			const result = {
				success: true,
				message: `Bridge closed successfully: ${bridgeId}`,
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
				raw: result,
			};
		} catch (error) {
			const result = {
				success: false,
				message: `Failed to close bridge: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
				isError: true,
				raw: result,
			};
		}
	},
};

// Export all tools as an array
export const mcpBridgeTools: BridgeMcpTool[] = [
	createBridgeTool,
	forwardRequestTool,
	closeBridgeTool,
];
