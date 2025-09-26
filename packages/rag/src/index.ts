import { z } from 'zod';
import { Qwen3Presets } from './embed/qwen3.js';
import { AgentConfigSchema, RAGQuerySchema } from './lib/contracts-shim.js';
import { createJsonOutput, createStdOutput, StructuredError } from './lib/shims.js';

export { PyEmbedder } from './embed/python-client.js';

import { createMultiModelGenerator, ModelPresets } from './generation/multi-model.js';
import { memoryStore } from './store/memory.js';

// Agentic dispatcher
export {
	AgenticDispatcher,
	createAgenticDispatcher
} from './agent/dispatcher.js';
export { createPooledEmbedder, PooledEmbedder } from './embed/embedding-pool.js';
export { createRagBus } from './events/rag-bus.js';
export type {
	RagBus,
	RagEventEnvelope,
	RagEventHandler,
	RagPublishOptions
} from './events/rag-bus.js';
export type {
	RAGIngestCompleteEvent,
	RAGIngestEvent,
	RAGQueryEvent,
	RAGQueryResultEvent
} from './events/rag-events.js';
// A2A Events for inter-package communication
export {
	createRAGIngestCompleteEvent,
	createRAGIngestEvent,
	createRAGQueryEvent,
	createRAGQueryResultEvent,
	RAGEventSchemas,
	RAGEventTypes,
	ragIngestCompleteEventSchema,
	ragIngestEventSchema,
	ragQueryEventSchema,
	ragQueryResultEventSchema
} from './events/rag-events.js';
export type {
	DocumentSyncResult as RemoteDocumentSyncResult, RemoteRAGConfig as RemoteMCPConfig, MinimalStore as RemoteMinimalStore, RemoteRetrievalOptions as RemoteQueryOptions,
	StoreLike as RemoteStoreLike
} from './integrations/remote-mcp.js';
// Archon integration exports removed in favor of vendor-neutral Remote MCP
// Remote MCP Integration (vendor-neutral)
export {
	createRemoteMCPEmbedder,
	createRemoteMCPEnhancedStore,
	createRemoteMCPIngestionManager,
	RemoteMCPDocumentIngestionManager,
	RemoteMCPEmbedder,
	RemoteMCPEnhancedStore
} from './integrations/remote-mcp.js';
// Content security policy for XSS/injection protection
export {
	ContentSecurityPolicy, type ContentSecurityConfig,
	type ContentSecurityError
} from './lib/content-security.js';
export * as lib from './lib/index.js';
export type { Chunk, Embedder, Pipeline, Store } from './lib/index.js';
// MCP Tools for external AI agent integration
export {
	ragIngestTool,
	ragIngestToolSchema,
	ragMcpTools,
	ragQueryTool,
	ragQueryToolSchema,
	ragStatusTool,
	ragStatusToolSchema
} from './mcp/tools.js';
export { RAGPipeline, type RAGPipelineConfig } from './rag-pipeline.js';
export { startRagHealthServer } from './server/bootstrap.js';
export {
	createEmbedderHealthCheck,
	createPgvectorHealthCheck,
	createRerankerHealthCheck
} from './server/health-checks.js';
// Health exports
export { HealthProvider } from './server/health-provider.js';
export { createHealthServer } from './server/health-server.js';
export { fileStore } from './store/file.js';
export { HierarchicalStore } from './store/hierarchical-store.js';
export { memoryStore } from './store/memory.js';
// Workspace scoping
export { createWorkspaceManager, WorkspaceManager } from './workspace/manager.js';
export { createScopedStore, ScopedStore } from './workspace/scoped-store.js';

const InputSchema = z.object({
	config: AgentConfigSchema,
	query: RAGQuerySchema,
	json: z.boolean().optional(),
});
export type RAGInput = z.infer<typeof InputSchema>;

export async function handleRAG(input: unknown): Promise<string> {
	const parsed = InputSchema.safeParse(input);
	if (!parsed.success) {
		const err = new StructuredError('INVALID_INPUT', 'Invalid RAG input', {
			issues: parsed.error.issues,
		});
		return createJsonOutput({ error: err.toJSON() });
	}
	const { config, query, json } = parsed.data;

	const store = memoryStore();
	const embedder = Qwen3Presets.development();
	const generator = createMultiModelGenerator({
		model: ModelPresets.chat,
		defaultConfig: { maxTokens: config.maxTokens },
		timeout: config.timeoutMs,
	});

	const [embedding] = await embedder.embed([query.query]);
	const anyStore = store as unknown as {
		queryWithText?: (e: number[], q: string, k?: number) => Promise<ReturnType<typeof store.query>>;
	};
	const results =
		typeof anyStore.queryWithText === 'function'
			? await anyStore.queryWithText(embedding, query.query, query.topK)
			: await store.query(embedding, query.topK);
	const context = results.map((r: { text: string }) => r.text).join('\n');
	const prompt = context ? `${context}\n\n${query.query}` : query.query;
	const answer = await generator.generate(prompt, {
		maxTokens: config.maxTokens,
	});

	const payload = {
		answer: answer.content,
		sources: results,
		provider: answer.provider,
	};
	return json ? createJsonOutput(payload) : createStdOutput(answer.content);
}
