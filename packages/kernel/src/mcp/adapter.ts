/**
 * @file mcp/adapter.ts
 * @description MCP Adapter for Cortex Kernel Integration
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { runCommand } from "../lib/run-command.js";
import type { PRPState } from "../state.js";
import { generateId } from "../utils/id.js";

// Neuron interface definition
interface Neuron {
	id: string;
	role: string;
	phase: "strategy" | "build" | "evaluation";
	dependencies: string[];
	tools: string[];
	requiresLLM?: boolean;
	execute(
		state: PRPState,
		context: Record<string, unknown>,
	): Promise<NeuronResult>;
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
export class MCPAdapter {
	private tools: Map<string, MCPTool> = new Map();
	private contexts: Map<string, MCPContext> = new Map();

	/**
	 * Register MCP tool for kernel integration
	 */
	registerTool(tool: MCPTool): void {
		this.tools.set(tool.name, tool);
	}

	/**
	 * Create MCP context for PRP execution
	 */
	createContext(
		prpState: PRPState,
		options: {
			workingDirectory?: string;
			enabledTools?: string[];
			securityPolicy?: Partial<MCPContext["securityPolicy"]>;
		} = {},
	): MCPContext {
		const context: MCPContext = {
			prpState,
			workingDirectory: options.workingDirectory || process.cwd(),
			toolsEnabled: options.enabledTools || Array.from(this.tools.keys()),
			securityPolicy: {
				allowFileSystem: true,
				allowNetwork: false,
				allowExecution: true,
				...options.securityPolicy,
			},
		};

		this.contexts.set(prpState.runId, context);
		return context;
	}

	/**
	 * Execute MCP tool within kernel context
	 */
	async executeTool<Params extends Record<string, unknown>, Result = unknown>(
		toolName: string,
		params: Params,
		runId: string,
	): Promise<{
		result: Result;
		evidence: {
			toolName: string;
			params: Params;
			result: Result;
			timestamp: string;
		};
	}> {
		const tool = this.tools.get(toolName);
		if (!tool) {
			throw new Error(`MCP tool not found: ${toolName}`);
		}

		const context = this.contexts.get(runId);
		if (!context) {
			throw new Error(`MCP context not found for run: ${runId}`);
		}

		if (!context.toolsEnabled.includes(toolName)) {
			throw new Error(`MCP tool not enabled: ${toolName}`);
		}

		try {
			const result = await tool.execute(params, context);

			const evidence = {
				toolName,
				params,
				result,
				timestamp: new Date().toISOString(),
			};

			return { result, evidence };
		} catch (error) {
			throw new Error(
				`MCP tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Convert MCP tools to kernel-compatible neurons
	 */
	createNeuronFromTool(
		tool: MCPTool,
		phase: "strategy" | "build" | "evaluation",
	): Neuron {
		return {
			id: `mcp-${tool.name}`,
			role: `mcp-tool-${tool.name}`,
			phase,
			dependencies: [],
			tools: [tool.name],
			requiresLLM: false,

			execute: async (state: PRPState, context: Record<string, unknown>) => {
				const _mcpContext = this.createContext(state, {
					workingDirectory: context.workingDirectory,
				});

				// Extract parameters from blueprint for tool execution
				const params = this.extractToolParams(state.blueprint, tool);
				const execution = await this.executeTool(
					tool.name,
					params,
					state.runId,
				);

				const metrics: ExecutionMetrics = {
					startTime: new Date().toISOString(),
					endTime: new Date().toISOString(),
					duration: 0,
					toolsUsed: [tool.name],
					filesCreated: 0,
					filesModified: 0,
					commandsExecuted: 1,
				};

				const result: NeuronResult = {
					output: {
						toolName: tool.name,
						result: execution.result,
						mcpIntegration: true,
					},
					evidence: [
						{
							id: generateId(`mcp-${tool.name}`, state.metadata.deterministic),
							type: "command",
							source: `mcp-${tool.name}`,
							content: JSON.stringify(execution.evidence),
							timestamp: new Date().toISOString(),
							phase,
						},
					],
					nextSteps: [`Review ${tool.name} output`],
					artifacts: [],
					metrics,
				};

				return result;
			},
		};
	}

	/**
	 * Extract tool parameters from blueprint
	 */
	private extractToolParams(
		blueprint: PRPState["blueprint"],
		tool: MCPTool,
	): Record<string, unknown> {
		// Simple parameter extraction - in real implementation would be more sophisticated
		return {
			title: blueprint.title,
			description: blueprint.description,
			requirements: blueprint.requirements,
			toolName: tool.name,
		};
	}

	/**
	 * Get available tools
	 */
	getAvailableTools(): MCPTool[] {
		return Array.from(this.tools.values());
	}

	/**
	 * Get context for run
	 */
	getContext(runId: string): MCPContext | undefined {
		return this.contexts.get(runId);
	}

	/**
	 * Cleanup context after PRP completion
	 */
	cleanupContext(runId: string): void {
		this.contexts.delete(runId);
	}
}

/**
 * Default MCP tools for Cortex Kernel
 */
export const createDefaultMCPTools = (): MCPTool[] => [
	{
		name: "file_read",
		description: "Read file contents for analysis",
		inputSchema: {
			type: "object",
			properties: { path: { type: "string" } },
			required: ["path"],
		},
		execute: async (params, context) => {
			if (!context.securityPolicy.allowFileSystem) {
				throw new Error("File system access not allowed");
			}
			const { path: targetPath } = z.object({ path: z.string() }).parse(params);
			const abs = path.isAbsolute(targetPath)
				? targetPath
				: path.join(context.workingDirectory, targetPath);
			const content = await fs.readFile(abs, "utf-8");
			return { path: abs, content };
		},
	},
	{
		name: "code_analysis",
		description: "Analyze code quality using ESLint",
		inputSchema: {
			type: "object",
			properties: { file: { type: "string" } },
			required: ["file"],
		},
		execute: async (params, context) => {
			if (!context.securityPolicy.allowExecution) {
				throw new Error("Code execution not allowed");
			}
			const { file } = z.object({ file: z.string() }).parse(params);
			const abs = path.isAbsolute(file)
				? file
				: path.join(context.workingDirectory, file);
                        const { stdout } = await runCommand(
                                `npx eslint "${abs}" -f json`,
                                {
                                        cwd: context.workingDirectory,
                                },
                        );
			const parsed = JSON.parse(stdout);
			if (!Array.isArray(parsed) || parsed.length === 0) {
				throw new Error("ESLint did not return a valid report for the file.");
			}
			const [report] = parsed;
			return { file: abs, report };
		},
	},
	{
		name: "test_runner",
		description: "Execute tests using a shell command",
		inputSchema: {
			type: "object",
			properties: { command: { type: "string" } },
			required: ["command"],
		},
		execute: async (params, context) => {
			if (!context.securityPolicy.allowExecution) {
				throw new Error("Code execution not allowed");
			}
			const { command } = z.object({ command: z.string() }).parse(params);
			// Whitelist of allowed test commands
			const allowedCommands = [
				"npm test",
				"yarn test",
				"pnpm test",
				"npx jest",
				"npx mocha",
				"npx vitest",
			];
			// Only allow exact matches to the whitelist
			if (!allowedCommands.includes(command.trim())) {
				throw new Error(
					`Command "${command}" is not allowed. Allowed commands: ${allowedCommands.join(", ")}`,
				);
			}
			const { stdout, stderr } = await runCommand(command, {
				cwd: context.workingDirectory,
			});
			return { stdout, stderr };
		},
	},
];
