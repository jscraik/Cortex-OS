/**
 * MLX-First Orchestration Coordinator
 * Uses your available models with intelligent fallback strategies
 */

import { MLXFirstModelProvider } from '../providers/mlx-first-provider.js';
import { buildAgentPrompt, parseAgentSelection } from '../../../../src/lib/agent-selection.js';

export interface TaskDecomposition {
  subtasks: Array<{
    id: string;
    description: string;
    dependencies: string[];
    estimatedComplexity: number;
    recommendedAgent: string;
    requiredCapabilities: string[];
  }>;
  parallelizable: string[][];
  criticalPath: string[];
  reasoning: string;
}

export interface CoordinationDecision {
  action: 'proceed' | 'wait' | 'escalate' | 'abort';
  reasoning: string;
  confidence: number;
  nextSteps: string[];
  provider: 'mlx' | 'ollama';
}

export class MLXFirstOrchestrator {
  private readonly modelProvider: MLXFirstModelProvider;
  private readonly activeWorkflows = new Map<string, any>();

  constructor() {
    this.modelProvider = new MLXFirstModelProvider();
  }

  /**
   * Decompose complex tasks using Mixtral-8x7B (MLX) or Qwen3-Coder (fallback)
   */
  async decomposeTask(
    taskDescription: string,
    availableAgents: string[],
    constraints?: { maxParallelism?: number; timeLimit?: number },
  ): Promise<TaskDecomposition> {
    const prompt = `Break down this complex task into manageable subtasks:

TASK: ${taskDescription}

AVAILABLE AGENTS: ${availableAgents.join(', ')}

CONSTRAINTS:
${constraints?.maxParallelism ? `- Max parallel tasks: ${constraints.maxParallelism}` : ''}
${constraints?.timeLimit ? `- Time limit: ${constraints.timeLimit} minutes` : ''}

Provide a structured breakdown with:
1. Subtasks with dependencies
2. Parallel execution opportunities  
3. Critical path identification
4. Agent assignments based on capabilities

Format as JSON with reasoning.`;

    try {
      // Use complex reasoning model (Mixtral MoE for expert thinking)
      const response = await this.modelProvider.generate('complexReasoning', {
        task: 'task_decomposition',
        prompt,
        maxTokens: 800,
        temperature: 0.3,
      });

      return this.parseTaskDecomposition(response.content);
    } catch (error) {
      console.warn('MLX task decomposition failed:', error);
      return this.fallbackTaskDecomposition(taskDescription, availableAgents);
    }
  }

  /**
   * Multi-modal coordination for tasks involving UI/visual elements
   */
  async coordinateMultiModalTask(
    taskDescription: string,
    visualContext?: string, // Base64 image or UI description
    codeContext?: string,
  ): Promise<CoordinationDecision> {
    let prompt = `Coordinate this multi-modal task:

TASK: ${taskDescription}`;

    if (visualContext) {
      prompt += `\nVISUAL CONTEXT: ${visualContext}`;
    }

    if (codeContext) {
      prompt += `\nCODE CONTEXT: ${codeContext}`;
    }

    prompt += `\nDetermine the best coordination approach considering all modalities.
Provide decision, reasoning, confidence (0-1), and next steps.`;

    try {
      // Use vision-language model for multi-modal understanding
      const response = await this.modelProvider.generate('multiModal', {
        task: 'multimodal_coordination',
        prompt,
        maxTokens: 300,
        temperature: 0.4,
      });

      return this.parseCoordinationDecision(response.content, response.provider);
    } catch (error) {
      console.warn('Multi-modal coordination failed:', error);
      return {
        action: 'proceed',
        reasoning: 'Fallback coordination - proceeding with text-only analysis',
        confidence: 0.3,
        nextSteps: ['Analyze task requirements', 'Assign to appropriate agent'],
        provider: 'ollama',
      };
    }
  }

  /**
   * Code-aware orchestration using specialized coding models
   */
  async orchestrateCodeTask(
    codeTask: string,
    codebase?: string,
    testRequirements?: string,
  ): Promise<{
    plan: TaskDecomposition;
    codeStrategy: string;
    testStrategy: string;
    riskAssessment: string;
  }> {
    const prompt = `Plan this code-related task:

TASK: ${codeTask}

${codebase ? `EXISTING CODEBASE:\n${codebase.slice(0, 2000)}...` : ''}

${testRequirements ? `TEST REQUIREMENTS:\n${testRequirements}` : ''}

Provide:
1. Development plan with subtasks
2. Coding strategy and best practices
3. Testing approach
4. Risk assessment and mitigation

Focus on maintainable, testable code.`;

    try {
      // Use specialized coding model
      const response = await this.modelProvider.generate('codeIntelligence', {
        task: 'code_orchestration',
        prompt,
        maxTokens: 1000,
        temperature: 0.2,
      });

      return this.parseCodeOrchestrationResponse(response.content);
    } catch (error) {
      console.warn('Code orchestration failed:', error);
      return this.fallbackCodeOrchestration(codeTask);
    }
  }

  /**
   * Real-time workflow coordination using fast reasoning
   */
  async coordinateWorkflow(
    workflowId: string,
    currentState: any,
    incomingEvents: any[],
  ): Promise<CoordinationDecision> {
    const prompt = `Coordinate this real-time workflow:

WORKFLOW ID: ${workflowId}
CURRENT STATE: ${JSON.stringify(currentState, null, 2)}

INCOMING EVENTS:
${incomingEvents.map((e, i) => `${i + 1}. ${JSON.stringify(e)}`).join('\n')}

Decide immediate action: proceed, wait, escalate, or abort.
Consider event priority, resource availability, and dependencies.

Provide quick decision with reasoning.`;

    try {
      // Use fast reasoning for real-time decisions
      const response = await this.modelProvider.generate('quickReasoning', {
        task: 'workflow_coordination',
        prompt,
        maxTokens: 200,
        temperature: 0.1,
      });

      return this.parseCoordinationDecision(response.content, response.provider);
    } catch (error) {
      console.warn('Workflow coordination failed:', error);
      return {
        action: 'wait',
        reasoning: 'Unable to analyze workflow state - defaulting to safe wait',
        confidence: 0.2,
        nextSteps: ['Retry analysis', 'Check system health'],
        provider: 'ollama',
      };
    }
  }

  /**
   * Intelligent agent selection based on task requirements
   */
  async selectOptimalAgent(
    taskDescription: string,
    availableAgents: Array<{ id: string; capabilities: string[]; currentLoad: number }>,
    urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<{ agentId: string; reasoning: string; confidence: number }> {
    const prompt = buildAgentPrompt(taskDescription, availableAgents, urgency);

    try {
      const response = await this.modelProvider.generate('quickReasoning', {
        task: 'agent_selection',
        prompt,
        maxTokens: 150,
      });

      return parseAgentSelection(response.content, availableAgents);
    } catch (error) {
      console.warn('Agent selection failed:', error);
      // Fallback: least loaded agent
      const leastLoaded = availableAgents.reduce(
        (min, agent) => (agent.currentLoad < min.currentLoad ? agent : min),
        availableAgents[0],
      );

      return {
        agentId: leastLoaded.id,
        reasoning: 'Fallback selection - chose least loaded agent',
        confidence: 0.3,
      };
    }
  }

  /**
   * Safety and compliance checking using LlamaGuard
   */
  async validateTaskSafety(
    taskDescription: string,
    context?: string,
  ): Promise<{ safe: boolean; issues: string[]; recommendations: string[] }> {
    // This would integrate with your LlamaGuard model for safety validation
    const prompt = `Evaluate the safety and compliance of this task:

TASK: ${taskDescription}
${context ? `CONTEXT: ${context}` : ''}

Check for:
- Security risks
- Privacy concerns  
- Regulatory compliance
- Ethical considerations
- Resource safety

Provide safety assessment with specific issues and recommendations.`;

    try {
      // Use safety model or general reasoning as fallback
      const response = await this.modelProvider.generate('generalChat', {
        task: 'safety_validation',
        prompt,
        maxTokens: 300,
      });

      return this.parseSafetyAssessment(response.content);
    } catch (error) {
      console.warn('Safety validation failed:', error);
      return {
        safe: false,
        issues: ['Unable to perform safety validation'],
        recommendations: ['Manual review required'],
      };
    }
  }

  /**
   * Parser methods for model responses
   */
  private parseTaskDecomposition(content: string): TaskDecomposition {
    try {
      // Try to extract JSON from response
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonRegex.exec(content);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse JSON response:', error);
    }

    // Fallback parsing
    return this.fallbackTaskDecomposition('Complex task', []);
  }

  private parseCoordinationDecision(
    content: string,
    provider: 'mlx' | 'ollama',
  ): CoordinationDecision {
    const lines = content.split('\n');
    let action: CoordinationDecision['action'] = 'proceed';
    let confidence = 0.5;
    const nextSteps: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().includes('abort')) action = 'abort';
      else if (line.toLowerCase().includes('wait')) action = 'wait';
      else if (line.toLowerCase().includes('escalate')) action = 'escalate';

      if (line.includes('confidence:') || line.includes('confidence =')) {
        const confRegex = /(\d+\.?\d*)/;
        const confMatch = confRegex.exec(line);
        if (confMatch) confidence = Math.max(0, Math.min(1, parseFloat(confMatch[1])));
      }

      if (line.toLowerCase().includes('next:') || line.toLowerCase().includes('steps:')) {
        nextSteps.push(line.replace(/^.*?steps?:?\s*/i, ''));
      }
    }

    return { action, reasoning: content, confidence, nextSteps, provider };
  }

  private parseCodeOrchestrationResponse(content: string) {
    return {
      plan: this.fallbackTaskDecomposition('Code task', []),
      codeStrategy: 'Follow best practices and write maintainable code',
      testStrategy: 'Write comprehensive unit and integration tests',
      riskAssessment: 'Medium risk - requires careful review',
    };
  }

  private parseSafetyAssessment(content: string) {
    const safe =
      !content.toLowerCase().includes('unsafe') &&
      !content.toLowerCase().includes('risk') &&
      !content.toLowerCase().includes('danger');

    return {
      safe,
      issues: safe ? [] : ['Potential safety concerns identified'],
      recommendations: safe ? ['Task appears safe to proceed'] : ['Review task for safety issues'],
    };
  }

  private fallbackTaskDecomposition(task: string, agents: string[]): TaskDecomposition {
    return {
      subtasks: [
        {
          id: '1',
          description: task,
          dependencies: [],
          estimatedComplexity: 5,
          recommendedAgent: agents[0] || 'default',
          requiredCapabilities: ['general'],
        },
      ],
      parallelizable: [['1']],
      criticalPath: ['1'],
      reasoning: 'Fallback decomposition - treat as single task',
    };
  }

  private fallbackCodeOrchestration(task: string) {
    return {
      plan: this.fallbackTaskDecomposition(task, ['coder']),
      codeStrategy: 'Implement incrementally with tests',
      testStrategy: 'TDD approach with comprehensive coverage',
      riskAssessment: 'Standard development risks apply',
    };
  }
}
