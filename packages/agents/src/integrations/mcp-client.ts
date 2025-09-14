/**
 * MCP Client Integration for Agents Package
 *
 * Provides lightweight MCP client access to external tools and services,
 * specifically designed for Archon integration following the integration plan.
 */

import { EventEmitter } from 'events';
import type {
  Agent,
  AgentResult,
  ArchonIntegrationConfig,
  ExternalTool,
  KnowledgeSearchResult,
  MCPClientConfig,
  Task,
  TaskCreationResult,
  ToolParameter,
} from '../types/mcp';

interface MCPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface ArchonTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  project_id?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * MCP Client for Agent External Tool Access
 *
 * Enables agents to access external services through MCP protocol,
 * with specific integration for Archon's knowledge base and task management.
 */
export class AgentMCPClient extends EventEmitter {
  private readonly config: MCPClientConfig;
  private isConnected = false;
  private readonly maxRetries = 3;

  constructor(config: MCPClientConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize MCP connection and capabilities
   */
  async initialize(): Promise<void> {
    try {
      const response = await this.callPython('mcp_initialize', {
        base_url: this.config.baseUrl,
        api_key: this.config.apiKey,
        timeout: this.config.timeout || 30000,
        max_retries: this.config.maxRetries || 3,
      });

      if (response.success) {
        this.isConnected = true;
        this.emit('connected', { capabilities: response.data });
        console.warn('[MCP Client] Connected to Archon MCP server');
      } else {
        throw new Error(response.error || 'MCP initialization failed');
      }
    } catch (error) {
      console.error('[MCP Client] Failed to initialize:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get available external tools from MCP server
   */
  async getAvailableTools(): Promise<ExternalTool[]> {
    this.ensureConnected();

    try {
      const response = await this.callPython('mcp_list_tools', {});

      if (response.success) {
        return (response.data as Array<Record<string, unknown>>).map(
          (tool) => ({
            id: (tool.name as string) || 'unknown',
            name: (tool.name as string) || 'Unknown Tool',
            description: (tool.description as string) || 'No description',
            parameters:
              ((tool.inputSchema as Record<string, unknown>)
                ?.properties as Record<string, ToolParameter>) || {},
            capabilities: (tool.capabilities as string[]) || [],
            provider: 'archon',
          }),
        );
      } else {
        throw new Error(response.error || 'Failed to list tools');
      }
    } catch (error) {
      console.error('[MCP Client] Failed to get available tools:', error);
      throw error;
    }
  }

  /**
   * Call an external tool via MCP
   */
  async callTool(
    toolName: string,
    arguments_: Record<string, unknown>,
    timeout?: number,
  ): Promise<unknown> {
    this.ensureConnected();

    try {
      const response = await this.callPython('mcp_call_tool', {
        name: toolName,
        arguments: arguments_,
        timeout,
      });

      if (response.success) {
        this.emit('tool_called', {
          toolName,
          arguments: arguments_,
          result: response.data,
        });
        return response.data;
      } else {
        throw new Error(response.error || `Tool call failed: ${toolName}`);
      }
    } catch (error) {
      console.error(`[MCP Client] Failed to call tool ${toolName}:`, error);
      this.emit('tool_error', {
        toolName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Search Archon's knowledge base for relevant information
   */
  async searchKnowledgeBase(
    query: string,
    options: {
      limit?: number;
      filters?: Record<string, unknown>;
      threshold?: number;
    } = {},
  ): Promise<KnowledgeSearchResult[]> {
    try {
      const response = await this.callPython('mcp_search_knowledge_base', {
        query,
        limit: options.limit || 10,
        filters: options.filters,
      });

      if (response.success) {
        const results = (response.data as Array<Record<string, unknown>>).map(
          (item) => ({
            id: (item.id as string) || 'unknown',
            title:
              (item.title as string) || (item.filename as string) || 'Untitled',
            content: (item.content as string) || (item.text as string) || '',
            score: (item.score as number) || (item.similarity as number) || 0,
            source: (item.source as string) || 'unknown',
            metadata: (item.metadata as Record<string, unknown>) || {},
            timestamp:
              (item.created_at as string) ||
              (item.timestamp as string) ||
              new Date().toISOString(),
          }),
        );

        this.emit('knowledge_searched', { query, resultCount: results.length });
        return results;
      } else {
        throw new Error(response.error || 'Knowledge base search failed');
      }
    } catch (error) {
      console.error('[MCP Client] Knowledge base search failed:', error);
      throw error;
    }
  }

  /**
   * Create a new task in Archon
   */
  async createTask(
    title: string,
    description: string,
    options: {
      projectId?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      tags?: string[];
    } = {},
  ): Promise<TaskCreationResult> {
    try {
      const response = await this.callPython('mcp_create_task', {
        title,
        description,
        project_id: options.projectId,
        priority: options.priority || 'medium',
        tags: options.tags,
      });

      if (response.success) {
        const task = response.data as ArchonTask;
        const result: TaskCreationResult = {
          taskId: task.id,
          title: task.title,
          status: task.status,
          createdAt: task.created_at,
          url: this.getTaskUrl(task.id),
        };

        this.emit('task_created', result);
        return result;
      } else {
        throw new Error(response.error || 'Task creation failed');
      }
    } catch (error) {
      console.error('[MCP Client] Task creation failed:', error);
      throw error;
    }
  }

  /**
   * Update task status in Archon
   */
  async updateTaskStatus(
    taskId: string,
    status: string,
    notes?: string,
  ): Promise<void> {
    try {
      const response = await this.callPython('mcp_update_task_status', {
        task_id: taskId,
        status,
        notes,
      });

      if (response.success) {
        this.emit('task_updated', { taskId, status, notes });
      } else {
        throw new Error(response.error || 'Task update failed');
      }
    } catch (error) {
      console.error(`[MCP Client] Task update failed for ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Upload document to Archon's knowledge base
   */
  async uploadDocument(
    content: string,
    filename: string,
    options: {
      contentType?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<{ documentId: string; url: string }> {
    try {
      const response = await this.callPython('mcp_upload_document', {
        content,
        filename,
        content_type: options.contentType,
        tags: options.tags,
        metadata: options.metadata,
      });

      if (response.success) {
        const data = response.data as Record<string, unknown>;
        const documentId =
          (data.id as string) || (data.document_id as string) || 'unknown';
        const result = {
          documentId,
          url: this.getDocumentUrl(documentId),
        };

        this.emit('document_uploaded', result);
        return result;
      } else {
        throw new Error(response.error || 'Document upload failed');
      }
    } catch (error) {
      console.error('[MCP Client] Document upload failed:', error);
      throw error;
    }
  }

  /**
   * Check if MCP server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.callPython('mcp_health_check', {});
      return response.success;
    } catch (error) {
      console.error('[MCP Client] Health check failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.callPython('mcp_close', {});
        this.isConnected = false;
        this.emit('disconnected');
        console.warn('[MCP Client] Disconnected from Archon MCP server');
      }
    } catch (error) {
      console.error('[MCP Client] Error during disconnect:', error);
    }
  }

  /**
   * Call Python MCP client via subprocess or IPC bridge
   */
  private async callPython(
    method: string,
    params: Record<string, unknown>,
  ): Promise<MCPResponse> {
    const url = this.buildEndpoint();
    const payload = this.buildRequestPayload(method, params);
    return this.performWithRetry(url, payload);
  }

  private buildEndpoint(): string {
    const endpoint = this.config.baseUrl || 'http://localhost:8051';
    return `${endpoint.replace(/\/$/, '')}/`;
  }

  private buildRequestPayload(method: string, params: Record<string, unknown>) {
    return {
      jsonrpc: '2.0' as const,
      id: Date.now(),
      method,
      params,
    };
  }

  private async executeRequest(
    url: string,
    payload: ReturnType<typeof this.buildRequestPayload>,
  ): Promise<MCPResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeout || 30000,
    );
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      if (
        data &&
        typeof data === 'object' &&
        'error' in data &&
        data.error &&
        typeof (data as { error: unknown }).error === 'object'
      ) {
        const errObj = (data as { error: { message?: string } }).error;
        return {
          success: false,
          error: errObj.message || 'MCP error',
          timestamp: new Date().toISOString(),
        };
      }
      const resultData =
        data && typeof data === 'object' && 'result' in data
          ? (data as { result: unknown }).result
          : undefined;
      return {
        success: true,
        data: resultData,
        timestamp: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async performWithRetry(
    url: string,
    payload: ReturnType<typeof this.buildRequestPayload>,
  ): Promise<MCPResponse> {
    const maxRetries = this.config.maxRetries ?? this.maxRetries;
    let attempt = 0;
    let lastErr: unknown;
    while (attempt <= maxRetries) {
      try {
        return await this.executeRequest(url, payload);
      } catch (err) {
        lastErr = err;
        attempt += 1;
        if (attempt > maxRetries) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
          };
        }
        await new Promise((r) => setTimeout(r, 150 * attempt));
      }
    }
    return {
      success: false,
      error: lastErr instanceof Error ? lastErr.message : 'Unknown MCP error',
      timestamp: new Date().toISOString(),
    };
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('MCP client is not connected. Call initialize() first.');
    }
  }

  private getTaskUrl(taskId: string): string {
    const baseUrl = this.config.archonWebUrl || 'http://localhost:3737';
    return `${baseUrl}/projects/tasks/${taskId}`;
  }

  private getDocumentUrl(documentId: string): string {
    const baseUrl = this.config.archonWebUrl || 'http://localhost:3737';
    return `${baseUrl}/knowledge/${documentId}`;
  }
}

/**
 * Create configured MCP client for agent usage
 */
export function createAgentMCPClient(
  config: ArchonIntegrationConfig,
): AgentMCPClient {
  const clientConfig: MCPClientConfig = {
    baseUrl: config.mcpServerUrl || 'http://localhost:8051',
    apiKey: config.apiKey,
    timeout: config.timeout || 30000,
    maxRetries: config.maxRetries || 3,
    archonWebUrl: config.webUrl || 'http://localhost:3737',
  };

  return new AgentMCPClient(clientConfig);
}

/**
 * Agent extension that provides MCP capabilities
 */
export class MCPCapableAgent implements Agent {
  public readonly id: string;
  public readonly name: string;
  public readonly capabilities: string[];
  private readonly mcpClient: AgentMCPClient;

  constructor(
    id: string,
    name: string,
    capabilities: string[],
    mcpConfig: ArchonIntegrationConfig,
  ) {
    this.id = id;
    this.name = name;
    this.capabilities = [
      ...capabilities,
      'mcp-tools',
      'external-search',
      'task-management',
    ];
    this.mcpClient = createAgentMCPClient(mcpConfig);
  }

  async initialize(): Promise<void> {
    await this.mcpClient.initialize();
  }

  async execute(task: Task): Promise<AgentResult> {
    try {
      // Enhanced execution with MCP capabilities
      const startTime = Date.now();

      // If task requires external knowledge, search knowledge base
      if (task.requiresKnowledge || this.shouldSearchKnowledgeBase(task)) {
        const searchQuery = this.extractSearchQuery(task);
        const knowledgeResults = await this.mcpClient.searchKnowledgeBase(
          searchQuery,
          {
            limit: 5,
          },
        );

        task.context = {
          ...task.context,
          knowledgeBase: knowledgeResults,
        };
      }

      // Execute the main task logic
      const result = await this.executeTask(task);

      // If task generates deliverables, optionally upload to knowledge base
      if (result.artifacts && result.artifacts.length > 0) {
        for (const artifact of result.artifacts) {
          if (artifact.shouldUpload) {
            await this.mcpClient.uploadDocument(
              artifact.content,
              artifact.filename,
              {
                tags: ['agent-generated', task.type],
                metadata: {
                  agentId: this.id,
                  taskId: task.id,
                  timestamp: new Date().toISOString(),
                },
              },
            );
          }
        }
      }

      // Create follow-up task if needed
      if (result.followUpTask) {
        await this.mcpClient.createTask(
          result.followUpTask.title,
          result.followUpTask.description,
          {
            priority: result.followUpTask.priority || 'medium',
            tags: ['agent-generated', `from-${this.id}`],
          },
        );
      }

      return {
        ...result,
        executionTime: Date.now() - startTime,
        mcpEnhanced: true,
      };
    } catch (error) {
      console.error(`[Agent ${this.id}] MCP-enhanced execution failed:`, error);
      throw error;
    }
  }

  /**
   * Override this method to implement specific agent logic
   */
  protected async executeTask(task: Task): Promise<AgentResult> {
    // Default implementation - agents should override this
    return {
      success: true,
      result: `Task ${task.id} completed by ${this.name}`,
      timestamp: new Date().toISOString(),
    };
  }

  private shouldSearchKnowledgeBase(task: Task): boolean {
    const knowledgeKeywords = [
      'research',
      'analyze',
      'understand',
      'explain',
      'documentation',
    ];
    const taskText =
      `${task.description} ${task.requirements?.join(' ') || ''}`.toLowerCase();
    return knowledgeKeywords.some((keyword) => taskText.includes(keyword));
  }

  private extractSearchQuery(task: Task): string {
    // Simple extraction - can be made more sophisticated
    return task.description.length > 100
      ? task.description.substring(0, 100)
      : task.description;
  }

  async cleanup(): Promise<void> {
    await this.mcpClient.disconnect();
  }
}
