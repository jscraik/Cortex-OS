/**
 * @fileoverview Schema types for SimLab - copied locally to avoid rootDir issues
 * @version 1.0.0
 * @author Cortex-OS Team
 */

// SimScenario types (from schemas/sim.scenario.ts)
export interface SimPersona {
  locale: string;
  tone: string;
  tech_fluency: 'low' | 'med' | 'high';
  attributes?: {
    role?: string;
    experience_level?: string;
    urgency?: 'low' | 'medium' | 'high';
    preferred_communication?: string;
  };
}

export interface SimScenario {
  id: string;
  name: string;
  description: string;
  goal: string;
  persona: SimPersona;
  initial_context?: string;
  starter_message: string;
  max_turns: number;
  success_criteria: string[];
  metadata?: Record<string, unknown>;
}

// SimResult types (from schemas/sim.result.ts)
export interface SimTurn {
  role: 'user' | 'agent' | 'tool';
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface SimScores {
  goal: number;
  sop: number;
  brand: number;
  factual: number;
}

export interface SimResult {
  scenario_id: string;
  session_id: string;
  turns: SimTurn[];
  scores: SimScores;
  completion_status: 'success' | 'failure' | 'timeout' | 'error';
  metadata: {
    duration_ms: number;
    turn_count: number;
    errors?: string[];
    [key: string]: unknown;
  };
}

export interface SimBatchResult {
  batchId: string;
  scenarios: SimResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    avg_duration_ms: number;
    avg_scores: SimScores;
  };
  timestamp: string;
}

export interface SimReport {
  id: string;
  title: string;
  description: string;
  batches: SimBatchResult[];
  aggregated_stats: {
    total_scenarios: number;
    success_rate: number;
    avg_scores: SimScores;
    trend_analysis?: Record<string, unknown>;
  };
  generated_at: string;
}
