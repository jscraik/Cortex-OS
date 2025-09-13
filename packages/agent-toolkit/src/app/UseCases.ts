import type {
	AgentToolkitCodemodInput,
	AgentToolkitInput,
	AgentToolkitResult,
	AgentToolkitSearchInput,
	AgentToolkitValidationInput,
} from '@cortex-os/contracts';
import type {
	ToolExecutionContext,
	ToolExecutionEvents,
	ToolExecutor,
} from '../domain/ToolExecutor.js';
import type { ToolRegistry } from '../domain/ToolInterfaces.js';

/**
 * Main use case for executing agent toolkit tools
 */
export class ToolExecutorUseCase implements ToolExecutor {
	constructor(
		private readonly toolRegistry: ToolRegistry,
		private readonly events?: ToolExecutionEvents,
	) { }

	async execute(
		toolName: string,
		inputs: AgentToolkitInput,
	): Promise<AgentToolkitResult> {
		const context: ToolExecutionContext = {
			toolId: `${toolName}-${Date.now()}`,
			requestedBy: 'agent-toolkit',
			sessionId: undefined,
		};

		const startTime = Date.now();
		this.events?.onStart(context, inputs);

		try {
			let result: AgentToolkitResult;

			// Route to appropriate tool based on input type and tool name
			if (this.isSearchInput(inputs)) {
				const searchTool = this.toolRegistry.getSearchTool(toolName);
				if (!searchTool) {
					throw new Error(`Search tool '${toolName}' not found`);
				}
				result = await searchTool.search(inputs);
			} else if (this.isCodemodInput(inputs)) {
				const codemodTool = this.toolRegistry.getCodemodTool(toolName);
				if (!codemodTool) {
					throw new Error(`Codemod tool '${toolName}' not found`);
				}
				result = await codemodTool.rewrite(inputs);
			} else if (this.isValidationInput(inputs)) {
				const validationTool = this.toolRegistry.getValidationTool(toolName);
				if (!validationTool) {
					throw new Error(`Validation tool '${toolName}' not found`);
				}
				result = await validationTool.validate(inputs);
			} else {
				throw new Error(`Unknown input type for tool '${toolName}'`);
			}

			const duration = Date.now() - startTime;
			this.events?.onComplete(context, result, duration);
			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.events?.onError(context, error as Error, duration);
			throw error;
		}
	}

	async isAvailable(toolName: string): Promise<boolean> {
		const tools = this.toolRegistry.listTools();
		return (
			tools.search.includes(toolName) ||
			tools.codemod.includes(toolName) ||
			tools.validation.includes(toolName)
		);
	}

	async getAvailableTools(): Promise<string[]> {
		const tools = this.toolRegistry.listTools();
		return [...tools.search, ...tools.codemod, ...tools.validation];
	}

	private isSearchInput(
		inputs: AgentToolkitInput,
	): inputs is AgentToolkitSearchInput {
		return 'pattern' in inputs && 'path' in inputs;
	}

	private isCodemodInput(
		inputs: AgentToolkitInput,
	): inputs is AgentToolkitCodemodInput {
		return 'find' in inputs && 'replace' in inputs && 'path' in inputs;
	}

	private isValidationInput(
		inputs: AgentToolkitInput,
	): inputs is AgentToolkitValidationInput {
		return 'files' in inputs && Array.isArray(inputs.files);
	}
}

/**
 * Use case for batch operations
 */
export class BatchToolExecutorUseCase {
	constructor(private readonly toolExecutor: ToolExecutor) { }

	/**
	 * Execute multiple tools in parallel
	 */
	async executeParallel(
		operations: Array<{ toolName: string; inputs: AgentToolkitInput }>,
	): Promise<AgentToolkitResult[]> {
		const promises = operations.map(({ toolName, inputs }) =>
			this.toolExecutor.execute(toolName, inputs),
		);
		return Promise.all(promises);
	}

	/**
	 * Execute multiple tools sequentially
	 */
	async executeSequential(
		operations: Array<{ toolName: string; inputs: AgentToolkitInput }>,
	): Promise<AgentToolkitResult[]> {
		const results: AgentToolkitResult[] = [];
		for (const { toolName, inputs } of operations) {
			const result = await this.toolExecutor.execute(toolName, inputs);
			results.push(result);
		}
		return results;
	}
}

/**
 * Specialized use case for code search operations
 */
export class CodeSearchUseCase {
	constructor(private readonly toolExecutor: ToolExecutor) { }

	/**
	 * Multi-tool search: searches using ripgrep, semgrep, and ast-grep
	 */
	async multiSearch(
		pattern: string,
		path: string,
	): Promise<{
		ripgrep: AgentToolkitResult;
		semgrep: AgentToolkitResult;
		astGrep: AgentToolkitResult;
	}> {
		const searchInput: AgentToolkitSearchInput = { pattern, path };

		const [ripgrep, semgrep, astGrep] = await Promise.all([
			this.toolExecutor.execute('ripgrep', searchInput),
			this.toolExecutor.execute('semgrep', searchInput),
			this.toolExecutor.execute('ast-grep', searchInput),
		]);

		return { ripgrep, semgrep, astGrep };
	}

	/**
	 * Smart search: tries multiple tools and returns the first successful result
	 */
	async smartSearch(
		pattern: string,
		path: string,
	): Promise<AgentToolkitResult> {
		const searchInput: AgentToolkitSearchInput = { pattern, path };
		const tools = ['ripgrep', 'semgrep', 'ast-grep'];

		for (const toolName of tools) {
			try {
				const result = await this.toolExecutor.execute(toolName, searchInput);
				if (result.results && result.results.length > 0) {
					return result;
				}
			} catch { }
		}

		// If all tools failed or returned no results
		return {
			tool: 'ripgrep',
			op: 'search',
			inputs: searchInput,
			results: [],
			error: 'No results found with any search tool',
		};
	}
}

/**
 * Specialized use case for code quality operations
 */
export class CodeQualityUseCase {
	constructor(private readonly toolExecutor: ToolExecutor) { }

	/**
	 * Comprehensive validation of a set of files
	 */
	async validateProject(files: string[]): Promise<{
		eslint?: AgentToolkitResult;
		ruff?: AgentToolkitResult;
		cargo?: AgentToolkitResult;
		summary: {
			totalFiles: number;
			totalIssues: number;
			toolsRun: string[];
		};
	}> {
		const validationInput: AgentToolkitValidationInput = { files };
		const results: Record<string, AgentToolkitResult> = {};
		const toolsRun: string[] = [];
		let totalIssues = 0;

		// Categorize files by type
		const jsFiles = files.filter((f) => f.match(/\.(ts|tsx|js|jsx)$/));
		const pyFiles = files.filter((f) => f.match(/\.py$/));
		const rsFiles = files.filter((f) => f.match(/\.rs$/));

		// Run appropriate validators
		if (jsFiles.length > 0) {
			try {
				const result = await this.toolExecutor.execute('eslint', {
					files: jsFiles,
				});
				results.eslint = result;
				toolsRun.push('eslint');
				totalIssues += result.results?.length || 0;
			} catch {
				// Continue with other validators
			}
		}

		if (pyFiles.length > 0) {
			try {
				const result = await this.toolExecutor.execute('ruff', {
					files: pyFiles,
				});
				results.ruff = result;
				toolsRun.push('ruff');
				totalIssues += result.results?.length || 0;
			} catch {
				// Continue with other validators
			}
		}

		if (rsFiles.length > 0) {
			try {
				const result = await this.toolExecutor.execute(
					'cargo',
					validationInput,
				);
				results.cargo = result;
				toolsRun.push('cargo');
				totalIssues += result.results?.length || 0;
			} catch {
				// Continue
			}
		}

		return {
			...results,
			summary: {
				totalFiles: files.length,
				totalIssues,
				toolsRun,
			},
		};
	}
}
