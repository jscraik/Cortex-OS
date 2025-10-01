// brAInwav agent contracts – interfaces/types used by orchestration without importing implementations

// Minimal subset required by orchestration:
export type Subagent = {
  config: SubagentConfig;
};

export type SubagentConfig = {
  name: string;
  description?: string;
  // Tool surface exposed by the subagent
  tool?: {
    name: string;
    description: string;
    // zod-like runtime schema type; use unknown to avoid pulling zod here
    schema: unknown;
    call: (input: unknown, ctx: { caller: string; depth: number }) => Promise<{
      success: boolean;
      text?: string;
      error?: string;
      traceId?: string;
      metrics?: Record<string, unknown>;
    }>;
  };
};


export type SubagentToolBinding = {
  tool: {
    name: string;
    description: string;
    schema: unknown;
    call: (input: unknown, ctx: { caller: string; depth: number }) => Promise<{
      success: boolean;
      text?: string;
      error?: string;
      traceId?: string;
      metrics?: Record<string, unknown>;
    }>;
  };
  metadata?: Record<string, unknown>;
};

export type LoadSubagentsOptions = Record<string, unknown>;
export type LoadedSubagents = { manager: unknown; subagents: Map<string, Subagent> };

// Factory function interfaces (orchestration expects these signatures)
export type SubagentToolsOptions = Record<string, unknown>;

export type Tool = {
  name: string;
  description: string;
  schema: unknown;
  call: (input: unknown, ctx: { caller: string; depth: number }) => Promise<{
    success: boolean;
    text?: string;
    error?: string;
    traceId?: string;
    metrics?: Record<string, unknown>;
  }>;
};

export type ToolResponse = {
  success: boolean;
  text?: string;
  error?: string;
  traceId?: string;
  metrics?: Record<string, unknown>;
};

// Placeholder declarations so orchestration can import types.
// Implementations live in @cortex-os/agents.
export const materializeSubagentTool: (config: SubagentConfig, subagent: Subagent) => Tool =
  (() => {
    throw new Error(
      'This is a contract-only placeholder. Use implementations from @cortex-os/agents at runtime.'
    );
  }) as unknown as (config: SubagentConfig, subagent: Subagent) => Tool;

export const createAutoDelegateTool: (
  subagents: Map<string, Subagent>,
  select?: (task: string, k: number) => Promise<SubagentConfig[]>
) => Tool = (() => {
  throw new Error(
    'This is a contract-only placeholder. Use implementations from @cortex-os/agents at runtime.'
  );
}) as unknown as (
  subagents: Map<string, Subagent>,
  select?: (task: string, k: number) => Promise<SubagentConfig[]>
) => Tool;

export const subagentTools: (
  subagents: Map<string, Subagent>,
  options?: SubagentToolsOptions
) => SubagentToolBinding[] = (() => {
  throw new Error(
    'This is a contract-only placeholder. Use implementations from @cortex-os/agents at runtime.'
  );
}) as unknown as (
  subagents: Map<string, Subagent>,
  options?: SubagentToolsOptions
) => SubagentToolBinding[];

export const loadSubagents: (
  options?: LoadSubagentsOptions
) => Promise<LoadedSubagents> = (async () => {
  throw new Error(
    'This is a contract-only placeholder. Use implementations from @cortex-os/agents at runtime.'
  );
}) as unknown as (options?: LoadSubagentsOptions) => Promise<LoadedSubagents>;
