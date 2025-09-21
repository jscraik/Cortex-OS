import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type MinimalStore,
	RemoteMCPDocumentIngestionManager,
	RemoteMCPEmbedder,
	RemoteMCPEnhancedStore,
	type RemoteRAGConfig,
	type RemoteRetrievalOptions,
} from '../src/integrations/remote-mcp.js';
import {
	createAgentMCPClient as createStubAgentClient,
	enqueueMockError,
	enqueueMockResponse,
	mockCallLog,
	mockConfigLog,
	resetMockAgentState,
} from './stubs/agent-mcp-client.js';

type MethodLog = typeof mockCallLog;

describe('RAG MCP integration', () => {
	beforeEach(() => {
		resetMockAgentState();
		// Inject stub client factory for all constructors under test
		(globalThis as unknown as { __createAgentMCPClient__?: unknown }).__createAgentMCPClient__ =
			createStubAgentClient;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		delete (globalThis as unknown as { __createAgentMCPClient__?: unknown })
			.__createAgentMCPClient__;
	});

	it('calls rag embedding tool through MCP client', async () => {
		enqueueMockResponse('mcp_initialize', { capabilities: [] });
		enqueueMockResponse('mcp_call_tool', { embeddings: [[0.11, 0.22, 0.33]] });

		const config: RemoteRAGConfig = {
			mcpServerUrl: 'http://mcp.test',
			apiKey: 'token',
			fallbackToLocal: false,
		};

		const embedder = new RemoteMCPEmbedder(config);
		await embedder.initialize();

		const vectors = await embedder.embed(['integration-query']);
		expect(vectors).toEqual([[0.11, 0.22, 0.33]]);

		expect(methods(mockCallLog)).toEqual(['mcp_initialize', 'mcp_call_tool']);
		expect(mockCallLog[1].params).toMatchObject({
			name: 'generate_embeddings',
			arguments: { texts: ['integration-query'], model: 'default' },
		});
	});

	it('combines local and remote search results within requested topK', async () => {
		enqueueMockResponse('mcp_initialize', { capabilities: [] });
		enqueueMockResponse('mcp_search_knowledge_base', [
			{
				id: 'remote-1',
				title: 'Remote Source',
				content: 'remote context',
				score: 0.95,
				source: 'remote',
				metadata: {},
				timestamp: new Date().toISOString(),
			},
			{
				id: 'remote-2',
				title: 'Remote Two',
				content: 'remote follow-up',
				score: 0.8,
				source: 'remote',
				metadata: {},
				timestamp: new Date().toISOString(),
			},
		]);

		const localStore: MinimalStore = {
			async upsert() {
				/* noop */
			},
			async query(_vector: number[], k = 10) {
				const entries = [
					{
						id: 'local-1',
						text: 'local memo',
						score: 0.88,
						metadata: { text: 'local memo', provider: 'local' },
					},
					{
						id: 'local-2',
						text: 'local follow-up',
						score: 0.7,
						metadata: { text: 'local follow-up', provider: 'local' },
					},
				];
				return entries.slice(0, k);
			},
		};

		const store = new RemoteMCPEnhancedStore(localStore, {
			mcpServerUrl: 'http://mcp.test',
			enableRemoteRetrieval: true,
			hybridSearchWeights: { local: 0.6, remote: 0.4 },
			remoteSearchLimit: 2,
		});

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await store.initialize();
		const results = await store.query([0.1, 0.2, 0.3], {
			hybridSearch: true,
			topK: 2,
		} satisfies RemoteRetrievalOptions);
		warnSpy.mockRestore();

		expect(results).toHaveLength(2);
		expect(methods(mockCallLog)).toEqual(['mcp_initialize', 'mcp_search_knowledge_base']);
		expect(mockCallLog[1].params).toMatchObject({
			query: expect.any(String),
			options: expect.objectContaining({ limit: 2 }),
		});
	});

	it('falls back to local store when remote retrieval errors', async () => {
		enqueueMockResponse('mcp_initialize', { capabilities: [] });
		enqueueMockError('mcp_search_knowledge_base', 'gateway timeout');

		const localStore: MinimalStore = {
			async upsert() {
				/* noop */
			},
			async query() {
				return [
					{
						id: 'local-only',
						text: 'cached context',
						score: 0.75,
						metadata: { text: 'cached context', provider: 'local' },
					},
				];
			},
		};

		const store = new RemoteMCPEnhancedStore(localStore, {
			mcpServerUrl: 'http://mcp.test',
			enableRemoteRetrieval: true,
			fallbackToLocal: true,
		});

		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		await store.initialize();
		const results = await store.query([0.9, 0.1, 0.4], {} as RemoteRetrievalOptions);
		warnSpy.mockRestore();
		errorSpy.mockRestore();

		expect(results.map((r) => r.id)).toEqual(['local-only']);
		const remoteCalls = mockCallLog.filter((entry) => entry.method === 'mcp_search_knowledge_base');
		expect(remoteCalls).toHaveLength(1);
	});

	it('applies auth config while orchestrating ingestion jobs', async () => {
		enqueueMockResponse('mcp_initialize', { capabilities: [] });
		enqueueMockResponse('mcp_create_task', {
			taskId: 'task-42',
			url: 'http://mcp/tasks/task-42',
		});
		enqueueMockResponse('mcp_upload_document', { documentId: 'doc-1' });
		enqueueMockResponse('mcp_upload_document', { documentId: 'doc-2' });
		enqueueMockResponse('mcp_update_task_status', { updated: true });
		enqueueMockResponse('mcp_update_task_status', { updated: true });

		const manager = new RemoteMCPDocumentIngestionManager({
			mcpServerUrl: 'http://mcp.test',
			apiKey: 'secure-token',
		});

		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		await manager.initialize();
		const job = await manager.createIngestionJob(
			'Index docs',
			[
				{ filename: 'one.txt', content: 'alpha', metadata: { team: 'a' } },
				{ filename: 'two.txt', content: 'beta', metadata: { team: 'b' } },
			],
			{ priority: 'high', tags: ['integration'] },
		);
		errorSpy.mockRestore();

		expect(job.taskId).toBe('task-42');
		expect(methods(mockCallLog)).toEqual([
			'mcp_initialize',
			'mcp_create_task',
			'mcp_upload_document',
			'mcp_upload_document',
			'mcp_update_task_status',
			'mcp_update_task_status',
		]);
		expect(typeof mockConfigLog[0]).toBe('object');
	});
});

function methods(log: MethodLog): string[] {
	return log.map((entry) => entry.method);
}
