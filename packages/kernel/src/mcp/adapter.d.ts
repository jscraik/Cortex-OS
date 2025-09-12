/**
 * @file mcp/adapter.ts
 * @description MCP Adapter for Cortex Kernel Integration
 * @author Cortex-OS Team
 * @version 1.0.0
 */
import type { PRPState } from '../state.js';
interface Neuron {
    id: string;
    execute(state: ExecutionState, context: ExecutionContext): Promise<NeuronResult>;
}
interface ExecutionState {
    [key: string]: unknown;
}
interface ExecutionContext {
    input: unknown;
    workingDirectory?: unknown;
}
interface NeuronResult {
    output: unknown;
    evidence: Record<string, unknown>[];
    nextSteps: string[];
    artifacts: unknown[];
    metrics: ExecutionMetrics;
}
interface ExecutionMetrics {
    startTime: string;
    endTime: string;
    duration: number;
    toolsUsed: string[];
    filesCreated: number;
    filesModified: number;
    commandsExecuted: number;
}
/**
 * MCP Tool interface for kernel integration
 */
export interface MCPTool<Params = Record<string, unknown>, Result = unknown> {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute(params: Params, context: MCPContext): Promise<Result>;
}
/**
 * MCP Context for tool execution
 */
export interface MCPContext {
    prpState: PRPState;
    workingDirectory: string;
    toolsEnabled: string[];
    securityPolicy: {
        allowFileSystem: boolean;
        allowNetwork: boolean;
        allowExecution: boolean;
    };
}
/**
 * Cortex Kernel MCP Adapter
 *
 * Converts MCP tools into Cortex kernel nodes and integrates
 * them into the PRP workflow state machine.
 */
export declare class MCPAdapter {
    private readonly tools;
    private readonly contexts;
    /**
     * Register MCP tool for kernel integration
     */
    registerTool(tool: MCPTool): void;
    /**
     * Create MCP context for PRP execution
     */
    createContext(prpState: PRPState, options?: {
        workingDirectory?: string;
        enabledTools?: string[];
        securityPolicy?: Partial<MCPContext['securityPolicy']>;
    }): MCPContext;
    /**
     * Execute MCP tool within kernel context
     */
    executeTool<Params extends Record<string, unknown>, Result = unknown>(toolName: string, params: Params, runId: string): Promise<{
        result: Result;
        evidence: {
            toolName: string;
            params: Params;
            result: Result;
            timestamp: string;
        };
    }>;
    /**
     * Convert MCP tools to kernel-compatible neurons
     */
    createNeuronFromTool(tool: MCPTool, phase: 'strategy' | 'build' | 'evaluation'): Neuron;
    /**
     * Extract tool parameters from blueprint
     */
    private extractToolParams;
    /**
     * Get available tools
     */
    getAvailableTools(): MCPTool[];
    /**
     * Get context for run
     */
    getContext(runId: string): MCPContext | undefined;
    /**
     * Cleanup context after PRP completion
     */
    cleanupContext(runId: string): void;
}
/**
 * Default MCP tools for Cortex Kernel
 */
export declare const createDefaultMCPTools: () => MCPTool[];
export {};
//# sourceMappingURL=adapter.d.ts.map