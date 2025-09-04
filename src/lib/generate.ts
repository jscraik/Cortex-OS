import { z } from "zod";

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

export type GenerateFn = (
        opts: GenerateOptions,
) => Promise<{ content: string; model: string }>;

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
	const {
		modelStrategy,
		mlxGenerate,
		ollamaGenerate,
		isHealthy,
		markUnhealthy,
	} = deps;
	return async function generate(task: string, request: unknown) {
		const cfg = modelStrategy[task];
		if (!cfg) throw new Error(`Unknown task: ${task}`);
		const start = Date.now();
		const parsed = requestSchema.parse(request);
		if (isHealthy("mlx", cfg.primary.model)) {
			try {
				const res = await mlxGenerate({ model: cfg.primary.model, ...parsed });
				return {
					...res,
					provider: "mlx",
					latency: Date.now() - start,
					model: cfg.primary.model,
				};
			} catch {
				markUnhealthy("mlx", cfg.primary.model);
			}
		}
		const res = await ollamaGenerate({ model: cfg.fallback.model, ...parsed });
		return {
			...res,
			provider: "ollama",
			latency: Date.now() - start,
			model: cfg.fallback.model,
		};
	};
}
