/**
 * RAG Contracts - Shared type definitions
 * @package @cortex-os/rag-contracts
 * @author brAInwav Team
 * 
 * This package contains shared type contracts used by both:
 * - @cortex-os/rag
 * - @cortex-os/agents
 * 
 * Extracting these types breaks the circular dependency between rag and agents.
 */

// RAG Event types
export {
	RAGEventTypes,
	type RAGEventType,
	type RagEventPayloadMap,
	type RagEventEnvelope,
	type RagEventHandler,
	type RagPublishOptions,
	type RagBus,
} from './events.js';

// MCP Client types
export {
	type MCPIntegrationConfig,
	type KnowledgeSearchFilters,
	type KnowledgeSearchResult,
	type AgentMCPClient,
} from './mcp-client.js';

// Workflow types
export {
	type VectorSearchResult,
	type ClaimsResult,
	type SparqlResult,
	type WorkflowResult,
	type FactQueryOptions,
	type WorkflowRoutingOptions,
	type WorkflowInsight,
	type WorkflowHooks,
	type Store,
	type WorkflowOptions,
} from './workflow.js';
