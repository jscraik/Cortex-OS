/**
 * @file_path packages/mcp-server/src/tool.ts
 * @description Shared interfaces for MCP tools and registry
 */

export interface Tool {
  name: string;
  description: string;
  run(args: unknown): Promise<unknown>;
}

export interface ToolExecutionContext {
  tool_name: string;
  execution_id: string;
  timestamp: Date;
  [key: string]: unknown;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  execution_time_ms: number;
  context: ToolExecutionContext;
}

export interface ToolRegistry {
  register(tool: Tool): void;
  unregister(name: string): boolean;
  get(name: string): Tool | undefined;
  list(): Tool[];
  execute(
    name: string,
    args: unknown,
    contextData?: Partial<ToolExecutionContext>,
  ): Promise<ToolExecutionResult>;
  getExecutionHistory(toolName?: string, limit?: number): ToolExecutionResult[];
  getStats(): {
    total_tools: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    average_execution_time: number;
    tools: Array<{
      name: string;
      executions: number;
      success_rate: number;
      avg_execution_time: number;
    }>;
  };
  clearHistory(): void;
  exportRegistry(): {
    tools: Array<{ name: string; description: string }>;
    timestamp: string;
    total_tools: number;
  };
  importTools(
    tools: Tool[],
  ): { success: number; failed: Array<{ tool: string; error: string }> };
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
