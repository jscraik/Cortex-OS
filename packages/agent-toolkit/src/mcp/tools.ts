import type {
	AgentToolkitCodemapInput,
	AgentToolkitResult,
	AgentToolkitSearchInput,
} from '@cortex-os/contracts';
import { createAgentToolkit } from '../index.js';

// Input type definitions for the tools
interface CodemodInput {
	find: string;
	replace: string;
	path: string;
}

interface ValidationInput {
	files: string[];
}

// Simple MCP tool types for future integration
export interface JsonSchema {
	type: string;
	properties?: Record<string, JsonSchema | { type: string; description?: string }>;
	required?: string[];
	items?: JsonSchema;
	description?: string;
	default?: unknown;
}

export interface SimpleMcpTool {
	name: string;
	description: string;
	inputSchema: JsonSchema;
	handler: (input: Record<string, unknown>) => Promise<{
		content: Array<{ type: 'text'; text: string }>;
		isError?: boolean;
	}>;
}

const hasResultError = (result: AgentToolkitResult): boolean =>
	'error' in result && typeof (result as { error?: string }).error === 'string'
		? Boolean((result as { error?: string }).error)
		: false;

/**
 * Search tool for MCP integration
 */
export const createSearchTool = (): SimpleMcpTool => ({
	name: 'agent_toolkit_search',
	description: 'Search for patterns in code using ripgrep',
	inputSchema: {
		type: 'object',
		properties: {
			pattern: { type: 'string', description: 'Search pattern' },
			path: { type: 'string', description: 'Path to search in' },
		},
		required: ['pattern', 'path'],
	},
	handler: async (input: Record<string, unknown>) => {
		const searchInput = input as AgentToolkitSearchInput;
		const toolkit = createAgentToolkit();
		const result = await toolkit.search(searchInput.pattern as string, searchInput.path as string);

		return {
			content: [
				{
					type: 'text' as const,
					text: JSON.stringify(result, null, 2),
				},
			],
			isError: hasResultError(result),
		};
	},
});

/**
 * Multi-search tool for MCP integration
 */
export const createMultiSearchTool = (): SimpleMcpTool => ({
	name: 'agent_toolkit_multi_search',
	description: 'Search using multiple tools (ripgrep, semgrep, ast-grep)',
	inputSchema: {
		type: 'object',
		properties: {
			pattern: { type: 'string', description: 'Search pattern' },
			path: { type: 'string', description: 'Path to search in' },
		},
		required: ['pattern', 'path'],
	},
	handler: async (input: Record<string, unknown>) => {
		const searchInput = input as AgentToolkitSearchInput;
		const toolkit = createAgentToolkit();
		const result = await toolkit.multiSearch(
			searchInput.pattern as string,
			searchInput.path as string,
		);
		return {
			content: [
				{
					type: 'text' as const,
					text: JSON.stringify(result, null, 2),
				},
			],
		};
	},
});

/**
 * Codemod tool for MCP integration
 */
export const createCodemodTool = (): SimpleMcpTool => ({
	name: 'agent_toolkit_codemod',
	description: 'Perform structural code modifications using Comby',
	inputSchema: {
		type: 'object',
		properties: {
			find: { type: 'string', description: 'Pattern to find' },
			replace: { type: 'string', description: 'Pattern to replace with' },
			path: { type: 'string', description: 'Path to modify' },
		},
		required: ['find', 'replace', 'path'],
	},
	handler: async (input: Record<string, unknown>) => {
		const toolkit = createAgentToolkit();
		const codemodInput = input as unknown as CodemodInput;
		const result = await toolkit.codemod(
			codemodInput.find,
			codemodInput.replace,
			codemodInput.path,
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: JSON.stringify(result, null, 2),
				},
			],
			isError: hasResultError(result),
		};
	},
});

/**
 * Validation tool for MCP integration
 */
export const createValidationTool = (): SimpleMcpTool => ({
	name: 'agent_toolkit_validate',
	description: 'Validate code quality using appropriate linters',
	inputSchema: {
		type: 'object',
		properties: {
			files: {
				type: 'array',
				items: { type: 'string' },
				description: 'Files to validate',
			},
		},
		required: ['files'],
	},
	handler: async (input: Record<string, unknown>) => {
		const toolkit = createAgentToolkit();
		const validationInput = input as unknown as ValidationInput;
		const result = await toolkit.validate(validationInput.files);

		return {
			content: [
				{
					type: 'text' as const,
					text: JSON.stringify(result, null, 2),
				},
			],
			isError: hasResultError(result),
		};
	},
});

/**
 * Factory function to create all agent toolkit MCP tools
 */
export function createAgentToolkitMcpTools(): SimpleMcpTool[] {
	return [
		createSearchTool(),
		createMultiSearchTool(),
		createCodemodTool(),
		createValidationTool(),
		createCodemapTool(),
	];
}

export const createCodemapTool = (): SimpleMcpTool => ({
	name: 'agent_toolkit_codemap',
	description: 'Generate repository codemap artifacts via agent toolkit',
	inputSchema: {
		type: 'object',
		properties: {
			repoPath: { type: 'string', description: 'Repository root path', default: '.' },
			scope: {
				type: 'string',
				description: "Scope specifier (repo|package:<name>|app:<name>|path:<relative>)",
				default: 'repo',
			},
			sinceDays: {
				type: 'number',
				description: 'Hotspot window in days',
			},
			sections: {
				type: 'array',
				description: 'Comma separated sections to include',
				items: { type: 'string' },
			},
			tools: {
				type: 'array',
				description: 'Optional tools to enable (e.g., lizard, madge)',
				items: { type: 'string' },
			},
			jsonOut: {
				type: 'string',
				description: 'Optional JSON output file path',
			},
			markdownOut: {
				type: 'string',
				description: 'Optional Markdown output file path',
			},
		},
		required: ['repoPath'],
	},
	handler: async (input: Record<string, unknown>) => {
		const codemapInput = input as AgentToolkitCodemapInput;
		const toolkit = createAgentToolkit();
		const result = await toolkit.generateCodemap(codemapInput);

		return {
			content: [
				{
					type: 'text' as const,
					text: JSON.stringify(result, null, 2),
				},
			],
			isError: hasResultError(result),
		};
	},
});
