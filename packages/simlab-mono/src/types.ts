/**
 * Local SimLab type declarations mirroring shared schemas.
 * Kept local to avoid TS rootDir/project boundary issues.
 */

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
  name?: string;
  description?: string;
  goal: string;
  persona: SimPersona;
  initial_context: Record<string, unknown>;
  sop_refs: string[];
  kb_refs: string[];
  success_criteria: string[];
  variants?: number;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  category?: string;
  tags?: string[];
  timeout_seconds?: number;
  is_critical?: boolean;
}
