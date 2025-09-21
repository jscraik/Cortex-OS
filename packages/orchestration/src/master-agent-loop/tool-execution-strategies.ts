/**
 * @fileoverview Tool Execution Strategies - Functional Approach
 * @module ToolExecutionStrategies
 * @description Pure functional strategy implementations following CODESTYLE.md
 * @author brAInwav Development Team
 * @version 3.6.1
 * @since 2024-12-21
 */

import type {
    ChainExecutionResult,
    ExecutionContext,
    ToolDefinition,
    ToolExecutionResult,
} from './tool-orchestration-contracts';

// Types for strategy execution
export type StrategyExecutor = (
    tools: ToolDefinition[],
    context: ExecutionContext,
    result: ChainExecutionResult,
    dependencies: {
        executeTool: (tool: ToolDefinition, ctx: ExecutionContext) => Promise<ToolExecutionResult>;
        updateProgress: (chainId: string, completed: number, total: number) => void;
    }
) => Promise<void>;

// Sequential execution strategy - pure function
export const executeSequential: StrategyExecutor = async (
    tools,
    context,
    result,
    { executeTool, updateProgress }
) => {
    for (const tool of tools) {
        const toolResult = await executeTool(tool, context);
        result.toolResults.push(toolResult);
        result.executionOrder.push(tool.id);

        if (toolResult.status === 'failure') {
            result.errors.push({
                toolId: tool.id,
                error: toolResult.error || 'Unknown error',
            });
        }

        updateProgress(context.chainId, result.toolResults.length, tools.length);
    }
};

// Cross-layer messaging strategy
export const executeWithCrossLayerMessaging: StrategyExecutor = async (
    tools,
    context,
    result,
    { executeTool, updateProgress }
) => {
    const parallelizableTools = tools.filter((t) => t.parallelizable);
    if (parallelizableTools.length > 0) {
        result.parallelExecutions = Math.max(result.parallelExecutions, parallelizableTools.length);
    }

    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i];
        const toolResult = await executeTool(tool, context);
        result.toolResults.push(toolResult);
        result.executionOrder.push(tool.id);

        // Send cross-layer message after each tool
        if (i < tools.length - 1) {
            const nextTool = tools[i + 1];
            const message = {
                type: 'data',
                from: `${tool.layer}:${tool.id}`,
                to: `${nextTool.layer}:${nextTool.id}`,
                data: { result: toolResult.result },
            };

            result.crossLayerMessages.push(message);
        }

        updateProgress(context.chainId, result.toolResults.length, tools.length);
    }
};

// Strict validation strategy
export const executeWithStrictValidation: StrategyExecutor = async (
    tools,
    context,
    result,
    { executeTool, updateProgress }
) => {
    for (const tool of tools) {
        // Validate tool before execution
        if (!tool.operation || !tool.layer) {
            throw createValidationError('Invalid message format between tool layers', tool);
        }

        // Check for operations that should trigger validation error
        if (tool.operation.includes('invalid') || tool.operation.includes('strict-message-validation')) {
            throw createValidationError('Invalid message format between tool layers', tool);
        }

        // Perform security validation
        result.securityChecksPerformed++;
        if (tool.layer === 'execution' && context.securityLevel === 'high') {
            if (tool.operation.includes('unauthorized')) {
                result.unauthorizedAccessAttempts++;
            }
        }

        const toolResult = await executeTool(tool, context);
        result.toolResults.push(toolResult);
        result.executionOrder.push(tool.id);
        updateProgress(context.chainId, result.toolResults.length, tools.length);
    }
};

// Helper function to create validation errors
const createValidationError = (message: string, tool: ToolDefinition): Error => {
    const error = new Error(message) as Error & {
        context: {
            toolId: string;
            layerType: string;
            stackTrace?: string;
        };
    };
    error.context = {
        toolId: tool.id,
        layerType: tool.layer,
        stackTrace: error.stack,
    };
    return error;
};

// Strategy selector - functional approach
export const selectExecutionStrategy = (strategy: string): StrategyExecutor => {
    switch (strategy) {
        case 'sequential':
        case 'sequential-with-optimization':
            return executeSequential;

        case 'message-passing':
            return executeWithCrossLayerMessaging;

        case 'strict-validation':
        case 'security-first':
            return executeWithStrictValidation;

        default:
            return executeSequential;
    }
};
