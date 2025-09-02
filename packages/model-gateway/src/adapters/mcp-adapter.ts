/**
 * MCP adapter for Model Gateway
 * Supports embeddings, chat, and reranking by delegating to MCP tools
 */

// Respect AGENTS.md boundaries: import from public exports
import { createEnhancedClient } from "@cortex-os/mcp-core/client";
import type { ServerInfo } from "@cortex-os/mcp-core/contracts";
import type {
	ChatRequest,
	EmbeddingBatchRequest,
	EmbeddingRequest,
	RerankRequest,
} from "../model-router.js";

export interface MCPAdapter {
	isAvailable(): Promise<boolean>;
	generateEmbedding(
		request: EmbeddingRequest,
	): Promise<{ embedding: number[]; model: string }>;
	generateEmbeddings(
		request: EmbeddingBatchRequest,
	): Promise<{ embeddings: number[][]; model: string }>;
	generateChat(
		request: ChatRequest,
	): Promise<{ content: string; model: string }>;
	rerank(request: RerankRequest): Promise<{ scores: number[]; model: string }>;
}

function getServerInfo(): ServerInfo | null {
	const transport = (
		process.env.MCP_TRANSPORT || ""
	).trim() as ServerInfo["transport"];
	const name = process.env.MCP_NAME || "model-gateway-mcp";
	if (!transport) return null;
	if (transport === "stdio") {
		const command = process.env.MCP_COMMAND;
		if (!command) return null;
		const args = process.env.MCP_ARGS
			? JSON.parse(process.env.MCP_ARGS)
			: undefined;
		return { name, transport, command, args } as ServerInfo;
	}
	if (transport === "sse" || transport === "streamableHttp") {
		const endpoint = process.env.MCP_ENDPOINT;
		if (!endpoint) return null;
		return { name, transport, endpoint } as ServerInfo;
	}
	return null;
}

export function createMCPAdapter(): MCPAdapter {
	let available = false;

	const isAvailable = async (): Promise<boolean> => {
		if (available) return true;
		const si = getServerInfo();
		if (!si) return false;
		try {
			const client = await createEnhancedClient(si);
			await client.close();
			available = true;
			return true;
		} catch {
			return false;
		}
	};

	const withClient = async <T>(fn: (c: any) => Promise<T>): Promise<T> => {
		const si = getServerInfo();
		if (!si) throw new Error("MCP not configured");
		const client = await createEnhancedClient(si);
		try {
			return await fn(client);
		} finally {
			await client.close();
		}
	};

	return {
		isAvailable,
		async generateEmbedding(request) {
			const result = await withClient(async (c) =>
				c.callTool({
					name: "embeddings.create",
					arguments: { texts: [request.text] },
				}),
			);
			const emb = (result?.embeddings?.[0] as number[]) || [];
			return { embedding: emb, model: result?.model || "mcp:embeddings" };
		},
		async generateEmbeddings(request) {
			const result = await withClient(async (c) =>
				c.callTool({
					name: "embeddings.create",
					arguments: { texts: request.texts },
				}),
			);
			const embs = (result?.embeddings as number[][]) || [];
			return { embeddings: embs, model: result?.model || "mcp:embeddings" };
		},
		async generateChat(request) {
			const result = await withClient(async (c) =>
				c.callTool({
					name: "text-generation.generate",
					arguments: { ...request, model: request.model },
				}),
			);
			const content = result?.content || result?.text || "";
			return { content, model: result?.model || "mcp:chat" };
		},
		async rerank(request) {
			const result = await withClient(async (c) =>
				c.callTool({
					name: "rerank.score",
					arguments: {
						query: request.query,
						documents: request.documents,
						model: request.model,
					},
				}),
			);
			const scores = (result?.scores as number[]) || [];
			return { scores, model: result?.model || "mcp:rerank" };
		},
	};
}
