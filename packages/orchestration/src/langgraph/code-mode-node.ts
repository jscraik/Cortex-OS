import { mergeN0State, type N0State } from './n0-state.js';

export type CodeModeLanguage = 'typescript' | 'python' | 'rust';

export interface CodeModeAction {
	id: string;
	language: CodeModeLanguage;
	tool: string;
	payload: unknown;
	fallbacks?: CodeModeLanguage[];
}

export interface CodeModeResult {
	language: CodeModeLanguage;
	tool: string;
	durationMs: number;
	output: unknown;
	thermal?: number;
}

export interface CodeModeContext {
	sessionId: string;
	tracer?: (event: string, data?: Record<string, unknown>) => void;
	recordBenchmark?: (result: CodeModeResult) => void | Promise<void>;
}

export interface CodeModeRuntime {
	readonly language: CodeModeLanguage;
	execute: (action: CodeModeAction, ctx: CodeModeContext) => Promise<CodeModeResult>;
}

export class CodeModeThermalError extends Error {
	constructor(message: string) {
		super(`brAInwav thermal safeguard triggered: ${message}`);
		this.name = 'CodeModeThermalError';
	}
}

export class CodeModeRuntimeUnavailableError extends Error {
	constructor(language: CodeModeLanguage) {
		super(`brAInwav code mode runtime unavailable: ${language}`);
		this.name = 'CodeModeRuntimeUnavailableError';
	}
}

export class CodeModeDispatcher {
	private readonly runtimes = new Map<CodeModeLanguage, CodeModeRuntime>();

	registerRuntime(runtime: CodeModeRuntime): void {
		this.runtimes.set(runtime.language, runtime);
	}

	async dispatch(
		state: N0State,
		actions: CodeModeAction[],
		ctx: CodeModeContext,
	): Promise<N0State> {
		const completed: CodeModeResult[] = [];
		const tracer = ctx.tracer ?? (() => {});

		for (const action of actions) {
			let languages: CodeModeLanguage[] = [action.language];
			if (action.fallbacks) {
				languages = [...languages, ...action.fallbacks];
			}

			let result: CodeModeResult | undefined;
			let lastError: unknown;

			for (const language of languages) {
				const runtime = this.runtimes.get(language);
				if (!runtime) {
					lastError = new CodeModeRuntimeUnavailableError(language);
					tracer('code-mode.runtime.missing', { language });
					continue;
				}
				try {
					tracer('code-mode.runtime.start', { language, tool: action.tool });
					result = await runtime.execute({ ...action, language }, ctx);
					tracer('code-mode.runtime.success', {
						language,
						tool: action.tool,
						durationMs: result.durationMs,
					});
					if (ctx.recordBenchmark) {
						try {
							await ctx.recordBenchmark(result);
							tracer('code-mode.benchmark.recorded', {
								language,
								tool: action.tool,
							});
						} catch (error) {
							tracer('code-mode.benchmark.failure', {
								language,
								tool: action.tool,
								error: error instanceof Error ? error.message : String(error),
							});
						}
					}
					break;
				} catch (error) {
					lastError = error;
					tracer('code-mode.runtime.failure', {
						language,
						tool: action.tool,
						error: error instanceof Error ? error.message : String(error),
					});
					if (!(error instanceof CodeModeThermalError)) {
						break;
					}
				}
			}

			if (!result) {
				throw lastError instanceof Error
					? lastError
					: new Error('brAInwav code mode dispatch failed without error context');
			}

			completed.push(result);
		}

		const codeModeCtx = {
			...state.ctx,
			codeMode: {
				...(state.ctx?.codeMode as Record<string, unknown> | undefined),
				completed,
			},
		} satisfies Record<string, unknown>;

		return mergeN0State(state, { ctx: codeModeCtx });
	}
}

export function recordCodeModeBenchmark(
	fileWriter: { write: (content: string) => Promise<void> },
	result: CodeModeResult,
): Promise<void> {
	const payload = {
		language: result.language,
		tool: result.tool,
		durationMs: result.durationMs,
		thermal: result.thermal ?? null,
		timestamp: new Date().toISOString(),
		brand: 'brAInwav',
	} satisfies Record<string, unknown>;
	return fileWriter.write(`${JSON.stringify(payload)}\n`);
}
