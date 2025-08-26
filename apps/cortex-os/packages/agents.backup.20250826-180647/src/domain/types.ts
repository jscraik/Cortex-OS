export type UUID = string;

export interface Budget {
  wallClockMs: number;
  maxSteps: number;
  tokens?: number;
  costUSD?: number;
}

export interface Task {
  id: UUID;
  kind: "qa" | "rag" | "code" | "exec" | "custom";
  input: unknown;
  tags?: string[];
  budget: Budget;
  ctx?: Record<string, unknown>;
}

export interface AgentSpec {
  id: string;
  version: string;
  capabilities: string[];
  inputs: string;
  outputs: string;
  policies?: string[];
}

export interface Result {
  taskId: UUID;
  ok: boolean;
  output?: unknown;
  error?: { code: string; message: string };
  evidence?: { uri: string; pointer?: string }[];
  usage?: { steps: number; tokens?: number; costUSD?: number; durationMs: number };
}

