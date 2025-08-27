/**
 * @fileoverview SimLab runner - orchestrates user simulation, agent execution, and judging
 * @version 1.0.0
 * @author Cortex-OS Team
 */

import type { SimScenario, SimResult, SimBatchResult, SimTurn } from './types';
import { UserSimulator } from './user-sim';
import { AgentAdapter } from './agent-adapter';
import { Judge } from './judge';
import { SimReporter } from './report';

export interface SimRunnerConfig {
  deterministic?: boolean;
  seed?: number;
  maxTurns?: number;
  timeout?: number;
  debug?: boolean;
}

export class SimRunner {
  private readonly userSim: UserSimulator;
  private readonly agentAdapter: AgentAdapter;
  private readonly judge: Judge;
  private readonly reporter: SimReporter;
  private readonly config: SimRunnerConfig;

  constructor(config: SimRunnerConfig = {}) {
    this.config = {
      deterministic: true,
      maxTurns: 10,
      timeout: 30000,
      debug: false,
  ...config,
    };

    this.userSim = new UserSimulator(this.config);
    this.agentAdapter = new AgentAdapter();
    this.judge = new Judge();
    this.reporter = new SimReporter();
  }

  /**
   * Run a single simulation scenario
   */
  async runScenario(scenario: SimScenario): Promise<SimResult> {
    const runId = this.generateRunId(scenario.id);
  const startTime = Date.now();

    try {
      // Initialize conversation with user simulation
      const initialMessage = await this.userSim.generateInitialMessage(scenario);
      
  const turns: SimTurn[] = [
        {
          role: 'user' as const,
          content: initialMessage,
          timestamp: new Date().toISOString(),
        },
      ];

      // Conversation loop
      let turnCount = 0;
      let lastResponse = initialMessage;

      while (turnCount < (this.config.maxTurns || 10)) {
        // Agent responds via PRP
        const agentResponse = await this.agentAdapter.execute({
          scenario,
          conversationHistory: turns,
          userMessage: lastResponse,
        });

        turns.push({
          role: 'agent' as const,
          content: agentResponse.content,
          timestamp: new Date().toISOString(),
        });

        // Check if conversation should end
        if (this.shouldEndConversation(agentResponse, scenario)) {
          break;
        }

        // User simulator responds
        const userResponse = await this.userSim.generateResponse(
          scenario,
          turns,
          agentResponse.content,
        );

        if (!userResponse) {
          break; // User simulation indicates conversation end
        }

        turns.push({
          role: 'user' as const,
          content: userResponse,
          timestamp: new Date().toISOString(),
        });

        lastResponse = userResponse;
        turnCount++;
      }

      // Judge the conversation
      const judged = await this.judge.evaluate(scenario, turns);
      const finalResult: SimResult = {
        scenarioId: judged.scenarioId,
        runId,
        passed: judged.passed,
        scores: judged.scores,
        judgeNotes: judged.judgeNotes,
        failures: judged.failures,
        turns: judged.turns,
        metadata: {
          duration: Date.now() - startTime,
          seed: this.config.seed,
          version: '1.0.0',
        },
        timestamp: new Date().toISOString(),
      };
      return finalResult;
    } catch (error) {
      return {
        scenarioId: scenario.id,
        runId,
        passed: false,
        scores: { goal: 0, sop: 0, brand: 0, factual: 0 },
        judgeNotes: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        failures: ['simulation_error'],
        turns: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Run multiple scenarios as a batch
   */
  async runBatch(scenarios: SimScenario[]): Promise<SimBatchResult> {
    const batchId = this.generateBatchId();
    const results: SimResult[] = [];

    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario);
      results.push(result);
    }

    return this.reporter.createBatchResult(batchId, results);
  }

  private shouldEndConversation(agentResponse: any, scenario: SimScenario): boolean {
    // Check if agent indicated completion
    if (agentResponse.completed || agentResponse.goalAchieved) {
      return true;
    }

    // Check if success criteria are met based on agent response
    return (scenario.success_criteria || []).some((criteria: string) =>
      agentResponse.content.toLowerCase().includes(criteria.toLowerCase()),
    );
  }

  private generateRunId(scenarioId: string): string {
    const timestamp = Date.now();
    const suffix = this.config.deterministic ? 'det' : 'rnd';
    return `${scenarioId}-${timestamp}-${suffix}`;
  }

  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
