import type {
	AgentToolkitSearchInput,
	AgentToolkitSearchResult,
} from '@cortex-os/contracts';
import {
	AgentToolkitSearchInputSchema,
	AgentToolkitSearchResultSchema,
} from '@cortex-os/contracts';
import type { SearchTool } from '../domain/ToolInterfaces.js';
import { ShellScriptAdapter } from './ShellScriptAdapter.js';

/**
 * Ripgrep search tool implementation
 */
export class RipgrepAdapter implements SearchTool {
	readonly tool = 'ripgrep' as const;
	readonly name = 'ripgrep_search';
	readonly description = 'Fast text search using ripgrep';
	readonly operation = 'search';

	private readonly adapter: ShellScriptAdapter;

	constructor() {
		this.adapter = new (class extends ShellScriptAdapter {
			constructor() {
				super('rg_search.sh');
			}
		})();
	}

	async search(input: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult> {
		const validatedInput = this.validateInput(input);

		await this.adapter.validateScript();

		const result = (await this.adapter.executeScript([
			validatedInput.pattern,
			validatedInput.path,
		])) as Record<string, unknown>;

		// Add timestamp and context
		const enrichedResult = {
			...result,
			timestamp: new Date().toISOString(),
			inputs: validatedInput,
		};

		return AgentToolkitSearchResultSchema.parse(enrichedResult);
	}

	validateInput(input: unknown): AgentToolkitSearchInput {
		return AgentToolkitSearchInputSchema.parse(input);
	}

	protected getInputSchema(): Record<string, unknown> {
		return {
			type: 'object',
			properties: {
				pattern: {
					type: 'string',
					description: 'Regular expression pattern to search for',
				},
				path: {
					type: 'string',
					description: 'Path to search in (file or directory)',
				},
			},
			required: ['pattern', 'path'],
		};
	}
}

/**
 * Semgrep search tool implementation
 */
export class SemgrepAdapter implements SearchTool {
	readonly tool = 'semgrep' as const;
	readonly name = 'semgrep_search';
	readonly description = 'Search for patterns using Semgrep rules';
	readonly operation = 'search';

	private readonly adapter: ShellScriptAdapter;

	constructor() {
		this.adapter = new (class extends ShellScriptAdapter {
			constructor() {
				super('semgrep_search.sh');
			}
		})();
	}

	async search(input: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult> {
		const validatedInput = this.validateInput(input);

		await this.adapter.validateScript();

		const result = await this.adapter.executeScript([
			validatedInput.pattern,
			validatedInput.path,
		]);

		const enrichedResult = {
			...(result as object),
			timestamp: new Date().toISOString(),
			inputs: validatedInput,
		};

		return AgentToolkitSearchResultSchema.parse(enrichedResult);
	}

	validateInput(input: unknown): AgentToolkitSearchInput {
		return AgentToolkitSearchInputSchema.parse(input);
	}

	protected getInputSchema(): Record<string, unknown> {
		return {
			type: 'object',
			properties: {
				pattern: {
					type: 'string',
					description: 'Semgrep pattern or rule to search for',
				},
				path: {
					type: 'string',
					description: 'Path to search in (file or directory)',
				},
			},
			required: ['pattern', 'path'],
		};
	}
}

/**
 * AST-grep search tool implementation
 */
export class AstGrepAdapter implements SearchTool {
	readonly tool = 'ast-grep' as const;
	readonly name = 'ast_grep_search';
	readonly description = 'Search for code patterns using AST-grep';
	readonly operation = 'search';

	private readonly adapter: ShellScriptAdapter;

	constructor() {
		this.adapter = new (class extends ShellScriptAdapter {
			constructor() {
				super('ast_grep_search.sh');
			}
		})();
	}

	async search(input: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult> {
		const validatedInput = this.validateInput(input);

		await this.adapter.validateScript();

		const result = await this.adapter.executeScript([
			validatedInput.pattern,
			validatedInput.path,
		]);

		const enrichedResult = {
			...(result as object),
			timestamp: new Date().toISOString(),
			inputs: validatedInput,
		};

		return AgentToolkitSearchResultSchema.parse(enrichedResult);
	}

	validateInput(input: unknown): AgentToolkitSearchInput {
		return AgentToolkitSearchInputSchema.parse(input);
	}

	protected getInputSchema(): Record<string, unknown> {
		return {
			type: 'object',
			properties: {
				pattern: {
					type: 'string',
					description: 'AST pattern to search for',
				},
				path: {
					type: 'string',
					description: 'Path to search in (file or directory)',
				},
			},
			required: ['pattern', 'path'],
		};
	}
}
