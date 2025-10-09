export type Subagent = {
	config: SubagentConfig;
};
export type SubagentConfig = {
	name: string;
	description?: string;
	tool?: {
		name: string;
		description: string;
		schema: unknown;
		call: (
			input: unknown,
			ctx: {
				caller: string;
				depth: number;
			},
		) => Promise<{
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
		call: (
			input: unknown,
			ctx: {
				caller: string;
				depth: number;
			},
		) => Promise<{
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
export type LoadedSubagents = {
	manager: unknown;
	subagents: Map<string, Subagent>;
};
export type SubagentToolsOptions = Record<string, unknown>;
export type Tool = {
	name: string;
	description: string;
	schema: unknown;
	call: (
		input: unknown,
		ctx: {
			caller: string;
			depth: number;
		},
	) => Promise<{
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
export declare const materializeSubagentTool: (config: SubagentConfig, subagent: Subagent) => Tool;
export declare const createAutoDelegateTool: (
	subagents: Map<string, Subagent>,
	select?: (task: string, k: number) => Promise<SubagentConfig[]>,
) => Tool;
export declare const subagentTools: (
	subagents: Map<string, Subagent>,
	options?: SubagentToolsOptions,
) => SubagentToolBinding[];
export declare const loadSubagents: (options?: LoadSubagentsOptions) => Promise<LoadedSubagents>;
