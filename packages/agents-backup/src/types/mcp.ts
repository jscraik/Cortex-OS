/* c8 ignore file */
/**
 * Type definitions for MCP Client integration
 * Supporting Archon integration as outlined in the integration plan
 * (interfaces only – excluded from coverage)
 */

// Core Agent Interface (extends existing)
export interface Agent {
	id: string;
	name: string;
	capabilities: string[];
	execute(task: Task): Promise<AgentResult>;
}

// Task Interface
export interface Task {
	id: string;
	type: string;
	description: string;
	requirements?: string[];
	context?: Record<string, unknown>;
	requiresKnowledge?: boolean;
	priority?: 'low' | 'medium' | 'high' | 'urgent';
	deadline?: string;
}

// Agent Result Interface
export interface AgentResult {
	success: boolean;
	result: string;
	timestamp: string;
	executionTime?: number;
	mcpEnhanced?: boolean;
	artifacts?: TaskArtifact[];
	followUpTask?: FollowUpTaskRequest;
	metadata?: Record<string, unknown>;
}

// Task Artifact Interface
export interface TaskArtifact {
	filename: string;
	content: string;
	contentType?: string;
	shouldUpload?: boolean;
	tags?: string[];
}

// Follow-up Task Request
export interface FollowUpTaskRequest {
	title: string;
	description: string;
	priority?: 'low' | 'medium' | 'high' | 'urgent';
	tags?: string[];
}

// MCP Client Configuration
export interface MCPClientConfig {
	baseUrl: string;
	apiKey?: string;
	timeout?: number;
	maxRetries?: number;
	archonWebUrl?: string;
	headers?: Record<string, string>;
}

// Archon Integration Configuration
export interface ArchonIntegrationConfig {
	mcpServerUrl?: string;
	webUrl?: string;
	apiKey?: string;
	timeout?: number;
	maxRetries?: number;
	enableKnowledgeSearch?: boolean;
	enableTaskManagement?: boolean;
	enableDocumentUpload?: boolean;
}

// External Tool Definition
export interface ExternalTool {
	id: string;
	name: string;
	description: string;
	parameters: Record<string, ToolParameter>;
	capabilities: string[];
	provider: string;
}

// Tool Parameter Definition
export interface ToolParameter {
	type: string;
	description?: string;
	required?: boolean;
	default?: unknown;
	enum?: unknown[];
}

// Knowledge Search Result
export interface KnowledgeSearchResult {
	id: string;
	title: string;
	content: string;
	score: number;
	source: string;
	metadata: Record<string, unknown>;
	timestamp: string;
}

// Task Creation Result
export interface TaskCreationResult {
	taskId: string;
	title: string;
	status: string;
	createdAt: string;
	url: string;
}

// MCP Tool Response
export interface MCPToolResponse<T = unknown> {
	content?: Array<{
		type: string;
		text?: string;
		data?: T;
	}>;
	isError?: boolean;
	_meta?: Record<string, unknown>;
}

// MCP Server Capabilities
export interface MCPServerCapabilities {
	tools?: {
		listChanged?: boolean;
	};
	resources?: {
		subscribe?: boolean;
		listChanged?: boolean;
	};
	prompts?: {
		listChanged?: boolean;
	};
	logging?: {
		level?:
			| 'debug'
			| 'info'
			| 'notice'
			| 'warning'
			| 'error'
			| 'critical'
			| 'alert'
			| 'emergency';
	};
}

// MCP Client Events
export interface MCPClientEvents {
	connected: { capabilities: MCPServerCapabilities };
	disconnected: Record<string, never>;
	error: Error;
	tool_called: {
		toolName: string;
		arguments: Record<string, unknown>;
		result: unknown;
	};
	tool_error: {
		toolName: string;
		error: string;
	};
	knowledge_searched: {
		query: string;
		resultCount: number;
	};
	task_created: TaskCreationResult;
	task_updated: {
		taskId: string;
		status: string;
		notes?: string;
	};
	document_uploaded: {
		documentId: string;
		url: string;
	};
}

// Filter types for knowledge search
export interface KnowledgeSearchFilters {
	category?: string[];
	source?: string[];
	dateRange?: {
		from?: string;
		to?: string;
	};
	tags?: string[];
	contentType?: string[];
}

// Document metadata
export interface DocumentMetadata {
	category?: string;
	source?: string;
	author?: string;
	version?: string;
	language?: string;
	lastModified?: string;
	tags?: string[];
	[key: string]: unknown;
}

// Task status types
export type TaskStatus =
	| 'open'
	| 'in_progress'
	| 'pending_review'
	| 'blocked'
	| 'completed'
	| 'cancelled';

// Priority types
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Content types for documents
export type ContentType =
	| 'text/plain'
	| 'text/markdown'
	| 'application/json'
	| 'text/html'
	| 'application/pdf'
	| 'text/csv';
