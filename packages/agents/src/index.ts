// Basic agent types for orchestration integration
export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
}

export interface Executor {
  run(agent: Agent, task: {
    id: string;
    kind: string;
    input: unknown;
    budget: { wallClockMs: number; maxSteps: number };
  }): Promise<unknown>;
}

// Minimal implementation for orchestration compatibility
export class BasicExecutor implements Executor {
  async run(agent: Agent, task: { id: string; kind: string; input: unknown; budget: { wallClockMs: number; maxSteps: number } }): Promise<unknown> {
    try {
      const agentId = agent?.id || 'unknown-agent';
      const taskId = task?.id || 'unknown-task';
      const taskInput = task?.input;
      
      console.log(`Agent ${agentId} executing task ${taskId}:`, taskInput);
      return { status: 'completed', result: taskInput, agent: agentId };
    } catch (error) {
      return { 
        status: 'error', 
        result: null, 
        agent: agent?.id || 'unknown-agent',
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const createExecutor = (): Executor => new BasicExecutor();

// Export enhanced agents
export { CodeIntelligenceAgent } from './code-intelligence-agent.js';

// Export types from code intelligence agent
export type {
  UrgencyLevel,
  AnalysisType,
  SuggestionType,
  MaintainabilityLevel,
  RiskLevel,
  Priority,
  CodeAnalysisRequest,
  CodeAnalysisResult,
  CodeSuggestion,
  ComplexityAnalysis,
  SecurityAnalysis,
  SecurityVulnerability,
  PerformanceAnalysis,
  PerformanceBottleneck
} from './code-intelligence-agent.js';
