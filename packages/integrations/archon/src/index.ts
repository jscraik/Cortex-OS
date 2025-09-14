/**
 * Cortex-OS Archon Integration Package
 *
 * Main integration package that connects Cortex-OS to Archon's
 * knowledge base and task management via MCP protocol.
 */

// Re-export types from dependencies for convenience
export type {
	Agent,
	ArchonIntegrationConfig,
	KnowledgeSearchFilters,
	KnowledgeSearchResult,
	Task,
} from '@cortex-os/agents';
export type {
	ArchonRAGConfig,
	DocumentSyncResult,
	RemoteRetrievalOptions,
} from '@cortex-os/rag';
export type {
	ArchonServiceEvents,
	ArchonServiceStatus,
	CortexArchonConfig,
} from './service.js';
export {
	CortexArchonService,
	createCortexArchonService,
} from './service.js';
