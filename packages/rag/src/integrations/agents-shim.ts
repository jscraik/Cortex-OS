// Local shim for agent MCP client to avoid hard dependency during typecheck in other projects

// Vendor-neutral MCP integration config shape
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

export interface AgentMCPClient {
  initialize(): Promise<unknown>;
  callTool(name: string, args: Record<string, unknown>, timeout?: number): Promise<unknown>;
  searchKnowledgeBase(
    query: string,
    options?: { limit?: number; filters?: KnowledgeSearchFilters }
  ): Promise<KnowledgeSearchResult[]>;
  createTask(title: string, description: string, options?: Record<string, unknown>): Promise<unknown>;
  updateTaskStatus(taskId: string, status: string, notes?: string): Promise<unknown>;
  uploadDocument(
    content: string,
    filename: string,
    options?: { tags?: string[]; metadata?: Record<string, unknown> }
  ): Promise<{ documentId: string; url: string }>;
  healthCheck(): Promise<boolean>;
  disconnect(): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createAgentMCPClient(_config: MCPIntegrationConfig): AgentMCPClient {
  const notAvail = (method: string) =>
    Promise.reject(new Error(`Agents MCP client not available in this build (method: ${method})`));
  return {
    async initialize() {
      return undefined;
    },
    async callTool() {
      return notAvail('callTool');
    },
    async searchKnowledgeBase() {
      return [];
    },
    async createTask() {
      return notAvail('createTask');
    },
    async updateTaskStatus() {
      return notAvail('updateTaskStatus');
    },
    async uploadDocument() {
      return notAvail('uploadDocument');
    },
    async healthCheck() {
      return false;
    },
    async disconnect() {
      return undefined;
    },
  } as AgentMCPClient;
}
