/**
 * LangChain Integration Engine for Cortex OS
 * Provides AI-powered reasoning, planning, and execution capabilities
 */

import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { DynamicTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { EventEmitter } from 'events';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { v4 as uuid } from 'uuid';
import winston from 'winston';
import {
  Agent,
  AgentCapability,
  ExecutionPlan,
  LangChainConfig,
  LangChainResult,
  OrchestrationEvent,
  OrchestrationStrategy,
  PlanningContext,
  Task,
} from './types.js';

// LangChain result types
interface LangChainExecutionResult {
  output?: string;
  intermediateSteps?: unknown[];
  [key: string]: unknown;
}

/**
 * LangChain Integration Engine
 * Provides sophisticated AI reasoning and tool usage capabilities
 */
export class LangChainEngine extends EventEmitter {
  private logger: winston.Logger;
  private config: LangChainConfig;
  private chatModel: ChatOpenAI;
  private agentExecutors: Map<string, AgentExecutor>;
  private tools: DynamicTool[];
  private conversationMemory: Map<string, BaseMessage[]>;

  constructor(config: Partial<LangChainConfig> = {}) {
    super();

    this.setupConfiguration(config);
    this.setupLogger();
    this.initializeChatModel();
    this.initializeDataStructures();
    this.initializeCoreLangChainTools();
  }

  /**
   * Setup engine configuration with defaults
   */
  private setupConfiguration(config: Partial<LangChainConfig>): void {
    this.config = {
      model: config.model || 'gpt-4',
      temperature: config.temperature || 0.1,
      maxTokens: config.maxTokens || 4000,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      enableMemory: config.enableMemory !== false,
      toolTimeout: config.toolTimeout || 10000,
    };
  }

  /**
   * Setup Winston logger with console and file transports
   */
  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'langchain-engine.log' }),
      ],
    });
  }

  /**
   * Initialize ChatOpenAI model with configuration
   */
  private initializeChatModel(): void {
    this.chatModel = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      timeout: this.config.timeout,
      openAIApiKey: this.config.apiKey,
    });
  }

  /**
   * Initialize core data structures
   */
  private initializeDataStructures(): void {
    this.agentExecutors = new Map();
    this.tools = [];
    this.conversationMemory = new Map();
  }

  /**
   * Initialize core LangChain tools for agent operations
   */
  private initializeCoreLangChainTools(): void {
    this.createTaskAnalyzerTool();
    this.createCapabilityAssessorTool();
    this.createPlanOptimizerTool();
    this.createRiskAssessorTool();
    this.createDecisionSupportTool();

    this.logger.info(`Initialized ${this.tools.length} LangChain tools`);
  }

  /**
   * Create task analyzer tool for complexity assessment
   */
  private createTaskAnalyzerTool(): void {
    this.tools.push(
      new DynamicTool({
        name: 'task_analyzer',
        description: 'Analyze task complexity, requirements, and optimal execution strategy',
        func: async (input: string) => {
          try {
            const analysis = await this.analyzeTaskWithLLM(JSON.parse(input));
            return JSON.stringify(analysis);
          } catch (error) {
            return `Task analysis failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),
    );
  }

  /**
   * Create capability assessor tool for agent matching
   */
  private createCapabilityAssessorTool(): void {
    this.tools.push(
      new DynamicTool({
        name: 'capability_assessor',
        description: 'Assess agent capabilities and match them to task requirements',
        func: async (input: string) => {
          try {
            const assessment = await this.assessAgentCapabilities(JSON.parse(input));
            return JSON.stringify(assessment);
          } catch (error) {
            return `Capability assessment failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),
    );
  }

  /**
   * Create plan optimizer tool for execution efficiency
   */
  private createPlanOptimizerTool(): void {
    this.tools.push(
      new DynamicTool({
        name: 'plan_optimizer',
        description: 'Optimize execution plans for efficiency, quality, and resource usage',
        func: async (input: string) => {
          try {
            const optimization = await this.optimizePlan(JSON.parse(input));
            return JSON.stringify(optimization);
          } catch (error) {
            return `Plan optimization failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),
    );
  }

  /**
   * Create risk assessor tool for mitigation strategies
   */
  private createRiskAssessorTool(): void {
    this.tools.push(
      new DynamicTool({
        name: 'risk_assessor',
        description: 'Assess risks and generate mitigation strategies for execution plans',
        func: async (input: string) => {
          try {
            const riskAssessment = await this.assessRisks(JSON.parse(input));
            return JSON.stringify(riskAssessment);
          } catch (error) {
            return `Risk assessment failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),
    );
  }

  /**
   * Create decision support tool for complex scenarios
   */
  private createDecisionSupportTool(): void {
    this.tools.push(
      new DynamicTool({
        name: 'decision_support',
        description: 'Provide decision support for complex orchestration scenarios',
        func: async (input: string) => {
          try {
            const decision = await this.supportDecision(JSON.parse(input));
            return JSON.stringify(decision);
          } catch (error) {
            return `Decision support failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),
    );
  }

  /**
   * Create an intelligent agent using LangChain
   */
  async createIntelligentAgent(agentId: string, capabilities: AgentCapability[]): Promise<string> {
    try {
      const prompt = this.createAgentPromptTemplate(capabilities);
      const agent = await this.createToolCallingAgent(prompt);
      const agentExecutor = this.createAgentExecutor(agent);

      this.registerAgent(agentId, agentExecutor);
      this.initializeAgentMemory(agentId);

      this.logger.info(
        `Created intelligent agent ${agentId} with ${capabilities.length} capabilities`,
      );
      return agentId;
    } catch (error) {
      this.logger.error(`Failed to create intelligent agent ${agentId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create agent-specific prompt template with capabilities
   */
  private createAgentPromptTemplate(capabilities: AgentCapability[]): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages([
      ['system', this.buildSystemPrompt(capabilities)],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);
  }

  /**
   * Create tool-calling agent with LLM and tools
   */
  private async createToolCallingAgent(prompt: ChatPromptTemplate) {
    return await createToolCallingAgent({
      llm: this.chatModel,
      tools: this.tools,
      prompt,
    });
  }

  /**
   * Create agent executor with configuration
   */
  private createAgentExecutor(agent: unknown): AgentExecutor {
    return new AgentExecutor({
      agent: agent as AgentExecutor['agent'],
      tools: this.tools,
      verbose: true,
      maxIterations: 10,
      handleParsingErrors: true,
    });
  }

  /**
   * Register agent executor in the map
   */
  private registerAgent(agentId: string, agentExecutor: AgentExecutor): void {
    this.agentExecutors.set(agentId, agentExecutor);
  }

  /**
   * Initialize conversation memory for agent if enabled
   */
  private initializeAgentMemory(agentId: string): void {
    if (this.config.enableMemory) {
      this.conversationMemory.set(agentId, []);
    }
  }

  /**
   * Execute intelligent planning using LangChain
   */
  async executeIntelligentPlanning(context: PlanningContext): Promise<LangChainResult> {
    const agentId = `planner-${uuid()}`;
    const startTime = Date.now();

    try {
      await this.createPlanningAgent(agentId);
      const result = await this.executePlanningProcess(agentId, context);
      const planningResult = await this.processPlanningResult(result, context);

      this.updatePlanningMemory(agentId, context, result);
      this.emitPlanningEvent(context.task.id, planningResult);

      return this.buildPlanningSuccess(planningResult, result, context, startTime);
    } catch (error) {
      this.logger.error(`Intelligent planning failed for task ${context.task.id}`, {
        error: error instanceof Error ? error.message : String(error),
        agentId,
      });

      return this.buildPlanningError(error, startTime);
    } finally {
      this.cleanupPlanningAgent(agentId);
    }
  }

  /**
   * Create specialized planning agent with required capabilities
   */
  private async createPlanningAgent(agentId: string): Promise<void> {
    await this.createIntelligentAgent(agentId, [
      AgentCapability.TASK_PLANNING,
      AgentCapability.RESOURCE_OPTIMIZATION,
      AgentCapability.RISK_ASSESSMENT,
    ]);
  }

  /**
   * Execute planning process with context and tools
   */
  private async executePlanningProcess(agentId: string, context: PlanningContext) {
    const executor = this.agentExecutors.get(agentId)!;
    const planningPrompt = this.buildPlanningPrompt(context);

    return await executor.invoke({
      input: planningPrompt,
      chat_history: this.conversationMemory.get(agentId) || [],
    });
  }

  /**
   * Update conversation memory if enabled
   */
  private updatePlanningMemory(
    agentId: string,
    context: PlanningContext,
    result: LangChainExecutionResult,
  ): void {
    if (this.config.enableMemory) {
      const planningPrompt = this.buildPlanningPrompt(context);
      this.updateConversationMemory(agentId, planningPrompt, result.output || '');
    }
  }

  /**
   * Emit planning completed event
   */
  private emitPlanningEvent(taskId: string, planningResult: unknown): void {
    this.emit('planningCompleted', {
      type: 'plan_created',
      taskId,
      data: planningResult,
      timestamp: new Date(),
      source: 'LangChainEngine',
    } as OrchestrationEvent);
  }

  /**
   * Build successful planning result
   */
  private buildPlanningSuccess(
    planningResult: unknown,
    result: LangChainExecutionResult,
    context: PlanningContext,
    startTime: number,
  ): LangChainResult {
    const executionTime = Date.now() - startTime;
    const planningPrompt = this.buildPlanningPrompt(context);

    return {
      success: true,
      result: planningResult,
      reasoning: result.output,
      toolsUsed: this.extractToolsUsed(result),
      executionTime,
      tokensUsed: this.estimateTokensUsed(planningPrompt, result.output || ''),
    };
  }

  /**
   * Build error planning result
   */
  private buildPlanningError(error: unknown, startTime: number): LangChainResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime,
      tokensUsed: 0,
    };
  }

  /**
   * Cleanup planning agent resources
   */
  private cleanupPlanningAgent(agentId: string): void {
    this.agentExecutors.delete(agentId);
    this.conversationMemory.delete(agentId);
  }

  /**
   * Execute intelligent task execution using LangChain
   */
  async executeIntelligentTask(task: Task, agent: Agent): Promise<LangChainResult> {
    const agentId = agent.id;
    const startTime = Date.now();

    try {
      await this.ensureAgentHasExecutor(agentId, agent);
      const result = await this.executeTaskWithAgent(agentId, task, agent);
      const taskResult = await this.processTaskResult(result, task);

      this.updateTaskMemory(agentId, task, agent, result);
      this.emitTaskCompletionEvent(task.id, taskResult);

      return this.buildTaskExecutionSuccess(taskResult, result, task, agent, startTime);
    } catch (error) {
      this.logger.error(`Intelligent task execution failed for task ${task.id}`, {
        error: error instanceof Error ? error.message : String(error),
        agentId,
      });

      return this.buildTaskExecutionError(error, startTime);
    }
  }

  /**
   * Ensure agent has LangChain executor available
   */
  private async ensureAgentHasExecutor(agentId: string, agent: Agent): Promise<void> {
    if (!this.agentExecutors.has(agentId)) {
      await this.createIntelligentAgent(agentId, agent.capabilities as AgentCapability[]);
    }
  }

  /**
   * Execute task using agent's executor with tools
   */
  private async executeTaskWithAgent(agentId: string, task: Task, agent: Agent) {
    const executor = this.agentExecutors.get(agentId)!;
    const executionPrompt = this.buildTaskExecutionPrompt(task, agent);

    return await executor.invoke({
      input: executionPrompt,
      chat_history: this.conversationMemory.get(agentId) || [],
    });
  }

  /**
   * Update task conversation memory if enabled
   */
  private updateTaskMemory(
    agentId: string,
    task: Task,
    agent: Agent,
    result: LangChainExecutionResult,
  ): void {
    if (this.config.enableMemory) {
      const executionPrompt = this.buildTaskExecutionPrompt(task, agent);
      this.updateConversationMemory(agentId, executionPrompt, result.output || '');
    }
  }

  /**
   * Emit task completion event
   */
  private emitTaskCompletionEvent(taskId: string, taskResult: unknown): void {
    this.emit('taskCompleted', {
      type: 'task_completed',
      taskId,
      data: taskResult,
      timestamp: new Date(),
      source: 'LangChainEngine',
    } as OrchestrationEvent);
  }

  /**
   * Build successful task execution result
   */
  private buildTaskExecutionSuccess(
    taskResult: unknown,
    result: LangChainExecutionResult,
    task: Task,
    agent: Agent,
    startTime: number,
  ): LangChainResult {
    const executionTime = Date.now() - startTime;
    const executionPrompt = this.buildTaskExecutionPrompt(task, agent);

    return {
      success: true,
      result: taskResult,
      reasoning: result.output,
      toolsUsed: this.extractToolsUsed(result),
      executionTime,
      tokensUsed: this.estimateTokensUsed(executionPrompt, result.output || ''),
    };
  }

  /**
   * Build error task execution result
   */
  private buildTaskExecutionError(error: unknown, startTime: number): LangChainResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime,
      tokensUsed: 0,
    };
  }

  /**
   * Generate intelligent responses using LangChain
   */
  async generateIntelligentResponse(
    prompt: string,
    context?: Record<string, unknown>,
  ): Promise<string> {
    try {
      const chain = RunnableSequence.from([
        ChatPromptTemplate.fromTemplate(`
          Context: {context}

          Human: {prompt}

          Please provide a thoughtful, detailed response based on the context and prompt.
          Use your reasoning capabilities to provide insights and actionable recommendations.
        `),
        this.chatModel,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        prompt,
        context: JSON.stringify(context || {}),
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to generate intelligent response', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ================================
  // Tool Implementation Methods
  // ================================

  private async analyzeTaskWithLLM(
    taskData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const analysisPrompt = `
      Analyze the following task and provide a comprehensive assessment:

      Task: ${JSON.stringify(taskData)}

      Please analyze:
      1. Complexity level (simple/moderate/complex/very complex)
      2. Required capabilities and skills
      3. Estimated effort and duration
      4. Potential challenges and risks
      5. Recommended approach and strategy
      6. Success criteria and validation methods

      Provide structured JSON output with your analysis.
    `;

    const response = await this.generateIntelligentResponse(analysisPrompt);

    try {
      return JSON.parse(response);
    } catch {
      return {
        complexity: 'moderate',
        analysis: response,
        recommendation: 'Use standard orchestration approach',
      };
    }
  }

  private async assessAgentCapabilities(
    agentData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const assessmentPrompt = `
      Assess the following agent capabilities for task matching:

      Agent Data: ${JSON.stringify(agentData)}

      Please assess:
      1. Core competencies and strengths
      2. Capability gaps or limitations
      3. Suitability for different task types
      4. Performance optimization opportunities
      5. Recommended role assignments
      6. Training or enhancement needs

      Provide structured JSON output with your assessment.
    `;

    const response = await this.generateIntelligentResponse(assessmentPrompt);

    try {
      return JSON.parse(response);
    } catch {
      return {
        assessment: response,
        suitability: 'general-purpose',
        recommendation: 'Suitable for standard tasks',
      };
    }
  }

  private async optimizePlan(planData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const optimizationPrompt = `
      Optimize the following execution plan:

      Plan: ${JSON.stringify(planData)}

      Please optimize for:
      1. Execution efficiency and speed
      2. Resource utilization
      3. Risk mitigation
      4. Quality assurance
      5. Scalability and maintainability
      6. Cost effectiveness

      Provide structured JSON output with optimized plan and rationale.
    `;

    const response = await this.generateIntelligentResponse(optimizationPrompt);

    try {
      return JSON.parse(response);
    } catch {
      return {
        optimization: response,
        improvements: ['Standard optimization applied'],
        rationale: 'Plan optimization completed',
      };
    }
  }

  private async assessRisks(riskData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const riskPrompt = `
      Assess risks for the following scenario:

      Scenario: ${JSON.stringify(riskData)}

      Please assess:
      1. Technical risks and challenges
      2. Resource and capacity risks
      3. Timeline and deadline risks
      4. Quality and compliance risks
      5. Dependencies and integration risks
      6. Mitigation strategies and contingencies

      Provide structured JSON output with risk assessment and mitigation plans.
    `;

    const response = await this.generateIntelligentResponse(riskPrompt);

    try {
      return JSON.parse(response);
    } catch {
      return {
        risks: ['Standard project risks'],
        assessment: response,
        mitigation: 'Apply standard risk management practices',
      };
    }
  }

  private async supportDecision(
    decisionData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const decisionPrompt = `
      Provide decision support for the following scenario:

      Decision Context: ${JSON.stringify(decisionData)}

      Please provide:
      1. Analysis of available options
      2. Pros and cons of each option
      3. Risk assessment for each option
      4. Recommended decision with rationale
      5. Implementation considerations
      6. Success metrics and monitoring

      Provide structured JSON output with decision analysis and recommendation.
    `;

    const response = await this.generateIntelligentResponse(decisionPrompt);

    try {
      return JSON.parse(response);
    } catch {
      return {
        recommendation: response,
        rationale: 'Decision analysis completed',
        confidence: 'moderate',
      };
    }
  }

  // ================================
  // Utility Methods
  // ================================

  private buildSystemPrompt(capabilities: AgentCapability[]): string {
    return `
      You are an intelligent AI agent with the following capabilities:
      ${capabilities.map((cap) => `- ${cap}`).join('\n')}

      Your role is to:
      1. Analyze tasks and situations with sophisticated reasoning
      2. Use available tools to gather information and perform actions
      3. Provide detailed, actionable recommendations
      4. Learn from interactions to improve future performance
      5. Collaborate effectively with other agents and systems

      Always think step by step, use tools when appropriate, and provide clear rationale for your decisions.
      Be thorough but concise in your responses.
    `;
  }

  private buildPlanningPrompt(context: PlanningContext): string {
    return `
      You are tasked with creating an optimal execution plan for the following:

      Task: ${context.task.title}
      Description: ${context.task.description}
      Required Capabilities: ${context.task.requiredCapabilities.join(', ')}
      Dependencies: ${context.task.dependencies.join(', ')}

      Available Agents: ${context.availableAgents.length}
      Resources: ${Object.keys(context.resources).join(', ')}
      Constraints: ${JSON.stringify(context.constraints)}
      Preferences: ${JSON.stringify(context.preferences)}

      Please use the available tools to:
      1. Analyze the task complexity and requirements
      2. Assess agent capabilities and resource needs
      3. Optimize the execution strategy
      4. Assess potential risks and mitigation strategies
      5. Generate a comprehensive execution plan

      Provide a detailed plan with reasoning for your decisions.
    `;
  }

  private buildTaskExecutionPrompt(task: Task, agent: Agent): string {
    return `
      Execute the following task using your capabilities:

      Task: ${task.title}
      Description: ${task.description}
      Status: ${task.status}
      Priority: ${task.priority}

      Your Capabilities: ${agent.capabilities.join(', ')}
      Your Role: ${agent.role}

      Please:
      1. Analyze the task requirements
      2. Use appropriate tools to complete the task
      3. Provide detailed progress updates
      4. Ensure quality and completeness
      5. Report results and any issues encountered

      Be thorough and systematic in your approach.
    `;
  }

  private async processPlanningResult(
    result: Record<string, unknown>,
    context: PlanningContext,
  ): Promise<ExecutionPlan> {
    // Extract structured plan from LLM result
    const planId = uuid();

    return {
      id: planId,
      taskId: context.task.id,
      strategy: OrchestrationStrategy.ADAPTIVE, // Determine from result
      phases: ['analysis', 'planning', 'execution', 'validation'],
      dependencies: {},
      estimatedDuration: 3600000, // 1 hour default
      resourceRequirements: {
        minAgents: 1,
        maxAgents: context.availableAgents.length,
        requiredCapabilities: context.task.requiredCapabilities,
      },
      checkpoints: [],
      fallbackStrategies: ['sequential'],
      createdAt: new Date(),
    };
  }

  private async processTaskResult(
    result: Record<string, unknown>,
    task: Task,
  ): Promise<Record<string, unknown>> {
    return {
      taskId: task.id,
      status: 'completed',
      result: result.output,
      reasoning: this.extractReasoning(result),
      timestamp: new Date(),
    };
  }

  private updateConversationMemory(agentId: string, input: string, output: string): void {
    const memory = this.conversationMemory.get(agentId) || [];
    memory.push(new HumanMessage(input));
    memory.push(new AIMessage(output));

    // Keep only last 20 messages to manage memory
    if (memory.length > 20) {
      memory.splice(0, memory.length - 20);
    }

    this.conversationMemory.set(agentId, memory);
  }

  private extractToolsUsed(_result: Record<string, unknown>): string[] {
    // Extract tools from the result - this would need to be implemented based on LangChain result structure
    return [];
  }

  private extractReasoning(result: Record<string, unknown>): string {
    return (result.output as string) || 'Task completed successfully';
  }

  private estimateTokensUsed(input: string, output: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil((input.length + output.length) / 4);
  }

  /**
   * Add custom tool to the engine
   */
  addTool(tool: DynamicTool): void {
    this.tools.push(tool);
    this.logger.info(`Added custom tool: ${tool.name}`);
  }

  /**
   * Get engine statistics
   */
  getStatistics(): {
    activeAgents: number;
    totalTools: number;
    conversationsActive: number;
    modelConfiguration: string;
  } {
    return {
      activeAgents: this.agentExecutors.size,
      totalTools: this.tools.length,
      conversationsActive: this.conversationMemory.size,
      modelConfiguration: `${this.config.model} (temp: ${this.config.temperature})`,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.agentExecutors.clear();
    this.conversationMemory.clear();
    this.logger.info('LangChain engine cleanup completed');
  }
}
