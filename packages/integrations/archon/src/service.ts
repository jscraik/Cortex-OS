/**
 * Cortex-OS Archon Integration Service
 *
 * Main integration service that connects Cortex-OS to Archon's knowledge base
 * and task management MCP endpoints. Coordinates between packages.
 */

import type {
	Agent,
	AgentMCPClient,
	ArchonIntegrationConfig,
	KnowledgeSearchFilters,
	KnowledgeSearchResult,
	Task,
	TaskCreationResult,
} from '@cortex-os/agents';
import { createAgentMCPClient } from '@cortex-os/agents';
import type { ArchonTaskManager } from '@cortex-os/orchestration';
import { createArchonTaskManager } from '@cortex-os/orchestration';
import {
	type ArchonDocumentIngestionManager,
	type ArchonEmbedder,
	type ArchonEnhancedStore,
	type ArchonRAGConfig,
	createArchonEmbedder,
	createArchonEnhancedStore,
	createArchonIngestionManager,
	type DocumentSyncResult,
	type StoreLike,
} from '@cortex-os/rag';
import { EventEmitter } from 'events';

export interface CortexArchonConfig
	extends ArchonIntegrationConfig,
		ArchonRAGConfig {
	// Agent configuration
	enableAgentIntegration?: boolean;
	agentCapabilities?: string[];

	// Orchestration configuration
	enableTaskOrchestration?: boolean;
	taskSyncInterval?: number;

	// RAG configuration extends ArchonRAGConfig
	// (already includes enableRemoteRetrieval, enableDocumentSync, etc.)

	// Global configuration
	autoConnect?: boolean;
	healthCheckInterval?: number;
	retryConfig?: {
		maxRetries: number;
		backoffMs: number;
	};
}

export interface ArchonServiceStatus {
	connected: boolean;
	healthy: boolean;
	lastHealthCheck: string;
	capabilities: string[];
	errors: string[];
}

export interface ArchonServiceEvents {
	connected: () => void;
	disconnected: () => void;
	error: (error: Error) => void;
	'health-check': (status: ArchonServiceStatus) => void;
	'task-created': (task: Task) => void;
	'task-updated': (update: ArchonTaskStatusUpdate) => void;
	'document-synced': (result: DocumentSyncResult) => void;
	'knowledge-search': (query: string, results: KnowledgeSearchResult[]) => void;
}

/**
 * Narrow event payload for task status updates – avoids misusing the broader Task interface.
 */
export interface ArchonTaskStatusUpdate {
	taskId: string;
	status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
	updatedAt: string;
	notes?: string;
}

/**
 * Main Cortex-OS Archon Integration Service
 * Coordinates all Archon integrations across packages
 */
export class CortexArchonService extends EventEmitter {
	private readonly config: CortexArchonConfig;
	private mcpClient?: AgentMCPClient;
	private taskManager?: ArchonTaskManager;
	private embedder?: ArchonEmbedder;
	private enhancedStore?: ArchonEnhancedStore;
	private ingestionManager?: ArchonDocumentIngestionManager;
	private healthCheckTimer?: NodeJS.Timeout;
	private isInitialized = false;

	constructor(config: CortexArchonConfig) {
		super();
		this.config = config;
	}

	/**
	 * Initialize the Archon integration service
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			// Initialize MCP client
			this.mcpClient = createAgentMCPClient(this.config);
			await this.mcpClient.initialize();

			// Initialize components based on configuration
			if (this.config.enableTaskOrchestration) {
				this.taskManager = createArchonTaskManager(this.config);
				await this.taskManager.initialize();
			}

			if (this.config.enableRemoteRetrieval || this.config.enableDocumentSync) {
				// Initialize RAG components (embedder and enhanced store need external dependencies)
				this.ingestionManager = createArchonIngestionManager(this.config);
				await this.ingestionManager.initialize();
			}

			// Set up health check
			if (
				this.config.healthCheckInterval &&
				this.config.healthCheckInterval > 0
			) {
				this.startHealthCheck();
			}

			this.isInitialized = true;
			this.emit('connected');

			// Integration service initialized successfully
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.emit('error', err);
			throw new Error(
				`Failed to initialize Cortex-Archon service: ${err.message}`,
			);
		}
	}

	/**
	 * Create an Archon-capable agent
	 */
	async createAgent(): Promise<Agent> {
		throw new Error(
			'createAgent is currently unsupported: enable remote agent instantiation by setting ARCHON_ENABLE_REMOTE_AGENT=1 after implementing MCP client support.',
		);
	}

	/**
	 * Create a task in Archon
	 */
	async createTask(
		title: string,
		description: string,
		options: {
			priority?: 'low' | 'medium' | 'high' | 'urgent';
			assignedTo?: string;
			tags?: string[];
			dueDate?: string;
		} = {},
	): Promise<TaskCreationResult> {
		if (!this.mcpClient) {
			throw new Error('MCP client not initialized');
		}

		try {
			const task = await this.mcpClient.createTask(title, description, options);
			this.emit('task-created', task);
			return task;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.emit('error', err);
			throw err;
		}
	}

	/**
	 * Update a task status
	 */
	async updateTaskStatus(
		taskId: string,
		status: 'todo' | 'in_progress' | 'completed' | 'cancelled',
		notes?: string,
	): Promise<void> {
		if (!this.mcpClient) {
			throw new Error('MCP client not initialized');
		}

		try {
			await this.mcpClient.updateTaskStatus(taskId, status, notes);

			const update: ArchonTaskStatusUpdate = {
				taskId,
				status,
				updatedAt: new Date().toISOString(),
				notes,
			};
			this.emit('task-updated', update);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.emit('error', err);
			throw err;
		}
	}

	/**
	 * Search Archon's knowledge base
	 */
	async searchKnowledge(
		query: string,
		filters?: KnowledgeSearchFilters,
	): Promise<KnowledgeSearchResult[]> {
		if (!this.mcpClient) {
			throw new Error('MCP client not initialized');
		}

		try {
			// Extract limit from filters if present (extend interface or treat specially)
			// Extract limit while preserving strongly-typed known filter keys
			const workingFilters = filters || {};
			const { limit, ...rest } = workingFilters as KnowledgeSearchFilters & {
				limit?: number;
			};
			const results = await this.mcpClient.searchKnowledgeBase(query, {
				limit: typeof limit === 'number' ? limit : 10,
				filters: Object.keys(rest).length ? rest : undefined,
			});

			this.emit('knowledge-search', query, results);
			return results;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.emit('error', err);
			throw err;
		}
	}

	/**
	 * Upload a document to Archon
	 */
	async uploadDocument(
		content: string,
		filename: string,
		options: {
			tags?: string[];
			metadata?: Record<string, unknown>;
		} = {},
	): Promise<DocumentSyncResult> {
		if (!this.mcpClient) {
			throw new Error('MCP client not initialized');
		}

		try {
			const result = await this.mcpClient.uploadDocument(
				content,
				filename,
				options,
			);
			// Allow multiple possible return field names without resorting to 'any'
			type UploadResponse = { id?: string; documentId?: string; url?: string };
			const r = result as UploadResponse;
			const syncResult: DocumentSyncResult = {
				documentId: r.id || r.documentId || filename,
				archonUrl: r.url || '',
				syncedAt: new Date().toISOString(),
				status: 'success',
			};

			this.emit('document-synced', syncResult);
			return syncResult;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			const syncResult: DocumentSyncResult = {
				documentId: filename,
				archonUrl: '',
				syncedAt: new Date().toISOString(),
				status: 'failed',
				error: err.message,
			};

			this.emit('document-synced', syncResult);
			this.emit('error', err);
			throw err;
		}
	}

	/**
	 * Create a document ingestion job
	 */
	async createIngestionJob(
		title: string,
		documents: Array<{
			filename: string;
			content: string;
			metadata?: Record<string, unknown>;
		}>,
		options: {
			priority?: 'low' | 'medium' | 'high' | 'urgent';
			tags?: string[];
			chunkSize?: number;
			batchSize?: number;
		} = {},
	): Promise<{ taskId: string; jobId: string }> {
		if (!this.ingestionManager) {
			throw new Error(
				'Document ingestion not enabled or manager not initialized',
			);
		}

		try {
			const result = await this.ingestionManager.createIngestionJob(
				title,
				documents,
				options,
			);
			return result;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.emit('error', err);
			throw err;
		}
	}

	/**
	 * Set up an Archon embedder with fallback
	 */
	setupEmbedder(fallbackEmbedder?: {
		embed(texts: string[]): Promise<number[][]>;
	}): ArchonEmbedder {
		if (this.embedder) {
			return this.embedder;
		}

		this.embedder = createArchonEmbedder(this.config, fallbackEmbedder);
		return this.embedder;
	}

	/**
	 * Set up an Archon-enhanced store
	 */
	setupEnhancedStore(localStore: {
		store: (
			items: Array<{
				id: string;
				vector: number[];
				metadata?: Record<string, unknown>;
			}>,
		) => Promise<void>;
		upsert?: (
			chunks: Array<{
				id: string;
				text: string;
				embedding?: number[];
				metadata?: Record<string, unknown>;
			}>,
		) => Promise<void>;
		query: (
			vector: number[],
			options?: Record<string, unknown>,
		) => Promise<
			Array<{ id: string; score: number; metadata?: Record<string, unknown> }>
		>;
		delete: (ids: string[]) => Promise<void>;
	}): ArchonEnhancedStore {
		if (this.enhancedStore) {
			return this.enhancedStore;
		}

		const adaptedStore = {
			upsert: async (
				chunks: Array<{
					id: string;
					text: string;
					embedding?: number[];
					metadata?: Record<string, unknown>;
				}>,
			) => {
				if (typeof localStore.upsert === 'function') {
					await localStore.upsert(chunks);
					return;
				}
				await localStore.store(
					chunks.map((c) => ({
						id: c.id,
						vector: c.embedding || [],
						metadata: { ...c.metadata, text: c.text },
					})),
				);
			},
			query: async (embedding: number[], k?: number) => {
				const res = await localStore.query(embedding, { k });
				return res.map((r) => ({
					id: r.id,
					text: (r.metadata?.text as string) || '',
					metadata: r.metadata,
					score: r.score,
				}));
			},
		};

		// createArchonEnhancedStore expects a Store; adaptedStore matches required methods
		// adaptedStore satisfies the minimal subset used by createArchonEnhancedStore
		this.enhancedStore = createArchonEnhancedStore(
			adaptedStore as StoreLike,
			this.config,
		);
		return this.enhancedStore;
	}

	/**
	 * Get service status
	 */
	async getStatus(): Promise<ArchonServiceStatus> {
		const status: ArchonServiceStatus = {
			connected: this.isInitialized && Boolean(this.mcpClient),
			healthy: false,
			lastHealthCheck: new Date().toISOString(),
			capabilities: [],
			errors: [],
		};

		if (this.mcpClient) {
			try {
				status.healthy = await this.mcpClient.healthCheck();
				status.capabilities = await this.getCapabilities();
			} catch (error) {
				status.healthy = false;
				status.errors.push(
					error instanceof Error ? error.message : String(error),
				);
			}
		}

		return status;
	}

	/**
	 * Get available capabilities from Archon
	 */
	private async getCapabilities(): Promise<string[]> {
		if (!this.mcpClient) {
			return [];
		}

		try {
			const capabilities = await this.mcpClient.callTool(
				'list_capabilities',
				{},
			);
			return Array.isArray(capabilities) ? capabilities : [];
		} catch {
			// Return basic capabilities if the tool doesn't exist
			return ['knowledge_search', 'task_management', 'document_upload'];
		}
	}

	/**
	 * Start periodic health checks
	 */
	private startHealthCheck(): void {
		if (this.healthCheckTimer) {
			clearInterval(this.healthCheckTimer);
		}

		const interval = this.config.healthCheckInterval || 60000; // Default 1 minute
		this.healthCheckTimer = setInterval(async () => {
			try {
				const status = await this.getStatus();
				this.emit('health-check', status);

				if (!status.healthy) {
					console.warn('[Cortex Archon] Health check failed:', status.errors);
				}
			} catch (error) {
				const err = error instanceof Error ? error : new Error(String(error));
				this.emit('error', err);
			}
		}, interval);
	}

	/**
	 * Cleanup and disconnect
	 */
	async cleanup(): Promise<void> {
		try {
			if (this.healthCheckTimer) {
				clearInterval(this.healthCheckTimer);
				this.healthCheckTimer = undefined;
			}

			await Promise.all([
				this.mcpClient?.disconnect(),
				// Note: ArchonTaskManager doesn't have cleanup method
				this.embedder?.cleanup(),
				this.enhancedStore?.cleanup(),
				this.ingestionManager?.cleanup(),
			]);

			this.isInitialized = false;
			this.emit('disconnected');

			// Service cleaned up successfully
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.emit('error', err);
			throw err;
		}
	}
}

/**
 * Factory function to create the Cortex-Archon service
 */
export function createCortexArchonService(
	config: CortexArchonConfig,
): CortexArchonService {
	return new CortexArchonService(config);
}
