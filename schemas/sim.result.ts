/**
 * @fileoverview Simulation result schema for SimLab
 * @version 1.0.0
 * @author Cortex-OS Team
 */

export interface SimTurn {
  role: 'user' | 'agent' | 'tool';
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface SimScores {
  goal: number; // 0-1: How well the goal was achieved
  sop: number; // 0-1: Adherence to SOPs
  brand: number; // 0-1: Brand consistency
  factual: number; // 0-1: Factual accuracy
}

export interface SimResult {
  scenarioId: string;
  runId: string;
  passed: boolean;
  scores: SimScores;
  judgeNotes: string;
  failures: string[];
  turns: SimTurn[];
  metadata?: {
    duration?: number;
    modelParams?: Record<string, unknown>;
    seed?: number;
    version?: string;
  };
  timestamp: string;
}

export interface SimBatchResult {
  batchId: string;
  scenarios: SimResult[];
  summary: {
    totalScenarios: number;
    passed: number;
    failed: number;
    passRate: number;
    avgScores: SimScores;
  };
  timestamp: string;
}

export interface SimReport {
  batchResults: SimBatchResult[];
  overall: {
    passRate: number;
    criticalFailures: number;
    trends: Record<string, number>;
  };
  thresholds: {
    minPassRate: number;
    maxP0Failures: number;
  };
  generatedAt: string;
}
