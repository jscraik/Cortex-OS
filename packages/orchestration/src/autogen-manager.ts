/**
 * @file_path packages/orchestration/src/autogen-manager.ts
 * @description AutoGen integration for conversational AI agents with dynamic interaction and adaptive flows
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-03
 * @version 1.0.0
 * @status active
 * @ai_generated_by claude-3.5-sonnet
 * @ai_provenance_hash phase2_autogen_integration
 */

import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import path from 'path';
import { v4 as uuid } from 'uuid';
import winston from 'winston';
import { z } from 'zod';
import {
  PythonAgentBridge,
  AgentTaskPayload,
  AgentTaskResult,
} from './bridges/python-agent-bridge.js';
// Removed unused type imports to satisfy no-unused-vars lint rule

// AutoGen specific schemas
const AutoGenAgentSchema = z.object({
  name: z.string(),
  systemMessage: z.string(),
  description: z.string().optional(),
  maxConsecutiveAutoReply: z.number().default(10),
  humanInputMode: z.enum(['ALWAYS', 'NEVER', 'TERMINATE']).default('NEVER'),
  codeExecutionConfig: z.union([z.boolean(), z.object({})]).default(false),
  conversationConfig: z
    .object({
      adaptiveFlows: z.boolean().default(true),
      taskComplexityThreshold: z.number().default(0.7),
      maxRoundTrip: z.number().default(20),
    })
    .optional(),
  toolIntegration: z
    .object({
      externalTools: z.boolean().default(true),
      serviceIntegration: z.boolean().default(true),
    })
    .optional(),
  roleAssignment: z
    .object({
      dynamic: z.boolean().default(true),
      capabilityMatching: z.boolean().default(true),
    })
    .optional(),
});

const AutoGenConversationSchema = z.object({
  participants: z.array(z.string()),
  maxRounds: z.number().default(50),
  adminName: z.string().optional(),
  speakerSelectionMethod: z.enum(['auto', 'manual', 'round_robin', 'random']).default('auto'),
  allowRepeatSpeaker: z.boolean().default(true),
  messages: z
    .array(
      z.object({
        content: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        name: z.string().optional(),
      }),
    )
    .default([]),
});

const AutoGenGroupChatSchema = z.object({
  agents: z.array(AutoGenAgentSchema),
  messages: z
    .array(
      z.object({
        content: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        name: z.string().optional(),
      }),
    )
    .default([]),
  maxRound: z.number().default(50),
  adminName: z.string().optional(),
  speakerSelectionMethod: z.enum(['auto', 'manual', 'round_robin', 'random']).default('auto'),
  allowRepeatSpeaker: z.boolean().default(true),
  enableClearHistory: z.boolean().default(true),
});

export type AutoGenAgent = z.infer<typeof AutoGenAgentSchema>;
export type AutoGenConversation = z.infer<typeof AutoGenConversationSchema>;
export type AutoGenGroupChat = z.infer<typeof AutoGenGroupChatSchema>;

export interface AutoGenConfig {
  pythonPath?: string;
  autogenScriptPath?: string;
  timeout?: number;
  maxRetries?: number;
  enableLogging?: boolean;
  logLevel?: string;
  conversationMemory?: boolean;
}

export interface AutoGenTaskRequest {
  taskId: string;
  agents: AutoGenAgent[];
  initialMessage: string;
  conversationConfig?: Partial<AutoGenConversation>;
  context?: Record<string, unknown>;
  adaptiveFlow?: boolean;
}

export interface AutoGenTaskResult {
  taskId: string;
  success: boolean;
  conversationHistory: Array<{
    content: string;
    role: string;
    name?: string;
    timestamp: string;
  }>;
  finalResult: Record<string, unknown>;
  agentMetrics: Record<
    string,
    {
      messagesCount: number;
      tokensUsed: number;
      executionTime: number;
    }
  >;
  executionTime: number;
  errors: string[];
}

/**
 * AutoGen Manager for conversational AI agents with dynamic interaction
 * Provides adaptive conversation flows and intelligent task distribution
 */
export class AutoGenManager extends EventEmitter {
  private logger: winston.Logger;
  private config: AutoGenConfig;
  private pythonBridge: PythonAgentBridge;
  private activeConversations: Map<string, ChildProcess>;
  private conversationHistory: Map<
    string,
    Array<{ content: string; role: string; name?: string; timestamp: string }>
  >;
  private agentCapabilities: Map<string, string[]>;

  constructor(config: Partial<AutoGenConfig> = {}) {
    super();

    this.config = {
      pythonPath: 'python3',
      autogenScriptPath:
        process.env.AUTOGEN_SCRIPT_PATH ||
        path.join(__dirname, '../../../scripts/autogen-bridge.py'),
      timeout: 300000, // 5 minutes
      maxRetries: 3,
      enableLogging: true,
      logLevel: 'info',
      conversationMemory: true,
      ...config,
    };

    this.setupLogger();
    this.initializeDataStructures();
    this.initializePythonBridge();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: this.config.logLevel,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      defaultMeta: { service: 'autogen-manager' },
      transports: [new winston.transports.Console()],
    });
  }

  private initializeDataStructures(): void {
    this.activeConversations = new Map();
    this.conversationHistory = new Map();
    this.agentCapabilities = new Map();
  }

  private initializePythonBridge(): void {
    this.pythonBridge = new PythonAgentBridge({
      pythonPath: this.config.pythonPath,
      bridgeScriptPath: this.config.autogenScriptPath,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });

    this.pythonBridge.on('result', (result: AgentTaskResult) => {
      this.handleConversationResult(result);
    });

    this.pythonBridge.on('error', (error: string) => {
      this.logger.error('AutoGen Python bridge error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Start a conversational AI task with dynamic agent interaction
   */
  async startConversation(request: AutoGenTaskRequest): Promise<string> {
    try {
      this.logger.info('Starting AutoGen conversation', {
        taskId: request.taskId,
      });

      // Validate agents
      request.agents.forEach((agent) => AutoGenAgentSchema.parse(agent));

      // Determine conversation complexity and adapt flow
      const taskComplexity = this.analyzeTaskComplexity(request.initialMessage, request.context);
      const adaptedConfig = this.adaptConversationFlow(taskComplexity, request.conversationConfig);

      // Create the conversation via Python bridge
      const taskPayload: AgentTaskPayload = {
        coordinationId: request.taskId,
        phaseId: uuid(),
        phaseName: 'conversation-start',
        requirements: ['start-conversation'],
        metadata: {
          agents: request.agents,
          initialMessage: request.initialMessage,
          conversationConfig: adaptedConfig,
          context: request.context,
          adaptiveFlow: request.adaptiveFlow || true,
        },
        agentType: 'autogen',
      };

      await this.pythonBridge.executeAgentTask(taskPayload);

      // Initialize conversation history
      if (this.config.conversationMemory) {
        this.conversationHistory.set(request.taskId, [
          {
            content: request.initialMessage,
            role: 'user',
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      this.emit('conversation-started', {
        taskId: request.taskId,
        agentCount: request.agents.length,
        taskComplexity,
        adaptedConfig,
      });

      return request.taskId;
    } catch (error) {
      this.logger.error('Failed to start AutoGen conversation:', error);
      throw new Error(`AutoGen conversation start failed: ${error.message}`);
    }
  }

  /**
   * Execute multi-agent role assignment and task distribution
   */
  async distributeTask(
    taskId: string,
    taskDescription: string,
    requiredCapabilities: string[],
  ): Promise<Record<string, string[]>> {
    try {
      this.logger.info('Distributing task among AutoGen agents', {
        taskId,
        requiredCapabilities,
      });

      const taskPayload: AgentTaskPayload = {
        coordinationId: taskId,
        phaseId: uuid(),
        phaseName: 'task-distribution',
        requirements: ['distribute-task'],
        metadata: {
          taskDescription,
          requiredCapabilities,
          dynamicRoleAssignment: true,
          capabilityMatching: true,
        },
        agentType: 'autogen',
      };

      const result = await this.pythonBridge.executeAgentTask(taskPayload);

      const taskDistribution = result.data.taskDistribution || {};

      this.emit('task-distributed', {
        taskId,
        distribution: taskDistribution,
        agentAssignments: result.data.agentAssignments,
      });

      return taskDistribution;
    } catch (error) {
      this.logger.error('AutoGen task distribution failed:', error);
      throw new Error(`Task distribution failed: ${error.message}`);
    }
  }

  /**
   * Continue a conversation with adaptive flow based on context
   */
  async continueConversation(
    taskId: string,
    message: string,
    speakerName?: string,
  ): Promise<AutoGenTaskResult> {
    try {
      this.logger.info('Continuing AutoGen conversation', {
        taskId,
        speakerName,
      });

      // Update conversation history
      if (this.config.conversationMemory && this.conversationHistory.has(taskId)) {
        this.conversationHistory.get(taskId)!.push({
          content: message,
          role: 'user',
          name: speakerName,
          timestamp: new Date().toISOString(),
        });
      }

      const taskPayload: AgentTaskPayload = {
        coordinationId: taskId,
        phaseId: uuid(),
        phaseName: 'conversation-continue',
        requirements: ['continue-conversation'],
        metadata: {
          message,
          speakerName,
          conversationHistory: this.conversationHistory.get(taskId) || [],
        },
        agentType: 'autogen',
      };

      const result = await this.pythonBridge.executeAgentTask(taskPayload);

      const taskResult: AutoGenTaskResult = {
        taskId,
        success: result.success,
        conversationHistory: result.data.conversationHistory || [],
        finalResult: result.data.finalResult || {},
        agentMetrics: result.data.agentMetrics || {},
        executionTime: result.duration_ms,
        errors: result.errors,
      };

      // Update conversation history with new messages
      if (this.config.conversationMemory && result.data.conversationHistory) {
        this.conversationHistory.set(taskId, result.data.conversationHistory);
      }

      this.emit('conversation-updated', taskResult);
      return taskResult;
    } catch (error) {
      this.logger.error('AutoGen conversation continuation failed:', error);
      throw new Error(`Conversation continuation failed: ${error.message}`);
    }
  }

  /**
   * Create a group chat with multiple agents for complex collaboration
   */
  async createGroupChat(groupChatConfig: AutoGenGroupChat): Promise<string> {
    try {
      const groupChatId = uuid();
      this.logger.info('Creating AutoGen group chat', {
        groupChatId,
        agentCount: groupChatConfig.agents.length,
      });

      // Validate group chat configuration
      AutoGenGroupChatSchema.parse(groupChatConfig);

      const taskPayload: AgentTaskPayload = {
        coordinationId: groupChatId,
        phaseId: uuid(),
        phaseName: 'group-chat-creation',
        requirements: ['create-group-chat'],
        metadata: {
          groupChatConfig,
          enableAdaptiveFlow: true,
        },
        agentType: 'autogen',
      };

      await this.pythonBridge.executeAgentTask(taskPayload);

      this.emit('group-chat-created', {
        groupChatId,
        agentCount: groupChatConfig.agents.length,
        config: groupChatConfig,
      });

      return groupChatId;
    } catch (error) {
      this.logger.error('Failed to create AutoGen group chat:', error);
      throw new Error(`Group chat creation failed: ${error.message}`);
    }
  }

  /**
   * Integrate external tools and services with AutoGen agents
   */
  async integrateExternalTool(
    taskId: string,
    toolName: string,
    toolConfig: Record<string, unknown>,
  ): Promise<void> {
    this.logger.info('Integrating external tool with AutoGen agents', {
      taskId,
      toolName,
    });

    const taskPayload: AgentTaskPayload = {
      coordinationId: taskId,
      phaseId: uuid(),
      phaseName: 'tool-integration',
      requirements: ['integrate-external-tool'],
      metadata: {
        toolName,
        toolConfig,
        enableServiceIntegration: true,
      },
      agentType: 'autogen',
    };

    await this.pythonBridge.executeAgentTask(taskPayload);

    this.emit('tool-integrated', { taskId, toolName, toolConfig });
  }

  /**
   * Analyze task complexity to adapt conversation flow
   */
  private analyzeTaskComplexity(message: string, context?: Record<string, unknown>): number {
    let complexity = 0.1; // Base complexity

    // Analyze message characteristics
    const wordCount = message.split(' ').length;
    const hasCodeBlocks = /```/.test(message);
    const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
    const hasComplexTerms =
      /\b(architecture|design|implementation|integration|optimization)\b/i.test(message);

    // Calculate complexity based on various factors
    complexity += Math.min(wordCount / 100, 0.3); // Up to 0.3 for word count
    complexity += hasCodeBlocks ? 0.2 : 0;
    complexity += hasMultipleQuestions ? 0.15 : 0;
    complexity += hasComplexTerms ? 0.2 : 0;

    // Factor in context complexity
    if (context) {
      const contextKeys = Object.keys(context).length;
      complexity += Math.min(contextKeys / 20, 0.15); // Up to 0.15 for context
    }

    return Math.min(complexity, 1.0); // Cap at 1.0
  }

  /**
   * Adapt conversation flow based on task complexity
   */
  private adaptConversationFlow(
    complexity: number,
    baseConfig?: Partial<AutoGenConversation>,
  ): AutoGenConversation {
    const adaptedConfig: AutoGenConversation = {
      participants: [],
      maxRounds: complexity > 0.7 ? 100 : 50,
      speakerSelectionMethod: complexity > 0.5 ? 'auto' : 'round_robin',
      allowRepeatSpeaker: complexity > 0.6,
      messages: [],
      ...baseConfig,
    };

    // Validate shape at runtime to ensure compatibility
    AutoGenConversationSchema.parse(adaptedConfig);
    return adaptedConfig;
  }

  private handleConversationResult(result: AgentTaskResult): void {
    this.logger.info('AutoGen conversation result received', {
      taskId: result.agent_id,
      success: result.success,
      duration: result.duration_ms,
    });

    this.emit('result', result);
  }

  /**
   * Get conversation history for a specific task
   */
  getConversationHistory(taskId: string): Array<{
    content: string;
    role: string;
    name?: string;
    timestamp: string;
  }> {
    return this.conversationHistory.get(taskId) || [];
  }

  /**
   * Clean up resources and active conversations
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AutoGen manager');

    // Terminate active conversations
    for (const [taskId, process] of this.activeConversations) {
      this.logger.info('Terminating conversation process', { taskId });
      process.kill('SIGTERM');
    }

    this.activeConversations.clear();
    this.conversationHistory.clear();
    await this.pythonBridge.shutdown();

    this.emit('shutdown-complete');
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
