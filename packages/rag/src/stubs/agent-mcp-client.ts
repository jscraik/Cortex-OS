/**
 * Phase C.3: Agent MCP Client Stub Implementation
 *
 * Provides a test stub for AgentMCPClient with tool call tracking,
 * queue management, and inspection helpers for testing.
 */

import type { AgentMCPClient, KnowledgeSearchFilters, KnowledgeSearchResult } from '../integrations/agents-shim.js';

export interface ToolCall {
	name: string;
	args: Record<string, unknown>;
	timestamp: number;
	brand: string;
}

export interface ToolCallHistory extends ToolCall {
	duration: number;
	success: boolean;
	result?: unknown;
	error?: string;
}

export interface AgentMCPClientStub extends AgentMCPClient {
	// Mocking
	mockCallTool(name: string, response: unknown): void;
	mockError(name: string, error: Error): void;
	
	// Queue inspection
	getCallQueue(): ToolCall[];
	clearQueue(): void;
	
	// Call tracking
	wasToolCalled(name: string): boolean;
	getToolCallCount(name: string): number;
	getLastCallArgs(name: string): Record<string, unknown> | undefined;
	getAllCalls(): ToolCall[];
	
	// History with metadata
	getCallHistory(): ToolCallHistory[];
	clearHistory(): void;
}

class AgentMCPClientStubImpl implements AgentMCPClientStub {
	private mockResponses = new Map<string, unknown>();
	private mockErrors = new Map<string, Error>();
	private callQueue: ToolCall[] = [];
	private callHistory: ToolCallHistory[] = [];

	async initialize(): Promise<unknown> {
		return { status: 'ready', brand: 'brAInwav' };
	}

	async callTool(name: string, args: Record<string, unknown>, timeout?: number): Promise<unknown> {
		const startTime = Date.now();
		const callRecord: ToolCall = {
			name,
			args: { ...args },
			timestamp: startTime,
			brand: (args.brand as string) || 'brAInwav',
		};

		// Add to queue
		this.callQueue.push(callRecord);

		// Check for mock error
		if (this.mockErrors.has(name)) {
			const error = this.mockErrors.get(name)!;
			const historyRecord: ToolCallHistory = {
				...callRecord,
				duration: Date.now() - startTime,
				success: false,
				error: error.message,
			};
			this.callHistory.push(historyRecord);
			throw error;
		}

		// Get mock response
		const response = this.mockResponses.get(name) || { 
			message: `Mock response for ${name}`, 
			brand: 'brAInwav' 
		};

		const historyRecord: ToolCallHistory = {
			...callRecord,
			duration: Date.now() - startTime,
			success: true,
			result: response,
		};
		this.callHistory.push(historyRecord);

		return response;
	}

	async searchKnowledgeBase(
		query: string,
		options?: { limit?: number; filters?: KnowledgeSearchFilters },
	): Promise<KnowledgeSearchResult[]> {
		const result = await this.callTool('search_knowledge_base', { 
			query, 
			limit: options?.limit, 
			filters: options?.filters 
		});
		return result as KnowledgeSearchResult[];
	}

	async createTask(
		title: string,
		description: string,
		options?: Record<string, unknown>,
	): Promise<unknown> {
		return this.callTool('create_task', { title, description, ...options });
	}

	async updateTaskStatus(taskId: string, status: string, notes?: string): Promise<unknown> {
		return this.callTool('update_task_status', { taskId, status, notes });
	}

	async uploadDocument(
		content: string,
		filename: string,
		options?: { tags?: string[]; metadata?: Record<string, unknown> },
	): Promise<{ documentId: string; url: string }> {
		const result = await this.callTool('upload_document', { content, filename, ...options });
		return result as { documentId: string; url: string };
	}

	async healthCheck(): Promise<boolean> {
		const result = await this.callTool('health_check', {});
		return Boolean(result);
	}

	async disconnect(): Promise<void> {
		await this.callTool('disconnect', {});
	}

	// Mocking methods
	mockCallTool(name: string, response: unknown): void {
		this.mockResponses.set(name, response);
	}

	mockError(name: string, error: Error): void {
		this.mockErrors.set(name, error);
	}

	// Queue inspection
	getCallQueue(): ToolCall[] {
		return [...this.callQueue];
	}

	clearQueue(): void {
		this.callQueue = [];
	}

	// Call tracking
	wasToolCalled(name: string): boolean {
		return this.callQueue.some(call => call.name === name);
	}

	getToolCallCount(name: string): number {
		return this.callQueue.filter(call => call.name === name).length;
	}

	getLastCallArgs(name: string): Record<string, unknown> | undefined {
		const calls = this.callQueue.filter(call => call.name === name);
		return calls.length > 0 ? calls[calls.length - 1].args : undefined;
	}

	getAllCalls(): ToolCall[] {
		return [...this.callQueue];
	}

	// History with metadata
	getCallHistory(): ToolCallHistory[] {
		return [...this.callHistory];
	}

	clearHistory(): void {
		this.callHistory = [];
	}
}

/**
 * Create an AgentMCPClient stub for testing
 * 
 * Phase C.3: Client Stub Tool Invocation Tracking - provides comprehensive
 * tool call tracking, queue management, and inspection helpers for testing
 * MCP workflows with brAInwav branding.
 *
 * @returns AgentMCPClientStub with tracking capabilities
 */
export function createAgentMCPClientStub(): AgentMCPClientStub {
	return new AgentMCPClientStubImpl();
}

// Existing mock infrastructure (preserve compatibility)
// Locally define MCPIntegrationConfig to avoid tight coupling with agents package

export type MCPIntegrationConfig = Record<string, unknown>;

export interface KnowledgeSearchFilters {
	category?: string[];
	source?: string[];
	dateRange?: { from?: string; to?: string };
	tags?: string[];
	contentType?: string[];
}

export interface KnowledgeSearchResult {
	id: string;
	title: string;
	content: string;
	score: number;
	source: string;
	metadata: Record<string, unknown>;
	timestamp: string;
}

type MethodName =
	| 'mcp_initialize'
	| 'mcp_call_tool'
	| 'mcp_search_knowledge_base'
	| 'mcp_create_task'
	| 'mcp_update_task_status'
	| 'mcp_upload_document'
	| 'mcp_health_check'
	| 'mcp_close';

interface MockResponse {
	method: MethodName;
	value?: unknown;
	error?: Error;
}

interface MockCall {
	method: MethodName;
	params: Record<string, unknown>;
}

export const mockCallLog: MockCall[] = [];
export const mockConfigLog: MCPIntegrationConfig[] = [];
const responseQueue: MockResponse[] = [];

export function resetMockAgentState() {
	mockCallLog.length = 0;
	mockConfigLog.length = 0;
	responseQueue.length = 0;
}

export function enqueueMockResponse(method: MethodName, value: unknown) {
	responseQueue.push({ method, value });
}

export function enqueueMockError(method: MethodName, message: string | Error) {
	responseQueue.push({
		method,
		error: message instanceof Error ? message : new Error(message),
	});
}

function takeResponse(method: MethodName): MockResponse {
	const entry = responseQueue.shift();
	if (!entry) {
		return defaultResponse(method);
	}
	if (entry.method !== method) {
		throw new Error(`Expected response for ${method} but received ${entry.method}`);
	}
	return entry;
}

function defaultResponse(method: MethodName): MockResponse {
	switch (method) {
		case 'mcp_initialize':
			return { method, value: { capabilities: [] } };
		case 'mcp_call_tool':
			return { method, value: {} };
		case 'mcp_search_knowledge_base':
			return { method, value: [] };
		case 'mcp_create_task':
			return {
				method,
				value: { taskId: 'task-mock', url: 'mock://task-mock' },
			};
		case 'mcp_update_task_status':
			return { method, value: { updated: true } };
		case 'mcp_upload_document':
			return {
				method,
				value: { documentId: 'doc-mock', url: 'mock://doc-mock' },
			};
		case 'mcp_health_check':
			return { method, value: true };
		case 'mcp_close':
			return { method, value: undefined };
	}
}

export class AgentMCPClient {
	private connected = false;
	constructor(private readonly config: MCPIntegrationConfig) {
		mockConfigLog.push(config);
	}

	async initialize() {
		const response = takeResponse('mcp_initialize');
		mockCallLog.push({
			method: 'mcp_initialize',
			params: { config: this.config },
		});
		if (response.error) throw response.error;
		this.connected = true;
		return response.value;
	}

	private ensureConnected() {
		if (!this.connected) {
			throw new Error('MCP client is not connected. Call initialize() first.');
		}
	}

	async callTool(name: string, args: Record<string, unknown>, timeout?: number) {
		this.ensureConnected();
		mockCallLog.push({
			method: 'mcp_call_tool',
			params: { name, arguments: args, timeout },
		});
		const response = takeResponse('mcp_call_tool');
		if (response.error) throw response.error;
		return response.value;
	}

	async searchKnowledgeBase(
		query: string,
		options: { limit?: number; filters?: KnowledgeSearchFilters } = {},
	): Promise<KnowledgeSearchResult[]> {
		this.ensureConnected();
		mockCallLog.push({
			method: 'mcp_search_knowledge_base',
			params: { query, options },
		});
		const response = takeResponse('mcp_search_knowledge_base');
		if (response.error) throw response.error;
		return (response.value as KnowledgeSearchResult[]) ?? [];
	}

	async createTask(title: string, description: string, options: Record<string, unknown> = {}) {
		this.ensureConnected();
		mockCallLog.push({
			method: 'mcp_create_task',
			params: { title, description, options },
		});
		const response = takeResponse('mcp_create_task');
		if (response.error) throw response.error;
		return response.value ?? {};
	}

	async updateTaskStatus(taskId: string, status: string, notes?: string) {
		this.ensureConnected();
		mockCallLog.push({
			method: 'mcp_update_task_status',
			params: { taskId, status, notes },
		});
		const response = takeResponse('mcp_update_task_status');
		if (response.error) throw response.error;
		return response.value;
	}

	async uploadDocument(
		content: string,
		filename: string,
		options: { tags?: string[]; metadata?: Record<string, unknown> } = {},
	) {
		this.ensureConnected();
		mockCallLog.push({
			method: 'mcp_upload_document',
			params: { content, filename, options },
		});
		const response = takeResponse('mcp_upload_document');
		if (response.error) throw response.error;
		const payload = (response.value as { documentId?: string; id?: string; url?: string }) ?? {};
		const documentId = payload.documentId ?? payload.id ?? 'doc-mock';
		const url = payload.url ?? `mock://${documentId}`;
		return { documentId, url };
	}

	async healthCheck() {
		mockCallLog.push({ method: 'mcp_health_check', params: {} });
		const response = takeResponse('mcp_health_check');
		if (response.error) return false;
		return Boolean(response.value ?? true);
	}

	async disconnect() {
		mockCallLog.push({ method: 'mcp_close', params: {} });
		const response = takeResponse('mcp_close');
		if (response?.error) throw response.error;
		this.connected = false;
	}
}

export function createAgentMCPClient(config: MCPIntegrationConfig) {
	return new AgentMCPClient(config);
}
