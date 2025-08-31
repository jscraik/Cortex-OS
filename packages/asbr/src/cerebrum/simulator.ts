/**
 * Cerebrum Simulator
 * Simulates plans to validate feasibility before execution
 */

import type { Config } from '../types/index.js';
import type { Plan } from './types.js';

export interface SimulationOptions {
  timeoutMs?: number;
  maxIterations?: number;
  validateTools?: boolean;
}

export interface SimulationGate {
  id: string;
  name: string;
  description: string;
  check: (plan: Plan) => Promise<{ passed: boolean; reason?: string }>;
}

export interface SimulationResult {
  success: boolean;
  gatesPassed: number;
  totalGates: number;
  durationMs: number;
  failures: Array<{
    gateId: string;
    reason: string;
  }>;
  warnings: string[];
  recommendation?: string;
}

/**
 * Simulator - Validates plans through simulation gates
 */
export class Simulator {
  private config: Config;
  private gates: SimulationGate[] = [];

  constructor(config: Config) {
    this.config = config;
    this.setupDefaultGates();
  }

  /**
   * Run simulation on a plan
   */
  async run(plan: Plan, options?: SimulationOptions): Promise<SimulationResult> {
    const startTime = Date.now();
    const failures: SimulationResult['failures'] = [];
    let gatesPassed = 0;

    // Run each gate
    for (const gate of this.gates) {
      try {
        const result = await gate.check(plan);
        if (result.passed) {
          gatesPassed++;
        } else {
          failures.push({
            gateId: gate.id,
            reason: result.reason || 'Unknown failure',
          });
        }
      } catch (error) {
        failures.push({
          gateId: gate.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const success = failures.length === 0;

    return {
      success,
      gatesPassed,
      totalGates: this.gates.length,
      durationMs,
      failures,
      warnings: this.generateWarnings(plan),
      recommendation: success ? 'Plan is ready for execution' : 'Plan requires modifications',
    };
  }

  /**
   * Add a custom simulation gate
   */
  addGate(gate: SimulationGate): void {
    this.gates.push(gate);
  }

  /**
   * Remove a simulation gate
   */
  removeGate(gateId: string): void {
    this.gates = this.gates.filter(gate => gate.id !== gateId);
  }

  private setupDefaultGates(): void {
    // Safety gate - checks for potentially dangerous operations
    this.gates.push({
      id: 'safety-check',
      name: 'Safety Check',
      description: 'Validates that the plan does not contain dangerous operations',
      check: async (plan: Plan) => {
        const dangerousKeywords = ['delete', 'rm -rf', 'format', 'wipe'];
        const planText = JSON.stringify(plan).toLowerCase();
        
        for (const keyword of dangerousKeywords) {
          if (planText.includes(keyword)) {
            return {
              passed: false,
              reason: `Plan contains potentially dangerous operation: ${keyword}`,
            };
          }
        }
        
        return { passed: true };
      },
    });

    // Resource gate - checks for required tools
    this.gates.push({
      id: 'resource-check',
      name: 'Resource Check',
      description: 'Validates that required tools are available',
      check: async (plan: Plan) => {
        // In a real implementation, this would check the tool registry
        // For now, we'll just pass
        return { passed: true };
      },
    });

    // Complexity gate - checks plan complexity
    this.gates.push({
      id: 'complexity-check',
      name: 'Complexity Check',
      description: 'Validates that the plan is not overly complex',
      check: async (plan: Plan) => {
        if (plan.steps.length > 50) {
          return {
            passed: false,
            reason: 'Plan has too many steps (over 50)',
          };
        }
        
        return { passed: true };
      },
    });
  }

  private generateWarnings(plan: Plan): string[] {
    const warnings: string[] = [];
    
    // Check for long-running plans
    if (plan.steps.length > 10) {
      warnings.push('Plan has many steps which may increase execution time');
    }
    
    return warnings;
  }
}