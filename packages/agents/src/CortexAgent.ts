import { VoltAgent, Tool, Memory } from '@voltagent/core';
import { createLogger } from '@voltagent/logger';

// Import tools
import { CortexHealthCheckTool } from './tools/CortexHealthCheckTool';
import { createA2ASendEventTool } from './tools/A2ASendEventTool';
import { createA2AReceiveEventTool } from './tools/A2AReceiveEventTool';
import { MCPListServersTool } from './tools/MCPListServersTool';
import { MCPCallToolTool } from './tools/MCPCallToolTool';
import { MCPServerInfoTool } from './tools/MCPServerInfoTool';
import { createMemoryStoreTool } from './tools/MemoryStoreTool';
import { createMemoryRetrieveTool } from './tools/MemoryRetrieveTool';
import { createMemorySearchTool } from './tools/MemorySearchTool';
import { createMemoryUpdateTool } from './tools/MemoryUpdateTool';
import { createMemoryDeleteTool } from './tools/MemoryDeleteTool';
import { PackageManagerTool } from './tools/PackageManagerTool';
import { FileOperationTool } from './tools/FileOperationTool';
import { createModelRouterTool } from './tools/ModelRouterTool';

// Import utilities
import { createModelRouter } from '../utils/modelRouter';
import { createA2ABridge } from '../utils/a2aBridge';

const logger = createLogger('CortexAgent');

export interface CortexAgentConfig {
  /**
   * Agent name
   */
  name?: string;
  /**
   * Agent instructions
   */
  instructions?: string;
  /**
   * Default model to use
   */
  model?: string;
  /**
   * Cortex-OS specific configuration
   */
  cortex?: {
    /**
     * Enable local MLX integration
     */
    enableMLX?: boolean;
    /**
     * Ollama base URL
     */
    ollamaBaseUrl?: string;
    /**
     * API providers configuration
     */
    apiProviders?: {
      openai?: {
        apiKey: string;
        baseURL?: string;
      };
      anthropic?: {
        apiKey: string;
        baseURL?: string;
      };
      google?: {
        apiKey: string;
        baseURL?: string;
      };
    };
    /**
     * Memory configuration
     */
    memory?: {
      maxWorkingMemory?: number;
      maxContextualMemory?: number;
      retentionDays?: number;
    };
  };
}

export class CortexAgent extends VoltAgent {
  private modelRouter: ReturnType<typeof createModelRouter>;
  private a2aBridge: ReturnType<typeof createA2ABridge>;
  private memory: Memory;
  private tools: Tool[] = [];

  constructor(config: CortexAgentConfig) {
    super({
      name: config.name || 'CortexAgent',
      instructions: config.instructions || `You are a Cortex-OS agent, part of an autonomous software behavior reasoning system.

Your capabilities include:
- Analyzing code and generating tests
- Creating and updating documentation
- Performing security analysis
- Orchestrating complex workflows
- Communicating with other agents via A2A
- Accessing MCP tools and services
- Managing contextual memory

Always:
1. Use appropriate tools for tasks
2. Maintain clear communication
3. Store important information in memory
4. Follow Cortex-OS architecture principles`,
      model: config.model || 'gpt-4',
    });

    // Initialize components
    this.memory = new Memory();
    this.modelRouter = createModelRouter(config.cortex);
    this.a2aBridge = createA2ABridge();

    // Initialize tools
    this.initializeTools();
  }

  private initializeTools(): void {
    this.tools = [
      // System tools
      CortexHealthCheckTool,
      PackageManagerTool,
      FileOperationTool,
      createModelRouterTool(this.modelRouter),

      // A2A communication tools
      createA2ASendEventTool(this.a2aBridge),
      createA2AReceiveEventTool(this.a2aBridge),

      // MCP integration tools
      MCPListServersTool,
      MCPCallToolTool,
      MCPServerInfoTool,

      // Memory management tools
      createMemoryStoreTool(this.memory),
      createMemoryRetrieveTool(this.memory),
      createMemorySearchTool(this.memory),
      createMemoryUpdateTool(this.memory),
      createMemoryDeleteTool(this.memory),
    ];

    // Add tools to agent using the toolkit approach
    const toolkit = {
      name: 'cortex-toolkit',
      description: 'Cortex-OS specific tools for agent operations',
      tools: this.tools,
    };
    this.addToolkit(toolkit);
  }

  /**
   * Execute the agent with improved model routing
   */
  async execute(input: string, options?: {
    stream?: boolean;
    modelOverride?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<any> {
    // Determine best model
    const model = options?.modelOverride ||
                 await this.modelRouter.selectModel(input, this.tools);

    logger.info(`Executing with model: ${model}`);

    return super.execute(input, {
      ...options,
      model,
    });
  }

  /**
   * Get agent status and health
   */
  async getStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    model: string;
    tools: string[];
    memoryStats?: {
      totalMemories: number;
      workingMemory: number;
      contextualMemory: number;
    };
  }> {
    const model = await this.modelRouter.getCurrentModel();

    return {
      status: 'healthy',
      model: model.name,
      tools: this.tools.map(t => t.name),
      // Memory stats would need to be implemented based on actual memory usage
    };
  }
}