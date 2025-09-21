import { handleA2A } from '@cortex-os/a2a';
import { createJsonOutput } from '@cortex-os/lib';
import { createEnhancedClient, type ServerInfo } from '@cortex-os/mcp-core';
import { handleRAG } from '@cortex-os/rag';
import { handleSimlab } from '@cortex-os/simlab';
import Fastify from 'fastify';
import client from 'prom-client';
import { z } from 'zod';
import {
	A2AMessageSchema,
	AgentConfigSchema,
	MCPRequestSchema,
	RAGQuerySchema,
	SimlabCommandSchema,
} from '../../../libs/typescript/contracts/dist/src/index.js';
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
	const transport = (process.env.MCP_TRANSPORT || '') as ServerInfo['transport'];
	const name = process.env.MCP_NAME || 'gateway-mcp';
	if (!transport) return null;
	if (transport === 'stdio') return buildStdioServerInfo(name);
	if (transport === 'sse' || transport === 'streamableHttp')
		return buildHttpLikeServerInfo(name, transport);
	return null;
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
	handleRAG,
);

createAgentRoute(
	app,
	'/simlab',
	z.object({
		config: AgentConfigSchema,
		command: SimlabCommandSchema,
		json: z.boolean().optional(),
	}),
	handleSimlab,
);

app.get('/openapi.json', async (_req, reply) => {
	reply.header('content-type', 'application/json');
	return createJsonOutput(openapiSpec);
});

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
