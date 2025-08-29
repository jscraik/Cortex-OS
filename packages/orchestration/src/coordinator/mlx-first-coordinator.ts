/**
 * MLX-First Orchestration Coordinator
 * Uses your available models with intelligent fallback strategies
 */

import { MLXFirstModelProvider } from '../providers/mlx-first-provider.js';
import { OrchestrationError } from '../errors.js';

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
      throw new OrchestrationError(
        'TASK_DECOMPOSITION_FAILED',
        `Failed to decompose task: ${(error as Error).message}`,
      );
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
      throw new OrchestrationError(
        'CODE_ORCHESTRATION_FAILED',
        `Failed to orchestrate code task: ${(error as Error).message}`,
      );
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
      // Use fast reasoning model
      const response = await this.modelProvider.generate('fastReasoning', {
        task: 'workflow_coordination',
        prompt,
        maxTokens: 150,
        temperature: 0.5,
      });

      return this.parseCoordinationDecision(response.content, response.provider);
    } catch (error) {
      console.warn('Workflow coordination failed:', error);
      return {
        action: 'wait',
        reasoning: 'Fallback coordination - waiting for additional signals',
        confidence: 0.2,
        nextSteps: ['Monitor workflow state', 'Gather more context'],
        provider: 'ollama',
      };
    }
  }

  /**
   * Safety validation using parallel reasoning
   */
  async validateSafety(taskDescription: string, context?: string) {
    const prompt = `Assess the safety of this task and its context:

TASK: ${taskDescription}

${context ? `CONTEXT:\n${context}` : ''}

Check for potential safety issues, constraints, and policy violations.`;

    try {
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
      throw new Error('No JSON found in response');
    } catch (error) {
      throw new OrchestrationError(
        'TASK_DECOMPOSITION_PARSE_ERROR',
        `Failed to parse task decomposition: ${(error as Error).message}`,
      );
    }
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
    try {
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonRegex.exec(content);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      throw new OrchestrationError(
        'CODE_ORCHESTRATION_PARSE_ERROR',
        `Failed to parse code orchestration response: ${(error as Error).message}`,
      );
    }
  }

  private parseAgentSelection(content: string, agents: any[]) {
    // Simple parsing - in production, use more robust methods
    const agentMention = agents.find((a) => content.includes(a.id));

    return {
      agentId: agentMention?.id || agents[0]?.id || 'default',
      reasoning: content,
      confidence: 0.7,
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
}
