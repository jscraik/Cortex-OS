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

	async execute(toolName: string, inputs: AgentToolkitInput): Promise<AgentToolkitResult> {
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

	private isSearchInput(inputs: AgentToolkitInput): inputs is AgentToolkitSearchInput {
		return 'pattern' in inputs && 'path' in inputs;
	}

	private isCodemodInput(inputs: AgentToolkitInput): inputs is AgentToolkitCodemodInput {
		return 'find' in inputs && 'replace' in inputs && 'path' in inputs;
	}

	private isValidationInput(inputs: AgentToolkitInput): inputs is AgentToolkitValidationInput {
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
	async smartSearch(pattern: string, path: string): Promise<AgentToolkitResult> {
		const searchInput: AgentToolkitSearchInput = { pattern, path };
		const tools = ['ripgrep', 'semgrep', 'ast-grep'];

		for (const toolName of tools) {
			try {
				const result = await this.toolExecutor.execute(toolName, searchInput);
				if (result.results && result.results.length > 0) {
					return result;
				}
			} catch {
				// ignore and try next tool
			}
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

	/**
	 * Multi-search with optional chunked context building from matched files
	 */
	async multiSearchWithContext(
		pattern: string,
		path: string,
		opts?: {
			tokenBudget?: { maxTokens: number; trimToTokens?: number }; useTreeSitter?: boolean;
			maxChunkChars?: number; overlap?: number; language?: 'js' | 'ts' | 'python' | 'go' | 'any'
		}
	): Promise<{
		ripgrep: AgentToolkitResult;
		semgrep: AgentToolkitResult;
		astGrep: AgentToolkitResult;
		context: import('../semantics/ContextBuilder').ChunkedContext | null;
	}> {
		const raw = await this.multiSearch(pattern, path);
		const files = collectFilesFromResults([raw.ripgrep, raw.semgrep, raw.astGrep]);
		if (files.length === 0) return { ...raw, context: null };
		const { buildChunkedContext } = await import('../semantics/ContextBuilder.js');
		const context = await buildChunkedContext({
			files,
			tokenBudget: opts?.tokenBudget,
			useTreeSitter: opts?.useTreeSitter ?? tsFlag(),
			maxChunkChars: opts?.maxChunkChars,
			overlap: opts?.overlap,
			language: opts?.language,
		});
		return { ...raw, context };
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
		const jsFiles = files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'));
		const pyFiles = files.filter((f) => f.endsWith('.py'));
		const rsFiles = files.filter((f) => f.endsWith('.rs'));

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
				const result = await this.toolExecutor.execute('cargo', validationInput);
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

	/**
	 * Smart validation: chunk/prune large file sets and return per-file token summary when requested
	 */
	async validateProjectSmart(
		files: string[],
		opts?: { tokenBudget?: { maxTokens: number; trimToTokens?: number }; useTreeSitter?: boolean; maxFiles?: number },
	): Promise<{
		report: Awaited<ReturnType<CodeQualityUseCase['validateProject']>>;
		context?: Array<{ file: string; totalTokens: number }>;
	}> {
		const maxFiles = Math.max(1, opts?.maxFiles ?? 500);
		const target = files.slice(0, maxFiles);
		const report = await this.validateProject(target);
		let context: Array<{ file: string; totalTokens: number }> | undefined;
		if (target.length > 50 || opts?.tokenBudget) {
			const { buildChunkedContext } = await import('../semantics/ContextBuilder.js');
			const cc = await buildChunkedContext({
				files: target,
				tokenBudget: opts?.tokenBudget,
				useTreeSitter: opts?.useTreeSitter ?? tsFlag(),
			});
			const perFile = new Map<string, number>();
			for (const c of cc.chunks) perFile.set(c.file, (perFile.get(c.file) ?? 0) + c.tokens);
			context = [...perFile.entries()].map(([file, totalTokens]) => ({ file, totalTokens }));
		}
		return { report, context };
	}
}

function collectFilesFromResults(results: AgentToolkitResult[]): string[] {
	const set = new Set<string>();
	for (const r of results) {
		const arr = (r as unknown as { results?: unknown }).results;
		if (!Array.isArray(arr)) continue;
		for (const entry of arr) {
			const maybe = entry as { file?: unknown };
			if (maybe && typeof maybe.file === 'string') set.add(maybe.file);
		}
	}
	return [...set];
}

function tsFlag(): boolean {
	return process.env.CORTEX_TS_BOUNDARIES === '1' || process.env.CORTEX_TS_BOUNDARIES === 'true';
}
