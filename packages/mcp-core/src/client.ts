import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { redactSensitiveData } from "../../mcp/src/lib/security.js";
import type { ServerInfo } from "./contracts.js";

type Transport =
	| StdioClientTransport
	| SSEClientTransport
	| StreamableHTTPClientTransport;

type TransportFactory = () => Transport;

function buildTransportCandidates(si: ServerInfo): TransportFactory[] {
	const candidates: TransportFactory[] = [];

	if (si.transport === "streamableHttp") {
		const endpoint = si.endpoint;
		if (!endpoint) throw new Error("streamableHttp requires endpoint");
		candidates.push(() => new StreamableHTTPClientTransport(new URL(endpoint)));
		candidates.push(() => new SSEClientTransport(new URL(endpoint)));
	} else if (si.transport === "sse") {
		const endpoint = si.endpoint;
		if (!endpoint) throw new Error("sse requires endpoint");
		candidates.push(() => new SSEClientTransport(new URL(endpoint)));
		candidates.push(() => new StreamableHTTPClientTransport(new URL(endpoint)));
	} else if (si.transport === "stdio") {
		const command = si.command;
		if (!command) throw new Error("stdio requires command");
		candidates.push(
			() => new StdioClientTransport({ command, args: si.args, env: si.env }),
		);
	} else {
		throw new Error(`Unsupported transport: ${si.transport}`);
	}

	// If both endpoint and command are provided, consider local stdio as a final fallback
	if (si.command && si.transport !== "stdio") {
		const command = si.command;
		candidates.push(
			() => new StdioClientTransport({ command, args: si.args, env: si.env }),
		);
	}

	return candidates;
}

async function connectWithFallback(candidates: TransportFactory[]): Promise<{
	client: Client;
	transport: Transport;
}> {
	let lastError: unknown;
	for (const mk of candidates) {
		const transport = mk();
		const client = new Client({
			name: "cortex-os-mcp-client",
			version: "1.0.0",
		});
		try {
			await client.connect(transport);
			return { client, transport };
		} catch (err) {
			lastError = err;
			try {
				await transport.close();
			} catch {
				// ignore
			}
		}
	}
	throw new Error(
		`Failed to connect to MCP server via all candidate transports: ${
			(lastError as Error)?.message || String(lastError)
		}`,
	);
}

// Use shared redaction to ensure consistent behavior across packages
function redactArgs<T extends Record<string, unknown>>(args: T): T {
	return redactSensitiveData(args) as T;
}

// Create a new, enhanced client that wraps the official SDK client
export async function createEnhancedClient(si: ServerInfo) {
	const candidates = buildTransportCandidates(si);
	const { client: baseClient, transport: connectedTransport } =
		await connectWithFallback(candidates);

	const rateLimiter = new RateLimiterMemory({
		points: 60, // 60 requests
		duration: 60, // per 60 seconds
	});

	// The enhanced client wraps the base client, overriding methods to add functionality.
	type EnhancedClient = Omit<Client, "callTool" | "sendRequest" | "close"> & {
		rateLimiter: RateLimiterMemory;
		// Keep a flexible runtime signature; align types loosely to avoid conflicts with SDK typing
		callTool: (
			nameOrParams:
				| string
				| { name: string; arguments?: Record<string, unknown> },
			maybeArgs?: Record<string, unknown>,
		) => Promise<unknown>;
		sendRequest: (message: unknown) => Promise<unknown>;
		getRateLimitInfo: (
			toolName: string,
		) => Promise<{ remainingPoints: number }>;
		close: () => Promise<void>;
	};

	const enhancedClient = {
		...baseClient,
		rateLimiter,

		// Override callTool to add rate limiting
		callTool: async (
			nameOrParams:
				| string
				| { name: string; arguments?: Record<string, unknown> },
			maybeArgs?: Record<string, unknown>,
		) => {
			const name =
				typeof nameOrParams === "string" ? nameOrParams : nameOrParams.name;
			const toolArgs =
				typeof nameOrParams === "string" ? maybeArgs : nameOrParams.arguments;
			const rateKey = `tool-${si.name}-${name}`;
			const ok = await enhancedClient.rateLimiter.consume(rateKey).then(
				() => true,
				() => false,
			);
			if (!ok) throw new Error(`Rate limit exceeded for tool ${name}`);
			const redacted = toolArgs ? redactArgs(toolArgs) : undefined;
			return baseClient.callTool({ name, arguments: redacted });
		},

		// Keep the original close method from the base client
		close: async () => {
			// No need to dispose the rate limiter as it's not a global singleton.
			// It will be garbage collected when the client is.
			await connectedTransport.close();
			baseClient.close();
		},

		// Redact data on sendRequest path as well for consistency
		sendRequest: async (message: unknown) => {
			let redacted: unknown = message;
			try {
				if (typeof message === "string") {
					// Preserve original whitespace by redacting the string directly
					redacted = redactSensitiveData(message);
				} else if (message && typeof message === "object") {
					redacted = redactArgs(message as Record<string, unknown>);
				}
			} catch {
				// If parsing fails, fall back to original message
				redacted = message;
			}
			// forward to base client
			// @ts-expect-error sendRequest exists on the SDK client at runtime but may not be in its TypeScript types
			return baseClient.sendRequest(redacted);
		},

		// Expose rate limit info for inspection
		getRateLimitInfo: async (toolName: string) => {
			const rateKey = `tool-${si.name}-${toolName}`;
			const res = await enhancedClient.rateLimiter.get(rateKey);
			return {
				remainingPoints: res?.remainingPoints || 0,
			};
		},
	} as unknown as EnhancedClient;

	return enhancedClient;
}
