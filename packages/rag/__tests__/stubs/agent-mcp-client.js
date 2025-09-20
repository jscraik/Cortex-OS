// Locally define MCPIntegrationConfig to avoid tight coupling with agents package
export const mockCallLog = [];
export const mockConfigLog = [];
const responseQueue = [];
export function resetMockAgentState() {
    mockCallLog.length = 0;
    mockConfigLog.length = 0;
    responseQueue.length = 0;
}
export function enqueueMockResponse(method, value) {
    responseQueue.push({ method, value });
}
export function enqueueMockError(method, message) {
    responseQueue.push({
        method,
        error: message instanceof Error ? message : new Error(message),
    });
}
function takeResponse(method) {
    const entry = responseQueue.shift();
    if (!entry) {
        return defaultResponse(method);
    }
    if (entry.method !== method) {
        throw new Error(`Expected response for ${method} but received ${entry.method}`);
    }
    return entry;
}
function defaultResponse(method) {
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
    config;
    connected = false;
    constructor(config) {
        this.config = config;
        mockConfigLog.push(config);
    }
    async initialize() {
        const response = takeResponse('mcp_initialize');
        mockCallLog.push({
            method: 'mcp_initialize',
            params: { config: this.config },
        });
        if (response.error)
            throw response.error;
        this.connected = true;
        return response.value;
    }
    ensureConnected() {
        if (!this.connected) {
            throw new Error('MCP client is not connected. Call initialize() first.');
        }
    }
    async callTool(name, args, timeout) {
        this.ensureConnected();
        mockCallLog.push({
            method: 'mcp_call_tool',
            params: { name, arguments: args, timeout },
        });
        const response = takeResponse('mcp_call_tool');
        if (response.error)
            throw response.error;
        return response.value;
    }
    async searchKnowledgeBase(query, options = {}) {
        this.ensureConnected();
        mockCallLog.push({
            method: 'mcp_search_knowledge_base',
            params: { query, options },
        });
        const response = takeResponse('mcp_search_knowledge_base');
        if (response.error)
            throw response.error;
        return response.value ?? [];
    }
    async createTask(title, description, options = {}) {
        this.ensureConnected();
        mockCallLog.push({
            method: 'mcp_create_task',
            params: { title, description, options },
        });
        const response = takeResponse('mcp_create_task');
        if (response.error)
            throw response.error;
        return response.value ?? {};
    }
    async updateTaskStatus(taskId, status, notes) {
        this.ensureConnected();
        mockCallLog.push({
            method: 'mcp_update_task_status',
            params: { taskId, status, notes },
        });
        const response = takeResponse('mcp_update_task_status');
        if (response.error)
            throw response.error;
        return response.value;
    }
    async uploadDocument(content, filename, options = {}) {
        this.ensureConnected();
        mockCallLog.push({
            method: 'mcp_upload_document',
            params: { content, filename, options },
        });
        const response = takeResponse('mcp_upload_document');
        if (response.error)
            throw response.error;
        const payload = response.value ?? {};
        const documentId = payload.documentId ?? payload.id ?? 'doc-mock';
        const url = payload.url ?? `mock://${documentId}`;
        return { documentId, url };
    }
    async healthCheck() {
        mockCallLog.push({ method: 'mcp_health_check', params: {} });
        const response = takeResponse('mcp_health_check');
        if (response.error)
            return false;
        return Boolean(response.value ?? true);
    }
    async disconnect() {
        mockCallLog.push({ method: 'mcp_close', params: {} });
        const response = takeResponse('mcp_close');
        if (response?.error)
            throw response.error;
        this.connected = false;
    }
}
export function createAgentMCPClient(config) {
    return new AgentMCPClient(config);
}
