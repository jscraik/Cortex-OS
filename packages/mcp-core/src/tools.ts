import { z } from 'zod';

export interface ToolExecutionContext {
        readonly signal?: AbortSignal;
        readonly metadata?: Record<string, unknown>;
}

export interface McpTool<TInput = unknown, TResult = unknown> {
        readonly name: string;
        readonly description: string;
        readonly inputSchema: z.ZodType<TInput>;
        execute(input: TInput, context?: ToolExecutionContext): Promise<TResult> | TResult;
}

export interface McpToolErrorOptions {
        readonly code?: string;
        readonly cause?: unknown;
        readonly details?: Record<string, unknown>;
}

export class McpToolError extends Error {
        declare readonly cause?: unknown;
        readonly code: string;
        readonly details?: Record<string, unknown>;

        constructor(message: string, options: McpToolErrorOptions = {}) {
                super(message);
                this.name = this.constructor.name;
                this.code = options.code ?? 'E_TOOL';
                this.details = options.details;
                if ('cause' in options) {
                        (this as { cause?: unknown }).cause = options.cause;
                }
        }
}

export class ToolRegistrationError extends McpToolError {
        constructor(message: string, options: McpToolErrorOptions = {}) {
                super(message, { ...options, code: options.code ?? 'E_TOOL_REGISTER' });
        }
}

export class ToolNotFoundError extends McpToolError {
        constructor(message: string, options: McpToolErrorOptions = {}) {
                super(message, { ...options, code: options.code ?? 'E_TOOL_NOT_FOUND' });
        }
}

export class ToolValidationError extends McpToolError {
        readonly issues: z.ZodIssue[];

        constructor(message: string, issues: z.ZodIssue[], options: McpToolErrorOptions = {}) {
                super(message, {
                        ...options,
                        code: options.code ?? 'E_TOOL_VALIDATION',
                        details: options.details ?? { issues },
                });
                this.issues = issues;
        }
}

export class ToolExecutionError extends McpToolError {
        constructor(message: string, options: McpToolErrorOptions = {}) {
                super(message, { ...options, code: options.code ?? 'E_TOOL_EXECUTION' });
        }
}

export class ToolRegistry {
        private readonly tools = new Map<string, McpTool<unknown, unknown>>();

        register<TInput, TResult>(tool: McpTool<TInput, TResult>): void {
                if (this.tools.has(tool.name)) {
                        throw new ToolRegistrationError(`Tool with name "${tool.name}" already registered.`);
                }
                this.tools.set(tool.name, tool as McpTool<unknown, unknown>);
        }

        unregister(name: string): boolean {
                return this.tools.delete(name);
        }

        has(name: string): boolean {
                return this.tools.has(name);
        }

        get<TInput, TResult>(name: string): McpTool<TInput, TResult> | undefined {
                return this.tools.get(name) as McpTool<TInput, TResult> | undefined;
        }

        list(): McpTool<unknown, unknown>[] {
                return Array.from(this.tools.values());
        }

        async execute<TInput, TResult>(
                name: string,
                input: unknown,
                context?: ToolExecutionContext,
        ): Promise<TResult> {
                const tool = this.tools.get(name) as McpTool<TInput, TResult> | undefined;
                if (!tool) {
                        throw new ToolNotFoundError(`Tool "${name}" is not registered.`);
                }

                if (context?.signal?.aborted) {
                        throw new ToolExecutionError(`Execution for tool "${name}" was aborted.`, {
                                code: 'E_TOOL_ABORTED',
                        });
                }

                const parsed = tool.inputSchema.safeParse(input);
                if (!parsed.success) {
                        throw new ToolValidationError(
                                `Invalid input provided to tool "${name}".`,
                                parsed.error.issues,
                                { cause: parsed.error },
                        );
                }


                try {
                        const result = await tool.execute(parsed.data, context);
                        return result;
                } catch (error) {
                        if (error instanceof McpToolError) {
                                throw error;
                        }
                        throw new ToolExecutionError(`Tool "${name}" failed to execute.`, { cause: error });
                }
        }
}
