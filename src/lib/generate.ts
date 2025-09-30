import { z } from 'zod';

export interface ModelStrategy {
	[task: string]: { primary: { model: string }; fallback: { model: string } };
}

export interface GenerateOptions {
	prompt: string;
	context?: string;
	maxTokens?: number;
	temperature?: number;
	stream?: boolean;
	model: string;
}

export type GenerateFn = (opts: GenerateOptions) => Promise<{ content: string; model: string }>;

export interface GenerateDeps {
	modelStrategy: ModelStrategy;
	mlxGenerate: GenerateFn;
	ollamaGenerate: GenerateFn;
	isHealthy: (provider: string, model: string) => boolean;
	markUnhealthy: (provider: string, model: string) => void;
}

const requestSchema = z.object({
	prompt: z.string(),
	context: z.string().optional(),
	maxTokens: z.number().int().positive().optional(),
	temperature: z.number().min(0).max(1).optional(),
	stream: z.boolean().optional(),
});

export function createGenerate(deps: GenerateDeps) {
	const { modelStrategy, mlxGenerate, ollamaGenerate, isHealthy, markUnhealthy } = deps;
	return async function generate(task: string, request: unknown) {
		const cfg = modelStrategy[task];
		// brAInwav-branded error for missing task configuration to satisfy platform compliance
		if (!cfg) {
			const errMsg = `brAInwav generate: unknown task: ${task}`;
			throw new Error(errMsg);
		}
		const start = Date.now();
		const parsed = requestSchema.parse(request);
		if (isHealthy('mlx', cfg.primary.model)) {
			try {
				const res = await mlxGenerate({ model: cfg.primary.model, ...parsed });
				return {
					...res,
					provider: 'mlx',
					latency: Date.now() - start,
					model: cfg.primary.model,
				};
			} catch (error) {
				// brAInwav-branded structured logging for primary model failures
				const fallbackReason = error instanceof Error ? error.message : 'unknown error';
				console.error(
					JSON.stringify({
						timestamp: new Date().toISOString(),
						severity: 'warning',
						component: 'brAInwav-generate',
						event: 'primary-model-failure',
						provider: 'mlx',
						model: cfg.primary.model,
						task,
						reason: fallbackReason,
						action: 'fallback-to-ollama',
					}),
				);
				markUnhealthy('mlx', cfg.primary.model);
			}
		}
		try {
			const res = await ollamaGenerate({ model: cfg.fallback.model, ...parsed });
			return {
				...res,
				provider: 'ollama',
				latency: Date.now() - start,
				model: cfg.fallback.model,
			};
		} catch (error) {
			// Both primary and fallback failed - this is a critical failure
			const failureReason = error instanceof Error ? error.message : 'unknown error';
			console.error(
				JSON.stringify({
					timestamp: new Date().toISOString(),
					severity: 'error',
					component: 'brAInwav-generate',
					event: 'all-providers-failed',
					task,
					primaryModel: cfg.primary.model,
					fallbackModel: cfg.fallback.model,
					reason: failureReason,
					action: 'critical-failure',
				}),
			);
			throw new Error(
				`brAInwav generate: all providers failed for task '${task}': ${failureReason}`,
			);
		}
	};
}
