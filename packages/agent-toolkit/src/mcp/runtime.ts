import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAgentToolkit } from '../index.js';

const MAX_TOKEN_LIMIT_DEFAULT = 40_000;
const TRIM_TOKEN_LIMIT_DEFAULT = 20_000;
const CIRCUIT_BREAKER_THRESHOLD_DEFAULT = 5;
const CIRCUIT_BREAKER_RESET_MS_DEFAULT = 60_000;

export interface McpEvent {
	type: string;
	data: Record<string, unknown>;
}

export interface ExecutionMetadata {
	correlationId: string;
	tool: string;
	timestamp: string;
	durationMs?: number;
	trimmedTokens?: boolean;
}

export interface McpExecutionResult {
	success: boolean;
	data?: unknown;
	error?: string;
	metadata: ExecutionMetadata;
}

export interface AgentToolkitMcpTool {
	name: string;
	description: string;
	schema: z.ZodTypeAny;
	handler: (input: unknown) => Promise<McpExecutionResult>;
}

export interface AgentToolkitMcpRuntimeOptions {
	toolkit?: ReturnType<typeof createAgentToolkit>;
	publishEvent?: (event: McpEvent) => void | Promise<void>;
	tokenLimits?: { max: number; trim: number };
	circuitBreaker?: { threshold: number; resetMs: number };
	now?: () => number;
}

type CircuitBreakerState = { failureCount: number; lastFailureTime: number; isOpen: boolean };

interface ExecutionRecord {
	tool: string;
	input: unknown;
	result: McpExecutionResult;
	timestamp: Date;
}

interface ToolConfig<Input> {
	name: string;
	description: string;
	schema: z.ZodType<Input>;
	toolType: 'search' | 'codemod' | 'validate' | 'codemap';
	eventToolName: string;
	estimateTokens?: (input: Input) => number;
	run: (input: Input) => Promise<McpExecutionResult>;
	onSuccess?: (input: Input, result: McpExecutionResult) => void;
}

interface ExecutionContext {
	correlationId: string;
	timestamp: string;
	trimmed: boolean;
}

const searchSchema = z.object({ pattern: z.string().min(1), path: z.string().min(1) });
const codemodSchema = z.object({
	find: z.string().min(1),
	replace: z.string(),
	path: z.string().min(1),
});
const validateSchema = z.object({ files: z.array(z.string().min(1)).min(1) });
const codemapSchema = z.object({
	repoPath: z.string().min(1),
	scope: z.string().optional(),
	sinceDays: z.number().optional(),
	sections: z.array(z.string()).optional(),
	tools: z.array(z.string()).optional(),
	jsonOut: z.string().optional(),
	markdownOut: z.string().optional(),
});

type SearchInput = z.infer<typeof searchSchema>;
type CodemodInput = z.infer<typeof codemodSchema>;
type ValidateInput = z.infer<typeof validateSchema>;
type CodemapInput = z.infer<typeof codemapSchema>;

type Toolkit = ReturnType<typeof createAgentToolkit>;

export class AgentToolkitMcpRuntime {
	private readonly toolkit: Toolkit;
	private readonly publishEvent?: (event: McpEvent) => void | Promise<void>;
	private readonly tokenLimits: { max: number; trim: number };
	private readonly circuitBreaker: { threshold: number; resetMs: number };
	private readonly clock: () => number;
	private readonly toolConfigs = new Map<string, ToolConfig<unknown>>();
	private readonly tools = new Map<string, AgentToolkitMcpTool>();
	private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
	private readonly history = new Map<string, ExecutionRecord>();
	private totalTokens = 0;

	constructor(options?: AgentToolkitMcpRuntimeOptions) {
		this.toolkit = options?.toolkit ?? createAgentToolkit();
		this.publishEvent = options?.publishEvent;
		this.tokenLimits = {
			max: options?.tokenLimits?.max ?? MAX_TOKEN_LIMIT_DEFAULT,
			trim: options?.tokenLimits?.trim ?? TRIM_TOKEN_LIMIT_DEFAULT,
		};
		this.circuitBreaker = {
			threshold: options?.circuitBreaker?.threshold ?? CIRCUIT_BREAKER_THRESHOLD_DEFAULT,
			resetMs: options?.circuitBreaker?.resetMs ?? CIRCUIT_BREAKER_RESET_MS_DEFAULT,
		};
		this.clock = options?.now ?? Date.now;

		this.registerTool(this.buildSearchTool());
		this.registerTool(this.buildMultiSearchTool());
		this.registerTool(this.buildCodemodTool());
		this.registerTool(this.buildValidateTool());
		this.registerTool(this.buildCodemapTool());
	}

	public listTools(): AgentToolkitMcpTool[] {
		return Array.from(this.tools.values());
	}

	public getTool(name: string): AgentToolkitMcpTool | undefined {
		return this.tools.get(name);
	}

	public async execute(name: string, input: unknown): Promise<McpExecutionResult> {
		const tool = this.tools.get(name);
		if (!tool) {
			throw new Error(`brAInwav Agent Toolkit: MCP tool '${name}' not found`);
		}
		return tool.handler(input);
	}

	public async batchSearch(requests: SearchInput[]): Promise<McpExecutionResult[]> {
		const executions = await Promise.all(
			requests.map((req) => this.execute('agent_toolkit_search', req)),
		);
		this.emit({
			type: 'agent_toolkit.batch.completed',
			data: {
				batchId: `batch_${Date.now()}`,
				operationType: 'search',
				totalOperations: requests.length,
				successfulOperations: executions.filter((r) => r.success).length,
				completedAt: new Date().toISOString(),
			},
		});
		return executions;
	}

	public getExecutionHistory(): Map<string, ExecutionRecord> {
		return this.history;
	}

	public clearHistory(): void {
		this.history.clear();
	}

        public getStats(): {
                totalExecutions: number;
                successfulExecutions: number;
                failedExecutions: number;
                tools: Array<{ name: string; executions: number; successRate: number }>;
        } {
		const byTool = new Map<string, { executions: number; successes: number }>();
		for (const record of this.history.values()) {
			const stats = byTool.get(record.tool) ?? { executions: 0, successes: 0 };
			stats.executions += 1;
			if (record.result.success) stats.successes += 1;
			byTool.set(record.tool, stats);
		}
		const totalExecutions = this.history.size;
		const successfulExecutions = Array.from(this.history.values()).filter(
			(r) => r.result.success,
		).length;
		const failedExecutions = totalExecutions - successfulExecutions;
		return {
			totalExecutions,
			successfulExecutions,
			failedExecutions,
			tools: Array.from(byTool.entries()).map(([name, stats]) => ({
				name,
				executions: stats.executions,
				successRate: stats.executions ? stats.successes / stats.executions : 0,
			})),
		};
	}

	private registerTool<Input>(config: ToolConfig<Input>): void {
		this.toolConfigs.set(config.name, config as ToolConfig<unknown>);
		this.tools.set(config.name, {
			name: config.name,
			description: config.description,
			schema: config.schema,
			handler: (input: unknown) => this.executeConfigured(config, input),
		});
	}

	private async executeConfigured<Input>(
		config: ToolConfig<Input>,
		rawInput: unknown,
	): Promise<McpExecutionResult> {
		const parsed = config.schema.safeParse(rawInput);
		if (!parsed.success) {
			const failure = this.validationFailure(config.name, parsed.error);
			this.recordOutcome(config.name, rawInput, failure);
			this.recordExecutionResult(config.name, false);
			this.emitFailure(config.name, failure);
			return failure;
		}
		if (this.isCircuitBreakerOpen(config.name)) {
			return this.circuitBreakerFailure(config.name);
		}
		const input = parsed.data;
		const correlationId = this.createCorrelationId(config.name);
		const timestamp = new Date().toISOString();
		const trimmed = this.trackTokenUsage(config.estimateTokens?.(input) ?? 0);
		this.emitStarted(config, input, correlationId, timestamp);
		return this.invokeTool(config, input, { correlationId, timestamp, trimmed });
	}

	private validationFailure(name: string, error: z.ZodError): McpExecutionResult {
		const message = error.issues
			.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
			.join('; ');
		return this.buildFailure(name, `Validation failed - ${message}`);
	}

	private circuitBreakerFailure(name: string): McpExecutionResult {
		return this.buildFailure(
			name,
			`Circuit breaker open for tool '${name}' - too many recent failures`,
		);
	}

	private async invokeTool<Input>(
		config: ToolConfig<Input>,
		input: Input,
		ctx: ExecutionContext,
	): Promise<McpExecutionResult> {
		const started = this.clock();
		try {
			const result = await config.run(input);
			const enriched = this.enrichResult(config.name, result, ctx, started);
			this.recordOutcome(config.name, input, enriched);
			config.onSuccess?.(input, enriched);
			this.recordExecutionResult(config.name, enriched.success);
			this.emitCompleted(config.eventToolName, enriched);
			return enriched;
		} catch (error) {
			const failure = this.buildFailure(config.name, error);
			const enriched = this.enrichResult(config.name, failure, ctx, started);
			this.recordOutcome(config.name, input, enriched);
			this.recordExecutionResult(config.name, false);
			this.emitFailure(config.name, enriched);
			return enriched;
		}
	}

	private emitCompleted(toolName: string, result: McpExecutionResult): void {
		this.emit({
			type: 'agent_toolkit.execution.completed',
			data: {
				executionId: result.metadata.correlationId,
				toolName,
				success: result.success,
				durationMs: result.metadata.durationMs,
			},
		});
	}

	private enrichResult(
		name: string,
		result: McpExecutionResult,
		ctx: ExecutionContext,
		started: number,
	): McpExecutionResult {
		const duration = this.clock() - started;
		const metadata: ExecutionMetadata = {
			correlationId: ctx.correlationId,
			tool: name,
			timestamp: ctx.timestamp,
			durationMs: duration,
			trimmedTokens: ctx.trimmed ? true : undefined,
		};
		return { ...result, metadata: { ...metadata, ...result.metadata } };
	}

	private buildFailure(name: string, error: unknown): McpExecutionResult {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			error: `brAInwav Agent Toolkit: ${name} execution failed - ${message}`,
			metadata: {
				correlationId: this.createCorrelationId(`${name}_failure`),
				tool: name,
				timestamp: new Date().toISOString(),
			},
		};
	}

	private recordOutcome(tool: string, input: unknown, result: McpExecutionResult): void {
		this.history.set(result.metadata.correlationId, {
			tool,
			input,
			result,
			timestamp: new Date(result.metadata.timestamp),
		});
	}

	private isCircuitBreakerOpen(tool: string): boolean {
		const state = this.circuitBreakers.get(tool);
		if (!state) return false;
		if (!state.isOpen) return false;
		if (this.clock() - state.lastFailureTime > this.circuitBreaker.resetMs) {
			state.isOpen = false;
			state.failureCount = 0;
			return false;
		}
		return true;
	}

	private recordExecutionResult(tool: string, success: boolean): void {
		const state = this.circuitBreakers.get(tool) ?? {
			failureCount: 0,
			lastFailureTime: 0,
			isOpen: false,
		};
		if (success) {
			state.failureCount = 0;
			state.isOpen = false;
		} else {
			state.failureCount += 1;
			state.lastFailureTime = this.clock();
			if (state.failureCount >= this.circuitBreaker.threshold) state.isOpen = true;
		}
		this.circuitBreakers.set(tool, state);
	}

	private trackTokenUsage(tokens: number): boolean {
		if (tokens <= 0) return false;
		this.totalTokens += tokens;
		if (this.totalTokens > this.tokenLimits.max) {
			console.warn(
				`[brAInwav] Agent Toolkit token usage exceeded ${this.tokenLimits.max}; trimming to ${this.tokenLimits.trim}`,
			);
			this.totalTokens = this.tokenLimits.trim;
			return true;
		}
		return false;
	}

	private emit(event: McpEvent): void {
		if (!this.publishEvent) return;
		try {
			const maybePromise = this.publishEvent(event);
			if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
				void (maybePromise as Promise<unknown>).catch(() => {});
			}
		} catch {
			// Ignore publisher failures to avoid breaking tool execution
		}
	}

	private emitStarted<Input>(
		config: ToolConfig<Input>,
		input: Input,
		correlationId: string,
		timestamp: string,
	): void {
		this.emit({
			type: 'agent_toolkit.execution.started',
			data: {
				executionId: correlationId,
				toolName: config.eventToolName,
				toolType: config.toolType,
				parameters: input,
				initiatedBy: 'agent-toolkit',
				startedAt: timestamp,
			},
		});
	}

	private emitFailure(tool: string, result: McpExecutionResult): void {
		this.emit({
			type: 'agent_toolkit.execution.failed',
			data: {
				executionId: result.metadata.correlationId,
				toolName: tool,
				error: result.error,
				failedAt: result.metadata.timestamp,
			},
		});
	}

	private buildSearchTool(): ToolConfig<SearchInput> {
		return {
			name: 'agent_toolkit_search',
			description: 'Search for patterns in code using ripgrep',
			schema: searchSchema,
			toolType: 'search',
			eventToolName: 'ripgrep',
			estimateTokens: (input) => input.pattern.length + input.path.length,
			run: async (input) =>
				this.wrapToolkitResult(
					'agent_toolkit_search',
					await this.toolkit.search(input.pattern, input.path),
				),
		};
	}

	private buildMultiSearchTool(): ToolConfig<SearchInput> {
		return {
			name: 'agent_toolkit_multi_search',
			description: 'Search using multiple tools (ripgrep, semgrep, ast-grep)',
			schema: searchSchema,
			toolType: 'search',
			eventToolName: 'multi-search',
			estimateTokens: (input) => (input.pattern.length + input.path.length) * 3,
			run: async (input) => {
				const result = await this.toolkit.multiSearch(input.pattern, input.path);
				return {
					success: true,
					data: result,
					metadata: { correlationId: '', tool: 'agent_toolkit_multi_search', timestamp: '' },
				};
			},
			onSuccess: (_input, result) => {
				this.emit({
					type: 'agent_toolkit.execution.completed',
					data: {
						executionId: result.metadata.correlationId,
						toolName: 'multi-search',
						success: result.success,
						durationMs: result.metadata.durationMs,
					},
				});
			},
		};
	}

	private buildCodemodTool(): ToolConfig<CodemodInput> {
		return {
			name: 'agent_toolkit_codemod',
			description: 'Perform structural code modifications using Comby',
			schema: codemodSchema,
			toolType: 'codemod',
			eventToolName: 'comby',
			estimateTokens: (input) => input.find.length + input.replace.length + input.path.length,
			run: async (input) =>
				this.wrapToolkitResult(
					'agent_toolkit_codemod',
					await this.toolkit.codemod(input.find, input.replace, input.path),
				),
			onSuccess: (input, result) => {
				this.emit({
					type: 'agent_toolkit.code.modified',
					data: {
						executionId: result.metadata.correlationId,
						modificationType: 'pattern_replacement',
						filesChanged: [input.path],
						completedAt: result.metadata.timestamp,
					},
				});
			},
		};
	}

	private buildValidateTool(): ToolConfig<ValidateInput> {
		return {
			name: 'agent_toolkit_validate',
			description: 'Validate code quality using workspace linters',
			schema: validateSchema,
			toolType: 'validate',
			eventToolName: 'multi-validator',
			estimateTokens: (input) => input.files.join(',').length,
			run: async (input) =>
				this.wrapToolkitResult('agent_toolkit_validate', await this.toolkit.validate(input.files)),
		};
	}

	private buildCodemapTool(): ToolConfig<CodemapInput> {
		return {
			name: 'agent_toolkit_codemap',
			description: 'Generate repository codemap artifacts via agent toolkit',
			schema: codemapSchema,
			toolType: 'codemap',
			eventToolName: 'codemap',
			estimateTokens: (input) => JSON.stringify(input).length,
			run: async (input) =>
				this.wrapToolkitResult(
					'agent_toolkit_codemap',
					await this.toolkit.generateCodemap(input as any),
				),
		};
	}

	private wrapToolkitResult(tool: string, raw: unknown): McpExecutionResult {
		const error =
			typeof raw === 'object' && raw !== null && 'error' in (raw as Record<string, unknown>)
				? (raw as Record<string, unknown>).error
				: undefined;
		const success = !error;
		return {
			success,
			data: raw,
			error: success ? undefined : String(error),
			metadata: { correlationId: '', tool, timestamp: '' },
		};
	}

	private createCorrelationId(prefix: string): string {
		return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
	}
}
