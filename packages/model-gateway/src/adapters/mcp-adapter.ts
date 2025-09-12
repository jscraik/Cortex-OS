/**
 * MCP adapter for Model Gateway
 * Supports embeddings, chat, and reranking by delegating to MCP tools
 */

import type { ServerInfo } from '@cortex-os/mcp-core';
// Respect AGENTS.md boundaries: import from public exports
import { createEnhancedClient } from '@cortex-os/mcp-core';
import type {
	ChatRequest,
	EmbeddingBatchRequest,
	EmbeddingRequest,
	RerankRequest,
} from '../model-router.js';

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
		process.env.MCP_TRANSPORT || ''
	).trim() as ServerInfo['transport'];
	const name = process.env.MCP_NAME || 'model-gateway-mcp';
	if (!transport) return null;
	if (transport === 'stdio') {
		const command = process.env.MCP_COMMAND;
		if (!command) return null;
		const args = process.env.MCP_ARGS
			? JSON.parse(process.env.MCP_ARGS)
			: undefined;
		return { name, transport, command, args } as ServerInfo;
	}
	if (transport === 'sse' || transport === 'streamableHttp') {
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

	interface MinimalClient {
		callTool(input: { name: string; arguments?: unknown }): Promise<unknown>;
	}

	const withClient = async <T>(fn: (c: MinimalClient) => Promise<T>): Promise<T> => {
		const si = getServerInfo();
		if (!si) throw new Error('MCP not configured');
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
			const raw = await withClient(async (c) =>
				c.callTool({
					name: 'embeddings.create',
					arguments: { texts: [request.text] },
				}),
			);
			const result: unknown = raw || {};
			const embeddings = (typeof result === 'object' && result && 'embeddings' in result) ? (result as { embeddings?: unknown }).embeddings : undefined;
			const model = (typeof result === 'object' && result && 'model' in result && typeof (result as { model?: unknown }).model === 'string') ? (result as { model: string }).model : 'mcp:embeddings';
			const emb = Array.isArray(embeddings) ? (embeddings[0] as number[]) : [];
			return { embedding: emb, model };
		},
		async generateEmbeddings(request) {
			const raw = await withClient(async (c) =>
				c.callTool({
					name: 'embeddings.create',
					arguments: { texts: request.texts },
				}),
			);
			const result: unknown = raw || {};
			const embeddings = (typeof result === 'object' && result && 'embeddings' in result) ? (result as { embeddings?: unknown }).embeddings : undefined;
			const model = (typeof result === 'object' && result && 'model' in result && typeof (result as { model?: unknown }).model === 'string') ? (result as { model: string }).model : 'mcp:embeddings';
			const embs = Array.isArray(embeddings) ? (embeddings as number[][]) : [];
			return { embeddings: embs, model };
		},
		async generateChat(request) {
			const raw = await withClient(async (c) =>
				c.callTool({
					name: 'text-generation.generate',
					arguments: { ...request, model: request.model },
				}),
			);
			const result: unknown = raw || {};
			const model = (typeof result === 'object' && result && 'model' in result && typeof (result as { model?: unknown }).model === 'string') ? (result as { model: string }).model : 'mcp:chat';
			let content = '';
			if (typeof result === 'object' && result) {
				if ('content' in result && typeof (result as { content?: unknown }).content === 'string') {
					content = (result as { content: string }).content;
				} else if ('text' in result && typeof (result as { text?: unknown }).text === 'string') {
					content = (result as { text: string }).text;
				}
			}
			return { content, model };
		},
		async rerank(request) {
			const raw = await withClient(async (c) =>
				c.callTool({
					name: 'rerank.score',
					arguments: {
						query: request.query,
						documents: request.documents,
						model: request.model,
					},
				}),
			);
			const result: unknown = raw || {};
			const scoresRaw = (typeof result === 'object' && result && 'scores' in result) ? (result as { scores?: unknown }).scores : undefined;
			const model = (typeof result === 'object' && result && 'model' in result && typeof (result as { model?: unknown }).model === 'string') ? (result as { model: string }).model : 'mcp:rerank';
			const scores = Array.isArray(scoresRaw) ? (scoresRaw as number[]) : [];
			return { scores, model };
		},
	};
}
