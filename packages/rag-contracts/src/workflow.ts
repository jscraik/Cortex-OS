/**
 * Wikidata Workflow Types - Shared contracts for semantic workflows
 * @package @cortex-os/rag-contracts
 * @author brAInwav Team
 */

import type { Envelope } from '@cortex-os/a2a-contracts';
import type { AgentMCPClient } from './mcp-client.js';

/**
 * Vector search result from Wikidata
 */
export interface VectorSearchResult {
	id: string;
	label: string;
	description?: string;
	score: number;
	metadata?: Record<string, unknown>;
}

/**
 * Claims result from Wikidata
 */
export interface ClaimsResult {
	claims: Array<{
		property: string;
		value: string;
		rank?: string;
	}>;
}

/**
 * SPARQL query result
 */
export interface SparqlResult {
	results: Array<Record<string, unknown>>;
}

/**
 * Workflow execution result with brAInwav branding
 */
export interface WorkflowResult {
	content: string;
	source: string;
	metadata: {
		wikidata?: {
			qid?: string;
			claimGuid?: string;
			sparql?: string;
			vectorResults?: VectorSearchResult[];
			claims?: ClaimsResult['claims'];
			sparqlBindings?: SparqlResult['results'];
		};
		fallbackReason?: string;
		partialFailure?: string;
		originalError?: string;
		brand: string;
	};
}

/**
 * Fact query routing options with Matryoshka dimension hints
 */
export interface FactQueryOptions {
	scope?: 'facts' | 'properties';
	matryoshkaDimension?: number;
	embedderHint?: string;
}

/**
 * Workflow routing options
 */
export interface WorkflowRoutingOptions extends FactQueryOptions {}

/**
 * Workflow execution insight for persistence
 */
export interface WorkflowInsight {
	query: string;
	connectorId: string;
	result: WorkflowResult;
	partialFailure?: string;
	timestamp: string;
	brand: string;
}

/**
 * Workflow hooks for event emission and insight persistence
 */
export interface WorkflowHooks {
	publishEvent?: (event: Envelope) => Promise<void> | void;
	persistInsight?: (insight: WorkflowInsight) => Promise<void> | void;
}

/**
 * Store interface for local persistence
 */
export interface Store {
	upsert(chunks: Array<{ id: string; text: string; embedding: number[]; metadata?: Record<string, unknown> }>): Promise<void>;
	query(embedding: number[], k?: number): Promise<Array<{ id: string; text: string; score?: number; metadata?: Record<string, unknown> }>>;
}

/**
 * Workflow execution options
 */
export interface WorkflowOptions {
	mcpClient?: AgentMCPClient;
	localStore?: Store;
	timeout?: number;
	enableSparql?: boolean;
	enablePartialResults?: boolean;
	enableClaims?: boolean;
	queryId?: string;
	routing?: WorkflowRoutingOptions;
	hooks?: WorkflowHooks;
}
