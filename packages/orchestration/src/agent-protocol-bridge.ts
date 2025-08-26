/**
 * @file_path packages/orchestration/src/agent-protocol-bridge.ts
 * @description A2A protocol bridge for seamless communication between LangChain, CrewAI, and AutoGen agents
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-03
 * @version 1.0.0
 * @status active
 * @ai_generated_by claude-3.5-sonnet
 * @ai_provenance_hash phase2_a2a_bridge
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import winston from 'winston';
import { z } from 'zod';
import type { A2AMessage as ProtocolA2AMessage } from './protocols/a2a-protocol.js';
import { A2AProtocol } from './protocols/a2a-protocol.js';
import { MessageProtocol } from './types.js';

// A2A Protocol Message schemas
const A2AMessageSchema = z.object({
  id: z.string().uuid(),
  from: z.string(),
  to: z.string(),
  type: z.enum([
    'request',
    'response',
    'broadcast',
    'handoff',
    'capability-query',
    'status-update',
  ]),
  framework: z.enum(['langchain', 'crewai', 'autogen']),
  payload: z.record(z.any()),
  timestamp: z.date(),
  correlationId: z.string().optional(),
  priority: z.number().min(1).max(10).default(5),
  encrypted: z.boolean().default(false),
});

const AgentCapabilitySchema = z.object({
  agentId: z.string(),
  framework: z.enum(['langchain', 'crewai', 'autogen']),
  role: z.string(),
  capabilities: z.array(z.string()),
  tools: z.array(z.string()),
  availability: z.enum(['available', 'busy', 'offline']),
  maxConcurrentTasks: z.number().default(1),
  currentLoad: z.number().default(0),
});

const HandoffRequestSchema = z.object({
  fromAgentId: z.string(),
  toAgentId: z.string(),
  taskId: z.string(),
  taskDescription: z.string(),
  context: z.record(z.any()),
  requiredCapabilities: z.array(z.string()),
  priority: z.number().min(1).max(10).default(5),
  deadline: z.date().optional(),
});

export type A2AMessage = z.infer<typeof A2AMessageSchema>;
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;
export type HandoffRequest = z.infer<typeof HandoffRequestSchema>;

export interface AgentProtocolBridgeConfig {
  enableEncryption?: boolean;
  messageTimeout?: number;
  maxRetries?: number;
  enableLogging?: boolean;
  logLevel?: string;
  capabilityDiscoveryInterval?: number;
}

export interface CrossFrameworkTaskRequest {
  taskId: string;
  requesterFramework: 'langchain' | 'crewai' | 'autogen';
  targetFramework: 'langchain' | 'crewai' | 'autogen';
  taskDescription: string;
  requiredCapabilities: string[];
  context: Record<string, unknown>;
  priority: number;
}

export interface CrossFrameworkTaskResult {
  taskId: string;
  success: boolean;
  result: Record<string, unknown>;
  executingAgent: string;
  executingFramework: 'langchain' | 'crewai' | 'autogen';
  executionTime: number;
  errors: string[];
}

/**
 * Agent Protocol Bridge for A2A communication between different AI frameworks
 * Enables seamless coordination between LangChain, CrewAI, and AutoGen agents
 */
interface FrameworkBridge {
  on: (event: string, listener: (...args: unknown[]) => void) => void; // event interface
  handleMessage: (message: A2AMessage) => void;
}

export class AgentProtocolBridge extends EventEmitter {
  private logger!: winston.Logger;
  private config: AgentProtocolBridgeConfig;
  private a2aProtocol!: A2AProtocol;
  private registeredAgents!: Map<string, AgentCapability>;
  private messageQueue!: Map<string, A2AMessage[]>;
  private pendingRequests!: Map<string, Promise<unknown>>;
  private frameworkBridges!: Map<string, FrameworkBridge>; // Framework-specific bridges
  private capabilityDiscoveryTimer?: NodeJS.Timeout;
  constructor(config: Partial<AgentProtocolBridgeConfig> = {}) {
    super();

    this.config = {
      enableEncryption: true,
      messageTimeout: 30000, // 30 seconds
      maxRetries: 3,
      enableLogging: true,
      logLevel: 'info',
      capabilityDiscoveryInterval: 60000, // 1 minute
      ...config,
    };

    this.setupLogger();
    this.initializeDataStructures();
    this.initializeA2AProtocol();
    this.startCapabilityDiscovery();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: this.config.logLevel,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      defaultMeta: { service: 'agent-protocol-bridge' },
      transports: [new winston.transports.Console()],
    });
  }

  private initializeDataStructures(): void {
    this.registeredAgents = new Map();
    this.messageQueue = new Map();
    this.pendingRequests = new Map();
    this.frameworkBridges = new Map();
  }

  private initializeA2AProtocol(): void {
    this.a2aProtocol = new A2AProtocol({
      encryption: this.config.enableEncryption,
      timeout: this.config.messageTimeout,
    });

    // Harmonize with A2AProtocol event names
    // A2AProtocol emits 'messageDelivered' and 'messageReceived'
    this.a2aProtocol.on('messageDelivered', (message: ProtocolA2AMessage) => {
      this.handleIncomingMessage(this.mapFromProtocolMessage(message));
    });
    this.a2aProtocol.on('messageReceived', (message: ProtocolA2AMessage) => {
      this.handleIncomingMessage(this.mapFromProtocolMessage(message));
    });

    // Connection lifecycle events from A2AProtocol are 'connectionEstablished' and 'connectionClosed'
    this.a2aProtocol.on('connectionEstablished', (connection: MessageProtocol) => {
      const agentId = connection.toAgent;
      this.logger.info('Agent connected to A2A protocol', { agentId });
      this.emit('agent-connected', agentId);
    });

    this.a2aProtocol.on('connectionClosed', ({ agentId }: { agentId: string }) => {
      this.logger.info('Agent disconnected from A2A protocol', { agentId });
      this.handleAgentDisconnection(agentId);
    });
  }

  /**
   * Register an agent with the A2A protocol bridge
   */
  async registerAgent(capability: AgentCapability): Promise<void> {
    try {
      AgentCapabilitySchema.parse(capability);

      this.registeredAgents.set(capability.agentId, capability);
      // Establish a logical connection in the underlying protocol so messages can be routed/queued.
      // A2AProtocol doesn't expose registerAgent(); we connect to the agentId instead.
      await this.a2aProtocol.connect(capability.agentId);

      this.logger.info('Agent registered with A2A protocol', {
        agentId: capability.agentId,
        framework: capability.framework,
        role: capability.role,
      });

      this.emit('agent-registered', capability);
    } catch (error) {
      this.logger.error('Failed to register agent:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Agent registration failed: ${msg}`);
    }
  }

  private mapPriorityToProtocol(priority?: number): ProtocolA2AMessage['priority'] {
    const p = priority ?? 5;
    if (p >= 9) return 'urgent';
    if (p >= 7) return 'high';
    if (p <= 3) return 'low';
    return 'normal';
  }

  private mapTypeToProtocol(type: A2AMessage['type']): ProtocolA2AMessage['type'] {
    switch (type) {
      case 'request':
      case 'handoff':
        return 'task-assignment';
      case 'response':
        return 'result';
      case 'status-update':
      case 'capability-query':
        return 'status-update';
      case 'broadcast':
        // Will be handled via broadcast(), placeholder
        return 'status-update';
      default:
        return 'status-update';
    }
  }

  private mapFromProtocolMessage(msg: ProtocolA2AMessage): A2AMessage {
    return {
      id: msg.id,
      from: msg.from,
      to: msg.to,
      type:
        msg.type === 'task-assignment'
          ? 'request'
          : msg.type === 'result'
            ? 'response'
            : msg.type === 'heartbeat'
              ? 'status-update'
              : 'status-update',
      framework: 'langchain', // default route; framework bridge will handle
      payload: msg.payload ?? {},
      timestamp: msg.timestamp,
      priority:
        msg.priority === 'urgent'
          ? 10
          : msg.priority === 'high'
            ? 8
            : msg.priority === 'low'
              ? 2
              : 5,
      encrypted: Boolean(msg.encryption),
    } as A2AMessage;
  }

  /**
   * Register a framework-specific bridge (LangChain, CrewAI, AutoGen)
   */
  registerFrameworkBridge(framework: string, bridge: FrameworkBridge): void {
    this.frameworkBridges.set(framework, bridge);
    this.logger.info('Framework bridge registered', { framework });

    // Set up event listeners for the framework bridge
    bridge.on('task-completed', (result: unknown) => {
      this.handleFrameworkTaskCompletion(framework, result as Record<string, unknown>);
    });

    bridge.on('capability-updated', (...args: unknown[]) => {
      const [agentId, capabilities] = args as [string, string[]];
      this.updateAgentCapabilities(agentId, capabilities);
    });
  }

  /**
   * Send a message between agents across different frameworks
   */
  async sendMessage(message: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<void> {
    try {
      const fullMessage: A2AMessage = {
        ...message,
        id: uuid(),
        timestamp: new Date(),
        priority: message.priority ?? 5,
        encrypted: message.encrypted ?? false,
      };

      A2AMessageSchema.parse(fullMessage);

      if (fullMessage.to === 'broadcast' || fullMessage.type === 'broadcast') {
        await this.a2aProtocol.broadcast({
          type: this.mapTypeToProtocol(fullMessage.type),
          payload: fullMessage.payload,
          priority: this.mapPriorityToProtocol(fullMessage.priority),
        });
      } else {
        await this.a2aProtocol.sendMessage({
          to: fullMessage.to,
          type: this.mapTypeToProtocol(fullMessage.type),
          payload: fullMessage.payload,
          priority: this.mapPriorityToProtocol(fullMessage.priority),
        });
      }

      this.logger.info('A2A message sent', {
        messageId: fullMessage.id,
        from: fullMessage.from,
        to: fullMessage.to,
        type: fullMessage.type,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to send A2A message:', { error: msg });
      throw new Error(`Message sending failed: ${msg}`);
    }
  }

  /**
   * Execute a cross-framework task coordination
   */
  async executeCrossFrameworkTask(
    request: CrossFrameworkTaskRequest,
  ): Promise<CrossFrameworkTaskResult> {
    try {
      this.logger.info('Executing cross-framework task', {
        taskId: request.taskId,
        from: request.requesterFramework,
        to: request.targetFramework,
      });

      // Find suitable agents in the target framework
      const suitableAgents = this.findSuitableAgents(
        request.targetFramework,
        request.requiredCapabilities,
      );

      if (suitableAgents.length === 0) {
        throw new Error(`No suitable agents found in ${request.targetFramework} framework`);
      }

      // Select the best agent based on availability and load
      const selectedAgent = this.selectBestAgent(suitableAgents);

      // Create task coordination message
      const taskMessage: A2AMessage = {
        id: uuid(),
        from: 'protocol-bridge',
        to: selectedAgent.agentId,
        type: 'request',
        framework: request.targetFramework,
        payload: {
          taskId: request.taskId,
          taskDescription: request.taskDescription,
          requiredCapabilities: request.requiredCapabilities,
          context: request.context,
          priority: request.priority,
        },
        timestamp: new Date(),
        correlationId: request.taskId,
        priority: request.priority,
        encrypted: false,
      };

      // Send the task to the selected agent
      await this.sendMessage(taskMessage);

      // Wait for task completion
      const result = (await this.waitForTaskCompletion(request.taskId)) as unknown as {
        success: boolean;
        data: Record<string, unknown>;
        executionTime: number;
        errors?: string[];
      };

      const taskResult: CrossFrameworkTaskResult = {
        taskId: request.taskId,
        success: result.success,
        result: result.data,
        executingAgent: selectedAgent.agentId,
        executingFramework: request.targetFramework,
        executionTime: result.executionTime,
        errors: result.errors || [],
      };

      this.emit('cross-framework-task-completed', taskResult);
      return taskResult;
    } catch (error) {
      this.logger.error('Cross-framework task execution failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Cross-framework task failed: ${msg}`);
    }
  }

  /**
   * Handle agent handoff between frameworks
   */
  async handleAgentHandoff(handoffRequest: HandoffRequest): Promise<void> {
    try {
      HandoffRequestSchema.parse(handoffRequest);

      this.logger.info('Processing agent handoff', {
        taskId: handoffRequest.taskId,
        from: handoffRequest.fromAgentId,
        to: handoffRequest.toAgentId,
      });

      // Create handoff message
      const handoffMessage: A2AMessage = {
        id: uuid(),
        from: handoffRequest.fromAgentId,
        to: handoffRequest.toAgentId,
        type: 'handoff',
        framework: this.getAgentFramework(handoffRequest.toAgentId),
        payload: {
          taskId: handoffRequest.taskId,
          taskDescription: handoffRequest.taskDescription,
          context: handoffRequest.context,
          requiredCapabilities: handoffRequest.requiredCapabilities,
          priority: handoffRequest.priority,
          deadline: handoffRequest.deadline,
        },
        timestamp: new Date(),
        correlationId: handoffRequest.taskId,
        priority: handoffRequest.priority,
        encrypted: false,
      };

      await this.sendMessage(handoffMessage);

      this.emit('agent-handoff-initiated', {
        taskId: handoffRequest.taskId,
        fromAgent: handoffRequest.fromAgentId,
        toAgent: handoffRequest.toAgentId,
      });
    } catch (error) {
      this.logger.error('Agent handoff failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Agent handoff failed: ${msg}`);
    }
  }

  /**
   * Query agent capabilities across all frameworks
   */
  async queryCapabilities(capabilityQuery: string[]): Promise<AgentCapability[]> {
    const matchingAgents: AgentCapability[] = [];

    for (const [, capability] of this.registeredAgents) {
      const hasRequiredCapabilities = capabilityQuery.every((required) =>
        capability.capabilities.includes(required),
      );

      if (hasRequiredCapabilities && capability.availability === 'available') {
        matchingAgents.push(capability);
      }
    }

    this.logger.info('Capability query executed', {
      query: capabilityQuery,
      matchingAgents: matchingAgents.length,
    });

    return matchingAgents;
  }

  private handleIncomingMessage(message: A2AMessage): void {
    this.logger.info('Incoming A2A message', {
      messageId: message.id,
      from: message.from,
      to: message.to,
      type: message.type,
    });

    // Route message to appropriate framework bridge
    const targetFrameworkBridge = this.frameworkBridges.get(message.framework);
    if (targetFrameworkBridge) {
      targetFrameworkBridge.handleMessage(message);
    }

    this.emit('message-routed', message);
  }

  private findSuitableAgents(framework: string, requiredCapabilities: string[]): AgentCapability[] {
    const suitableAgents: AgentCapability[] = [];

    for (const [, capability] of this.registeredAgents) {
      if (
        capability.framework === framework &&
        capability.availability === 'available' &&
        requiredCapabilities.every((cap) => capability.capabilities.includes(cap))
      ) {
        suitableAgents.push(capability);
      }
    }

    return suitableAgents;
  }

  private selectBestAgent(candidates: AgentCapability[]): AgentCapability {
    // Select agent with lowest current load
    return candidates.reduce((best, current) => {
      const bestLoad = best.currentLoad / best.maxConcurrentTasks;
      const currentLoad = current.currentLoad / current.maxConcurrentTasks;
      return currentLoad < bestLoad ? current : best;
    });
  }

  private async waitForTaskCompletion(taskId: string): Promise<unknown> {
    const eventName = `task-completed-${taskId}`;
    return new Promise((resolve, reject) => {
      let settled = false;
      const onComplete = (result: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.removeListener(eventName, onComplete);
        resolve(result);
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.removeListener(eventName, onComplete);
        reject(new Error(`Task ${taskId} timed out`));
      }, this.config.messageTimeout);

      this.once(eventName, onComplete);
    });
  }

  private handleFrameworkTaskCompletion(framework: string, result: Record<string, unknown>): void {
    this.logger.info('Framework task completed', {
      framework,
      taskId: result.taskId,
    });
    this.emit(`task-completed-${result.taskId}`, result);
  }

  private updateAgentCapabilities(agentId: string, capabilities: string[]): void {
    const agent = this.registeredAgents.get(agentId);
    if (agent) {
      agent.capabilities = capabilities;
      this.registeredAgents.set(agentId, agent);
      this.logger.info('Agent capabilities updated', { agentId, capabilities });
    }
  }

  private getAgentFramework(agentId: string): 'langchain' | 'crewai' | 'autogen' {
    const agent = this.registeredAgents.get(agentId);
    return agent?.framework || 'langchain';
  }

  private handleAgentDisconnection(agentId: string): void {
    this.registeredAgents.delete(agentId);
    this.emit('agent-disconnected', agentId);
  }

  private startCapabilityDiscovery(): void {
    if (this.config.capabilityDiscoveryInterval && this.config.capabilityDiscoveryInterval > 0) {
      this.capabilityDiscoveryTimer = setInterval(() => {
        this.performCapabilityDiscovery();
      }, this.config.capabilityDiscoveryInterval);
    }
  }

  private async performCapabilityDiscovery(): Promise<void> {
    this.logger.debug('Performing capability discovery');

    // Use broadcast on the underlying protocol for discovery pings
    await this.a2aProtocol.broadcast({
      type: 'status-update',
      payload: { query: 'discovery' },
      priority: 'low',
    });
  }

  /**
   * Clean up resources and stop the protocol bridge
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Agent Protocol Bridge');

    if (this.capabilityDiscoveryTimer) {
      clearInterval(this.capabilityDiscoveryTimer);
    }

    this.registeredAgents.clear();
    this.messageQueue.clear();
    this.pendingRequests.clear();

    await this.a2aProtocol.shutdown();

    this.emit('shutdown-complete');
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
