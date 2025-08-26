/**
 * @file_path packages/mcp-server/src/ToolRegistry.ts
 * @description Tool registry for managing MCP tools
 */

import { randomUUID } from 'crypto';
import {
  ToolRegistry as IToolRegistry,
  Tool,
  ToolExecutionContext,
  ToolExecutionResult,
} from './tool.js';

export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private executionHistory: ToolExecutionResult[] = [];

  constructor() {}

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name "${tool.name}" is already registered`);
    }

    // Validate tool
    this.validateTool(tool);

    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    const removed = this.tools.delete(name);
    return removed;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  async execute(
    name: string,
    args: unknown,
    contextData?: Partial<ToolExecutionContext>,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const executionId = randomUUID();

    const context: ToolExecutionContext = {
      tool_name: name,
      execution_id: executionId,
      timestamp: new Date(),
      ...contextData,
    };

    try {
      const tool = this.get(name);
      if (!tool) {
        throw new Error(`Tool "${name}" not found`);
      }

      const result = await tool.run(args as never);
      const execution_time_ms = Math.max(1, Date.now() - startTime + 1);

      const executionResult: ToolExecutionResult = {
        success: true,
        result,
        execution_time_ms,
        context,
      };

      this.executionHistory.push(executionResult);
      return executionResult;
    } catch (error) {
      const execution_time_ms = Math.max(1, Date.now() - startTime + 1);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      const executionResult: ToolExecutionResult = {
        success: false,
        error: errorMessage,
        execution_time_ms,
        context,
      };

      this.executionHistory.push(executionResult);
      return executionResult;
    }
  }

  private validateTool(tool: Tool): void {
    if (!tool.name || typeof tool.name !== 'string' || tool.name.trim().length === 0) {
      throw new Error('Tool must have a non-empty name');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error('Tool must have a description');
    }

    if (typeof tool.run !== 'function') {
      throw new Error('Tool must have a run method');
    }

    // Validate name format (alphanumeric, underscore, hyphen only)
    const validNamePattern = /^[a-zA-Z0-9_-]+$/;
    if (!validNamePattern.test(tool.name)) {
      throw new Error(
        'Tool name must contain only alphanumeric characters, underscores, and hyphens',
      );
    }
  }

  getExecutionHistory(toolName?: string, limit?: number): ToolExecutionResult[] {
    let history = this.executionHistory;

    if (toolName) {
      history = history.filter((result) => result.context.tool_name === toolName);
    }

    if (limit && limit > 0) {
      history = history.slice(-limit);
    }

    return history;
  }

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
  } {
    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter((r) => r.success).length;
    const averageExecutionTime =
      totalExecutions > 0
        ? this.executionHistory.reduce((sum, r) => sum + r.execution_time_ms, 0) / totalExecutions
        : 0;

    const toolStats = Array.from(this.tools.values()).map((tool) => {
      const toolExecutions = this.executionHistory.filter((r) => r.context.tool_name === tool.name);
      const successfulToolExecutions = toolExecutions.filter((r) => r.success).length;
      const avgToolExecutionTime =
        toolExecutions.length > 0
          ? toolExecutions.reduce((sum, r) => sum + r.execution_time_ms, 0) / toolExecutions.length
          : 0;

      return {
        name: tool.name,
        executions: toolExecutions.length,
        success_rate:
          toolExecutions.length > 0 ? successfulToolExecutions / toolExecutions.length : 1,
        avg_execution_time: avgToolExecutionTime,
      };
    });

    return {
      total_tools: this.tools.size,
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      failed_executions: totalExecutions - successfulExecutions,
      average_execution_time: averageExecutionTime,
      tools: toolStats,
    };
  }

  clearHistory(): void {
    this.executionHistory = [];
  }

  exportRegistry(): {
    tools: Array<{ name: string; description: string }>;
    timestamp: string;
    total_tools: number;
  } {
    return {
      tools: Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
      timestamp: new Date().toISOString(),
      total_tools: this.tools.size,
    };
  }

  importTools(tools: Tool[]): {
    success: number;
    failed: Array<{ tool: string; error: string }>;
  } {
    let successCount = 0;
    const succeeded: Tool[] = [];
    const invalids: Array<{ tool: string; error: string }> = [];

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      try {
        // Validate tool first (may throw)
        this.validateTool(tool);

        // Skip duplicates silently (do not count as success or failure)
        if (this.tools.has(tool.name)) {
          continue;
        }

        // Register valid and non-duplicate tools
        this.tools.set(tool.name, tool);
        succeeded.push(tool);
        successCount++;
      } catch (error) {
        invalids.push({
          tool: (tool as unknown as { name?: string })?.name ?? '',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const failed: Array<{ tool: string; error: string }> = [];
    if (invalids.length > 0 && succeeded.length > 0) {
      for (const t of succeeded) {
        this.tools.delete(t.name);
        failed.push({
          tool: t.name,
          error: 'Rolled back due to batch import errors',
        });
      }
    }

    // Append invalids after rolled-back successes to preserve expected ordering
    failed.push(...invalids);

    return { success: successCount, failed };
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
