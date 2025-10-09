import { handleA2A } from '@cortex-os/a2a';
import type { Envelope } from '@cortex-os/a2a-contracts';
import { createEnvelope } from '@cortex-os/a2a-contracts';
import {
	A2AMessageSchema,
	AgentConfigSchema,
	MCPRequestSchema,
	RAGQuerySchema,
	SimlabCommandSchema,
} from '@cortex-os/contracts';
import { createJsonOutput } from '@cortex-os/lib';
import { resolveTransport } from '@cortex-os/mcp-bridge/runtime/transport';
import { createEnhancedClient, type ServerInfo } from '@cortex-os/mcp-core';
import { handleSimlab } from '@cortex-os/simlab';
import Fastify from 'fastify';
import client from 'prom-client';
import { z } from 'zod';
import { getGatewayBus } from './a2a.js';
import { createAgentRoute } from './lib/create-agent-route.js';

function parseMcpArgs(raw?: string): unknown {
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(raw);
		return z.any().parse(parsed);
	} catch (error) {
		console.warn(
			'Failed to parse MCP_ARGS:',
			error instanceof Error ? error.message : 'Unknown error',
		);
		return undefined;
	}
}

function buildStdioServerInfo(name: string): ServerInfo | null {
	const command = process.env.MCP_COMMAND;
	if (!command) return null;
	const args = parseMcpArgs(process.env.MCP_ARGS);
	return { name, transport: 'stdio', command, args } as ServerInfo;
}

function buildHttpLikeServerInfo(
	name: string,
	transport: 'sse' | 'streamableHttp',
): ServerInfo | null {
	const endpoint = process.env.MCP_ENDPOINT;
	if (!endpoint) return null;
	return { name, transport, endpoint } as ServerInfo;
}

function getMCPServerInfo(): ServerInfo | null {
	const rawTransport = process.env.MCP_TRANSPORT;
	const { selected, warnings } = resolveTransport(rawTransport);
	const name = process.env.MCP_NAME || 'gateway-mcp';

	for (const warning of warnings) {
		if (warning === 'preferAll') {
			console.warn('MCP_TRANSPORT=all requested; defaulting gateway MCP transport to HTTP.');
		}
		if (warning === 'unknownOverride') {
			console.warn(
				`Unknown MCP_TRANSPORT override "${rawTransport}". Falling back to HTTP transport.`,
			);
		}
	}

	if (selected === 'stdio') {
		return buildStdioServerInfo(name);
	}

	const endpoint = process.env.MCP_ENDPOINT;
	if (!endpoint) return null;
	const explicit = rawTransport?.trim().toLowerCase();
	const transport: 'sse' | 'streamableHttp' = explicit === 'sse' ? 'sse' : 'streamableHttp';
	return buildHttpLikeServerInfo(name, transport);
}

// The schema used in createAgentRoute is:
// z.object({
//   config: AgentConfigSchema,
//   request: MCPRequestSchema,
//   json: z.boolean().optional(),
// })
const MCPRoute = z.object({
	config: AgentConfigSchema,
	request: MCPRequestSchema,
	json: z.boolean().optional(),
});
type MCPRouteSchema = z.infer<typeof MCPRoute>;

// A2A-based RAG handler
async function handleRAGViaA2A(input: unknown): Promise<string> {
	const { bus } = getGatewayBus();

	try {
		const parsed = z
			.object({
				config: AgentConfigSchema,
				query: RAGQuerySchema,
				json: z.boolean().optional(),
			})
			.safeParse(input);

		if (!parsed.success) {
			return createJsonOutput({
				error: {
					code: 'INVALID_INPUT',
					message: 'Invalid RAG input',
					issues: parsed.error.issues,
				},
			});
		}

		const { config, query } = parsed.data;
		const queryId = crypto.randomUUID();

		// Create RAG query event
		const queryEvent: Envelope = createEnvelope({
			type: 'rag.query.executed',
			source: 'urn:cortex:gateway',
			data: {
				queryId,
				query: query.query,
				topK: query.topK,
				timestamp: new Date().toISOString(),
			},
		});

		// Setup result handler
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				resolve(
					createJsonOutput({
						error: {
							code: 'TIMEOUT',
							message: 'RAG query timed out',
						},
					}),
				);
			}, config.timeoutMs || 30000);

			bus.bind([
				{
					type: 'rag.query.completed',
					handle: async (resultEvent: Envelope) => {
						const data = resultEvent.data as {
							queryId: string;
							results: unknown[];
							provider: string;
							duration: number;
						};
						if (data.queryId === queryId) {
							clearTimeout(timeout);
							resolve(
								createJsonOutput({
									results: data.results,
									provider: data.provider,
									duration: data.duration,
								}),
							);
						}
					},
				},
			]);

			// Publish the query event
			bus.publish(queryEvent);
		});
	} catch (error) {
		return createJsonOutput({
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Failed to process RAG query',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
		});
	}
}

const handleMCP = async ({ request }: MCPRouteSchema) => {
	const si = getMCPServerInfo();
	if (!si) {
		return createJsonOutput({
			error: {
				code: 'MCP_NOT_CONFIGURED',
				message: 'MCP transport not configured',
			},
		});
	}
	const client = await createEnhancedClient(si);
	try {
		const result = await client.callTool({
			name: request.tool,
			arguments: request.args,
		});
		return createJsonOutput(result);
	} finally {
		await client.close();
	}
};

const app = Fastify({ logger: true });

const { default: openapiSpec } = await import('../openapi.json', {
	assert: { type: 'json' },
});

createAgentRoute(app, '/mcp', MCPRoute, handleMCP);

createAgentRoute(
	app,
	'/a2a',
	z.object({
		config: AgentConfigSchema,
		message: A2AMessageSchema,
		json: z.boolean().optional(),
	}),
	handleA2A,
);

createAgentRoute(
	app,
	'/rag',
	z.object({
		config: AgentConfigSchema,
		query: RAGQuerySchema,
		json: z.boolean().optional(),
	}),
	handleRAGViaA2A,
);

createAgentRoute(
	app,
	'/simlab',
	z.object({
		config: AgentConfigSchema,
		command: SimlabCommandSchema,
		json: z.boolean().optional(),
	}),
	async ({ command }) => {
		const result = await handleSimlab(command);
		return createJsonOutput(result);
	},
);

app.get('/openapi.json', async (_req, reply) => {
	reply.header('content-type', 'application/json');
	return createJsonOutput(openapiSpec);
});

// Test-only route to generate a 500 for metrics assertions
if (
	process.env.NODE_ENV === 'test' ||
	process.env.GATEWAY_TEST_ROUTES === '1' ||
	process.env.GATEWAY_ALLOW_RAG === '1'
) {
	app.post('/__boom', async () => {
		throw new Error('kaboom');
	});
}

export async function start(port = Number(process.env.PORT) || 3333) {
	await app.listen({ port, host: '0.0.0.0' });
	return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	void start();
}

const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpHistogram = new client.Histogram({
	name: 'http_request_duration_ms',
	help: 'Duration of HTTP requests in ms',
	labelNames: ['route', 'method', 'status'] as const,
	buckets: [10, 25, 50, 100, 200, 300, 400, 600, 800, 1200, 2000],
	registers: [register],
});
const httpErrors = new client.Counter({
	name: 'http_request_errors_total',
	help: 'HTTP request errors',
	labelNames: ['route', 'method'] as const,
	registers: [register],
});

app.addHook('onResponse', async (req, reply) => {
	try {
		const route = req.routeOptions?.url || req.url;
		const method = req.method;
		const status = String(reply.statusCode);
		const diff = reply.elapsedTime || 0;
		httpHistogram.labels({ route, method, status }).observe(diff);
		if (reply.statusCode >= 500) httpErrors.labels({ route, method }).inc();
	} catch (err) {
		app.log.error({ err }, 'metrics collection failed');
	}
});

app.get('/metrics', async (_req, reply) => {
	reply.header('content-type', register.contentType);
	return register.metrics();
});
