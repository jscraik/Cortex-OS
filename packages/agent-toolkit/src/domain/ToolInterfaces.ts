import type {
	AgentToolkitCodemodInput,
	AgentToolkitCodemodResult,
	AgentToolkitSearchInput,
	AgentToolkitSearchResult,
	AgentToolkitValidationInput,
	AgentToolkitValidationResult,
} from '@cortex-os/contracts';

/**
 * Search tool interface for code search operations
 */
export interface SearchTool {
	search(inputs: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult>;
}

/**
 * Code modification tool interface
 */
export interface CodemodTool {
	rewrite(inputs: AgentToolkitCodemodInput): Promise<AgentToolkitCodemodResult>;
}

/**
 * Validation tool interface for code quality checks
 */
export interface ValidationTool {
	validate(inputs: AgentToolkitValidationInput): Promise<AgentToolkitValidationResult>;
}

/**
 * Tool registry for managing available tools
 */
export interface ToolRegistry {
	registerSearchTool(name: string, tool: SearchTool): void;
	registerCodemodTool(name: string, tool: CodemodTool): void;
	registerValidationTool(name: string, tool: ValidationTool): void;

	getSearchTool(name: string): SearchTool | undefined;
	getCodemodTool(name: string): CodemodTool | undefined;
	getValidationTool(name: string): ValidationTool | undefined;

	listTools(): {
		search: string[];
		codemod: string[];
		validation: string[];
	};
}
