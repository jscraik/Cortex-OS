import type {
	CodemodTool,
	SearchTool,
	ToolRegistry,
	ValidationTool,
} from '../domain/ToolInterfaces.js';

/**
 * Default implementation of the ToolRegistry
 */
export class DefaultToolRegistry implements ToolRegistry {
	private readonly searchTools = new Map<string, SearchTool>();
	private readonly codemodTools = new Map<string, CodemodTool>();
	private readonly validationTools = new Map<string, ValidationTool>();

	registerSearchTool(name: string, tool: SearchTool): void {
		this.searchTools.set(name, tool);
	}

	registerCodemodTool(name: string, tool: CodemodTool): void {
		this.codemodTools.set(name, tool);
	}

	registerValidationTool(name: string, tool: ValidationTool): void {
		this.validationTools.set(name, tool);
	}

	getSearchTool(name: string): SearchTool | undefined {
		return this.searchTools.get(name);
	}

	getCodemodTool(name: string): CodemodTool | undefined {
		return this.codemodTools.get(name);
	}

	getValidationTool(name: string): ValidationTool | undefined {
		return this.validationTools.get(name);
	}

	listTools(): {
		search: string[];
		codemod: string[];
		validation: string[];
	} {
		return {
			search: Array.from(this.searchTools.keys()),
			codemod: Array.from(this.codemodTools.keys()),
			validation: Array.from(this.validationTools.keys()),
		};
	}
}
