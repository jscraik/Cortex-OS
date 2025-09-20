export type MCPIntegrationConfig = Record<string, unknown>;
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
export interface KnowledgeSearchResult {
    id: string;
    title: string;
    content: string;
    score: number;
    source: string;
    metadata: Record<string, unknown>;
    timestamp: string;
}
type MethodName = 'mcp_initialize' | 'mcp_call_tool' | 'mcp_search_knowledge_base' | 'mcp_create_task' | 'mcp_update_task_status' | 'mcp_upload_document' | 'mcp_health_check' | 'mcp_close';
interface MockCall {
    method: MethodName;
    params: Record<string, unknown>;
}
export declare const mockCallLog: MockCall[];
export declare const mockConfigLog: MCPIntegrationConfig[];
export declare function resetMockAgentState(): void;
export declare function enqueueMockResponse(method: MethodName, value: unknown): void;
export declare function enqueueMockError(method: MethodName, message: string | Error): void;
export declare class AgentMCPClient {
    private readonly config;
    private connected;
    constructor(config: MCPIntegrationConfig);
    initialize(): Promise<unknown>;
    private ensureConnected;
    callTool(name: string, args: Record<string, unknown>, timeout?: number): Promise<unknown>;
    searchKnowledgeBase(query: string, options?: {
        limit?: number;
        filters?: KnowledgeSearchFilters;
    }): Promise<KnowledgeSearchResult[]>;
    createTask(title: string, description: string, options?: Record<string, unknown>): Promise<{}>;
    updateTaskStatus(taskId: string, status: string, notes?: string): Promise<unknown>;
    uploadDocument(content: string, filename: string, options?: {
        tags?: string[];
        metadata?: Record<string, unknown>;
    }): Promise<{
        documentId: string;
        url: string;
    }>;
    healthCheck(): Promise<boolean>;
    disconnect(): Promise<void>;
}
export declare function createAgentMCPClient(config: MCPIntegrationConfig): AgentMCPClient;
export {};
