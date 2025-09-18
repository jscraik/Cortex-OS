import { z } from 'zod';

export interface EmbedDeps {
	modelStrategy: {
		embeddings: { primary: { model: string }; fallback: { model: string } };
	};
	mlxEmbed: (opts: {
		model: string;
		texts: string[];
	}) => Promise<{ embeddings: number[][]; model: string; dimensions: number }>;
	ollamaSemantic: (texts: string[]) => Promise<number[][]>;
	isHealthy: (provider: string, model: string) => boolean;
	markUnhealthy: (provider: string, model: string) => void;
}

const requestSchema = z.object({
	texts: z.array(z.string()),
	model: z.string().optional(),
});

export function createEmbed(deps: EmbedDeps) {
	const { modelStrategy, mlxEmbed, ollamaSemantic, isHealthy, markUnhealthy } =
		deps;
	return async function embed(request: unknown) {
		const cfg = modelStrategy.embeddings;
		const parsed = requestSchema.parse(request);
		if (isHealthy('mlx', cfg.primary.model)) {
			try {
				const res = await mlxEmbed({
					model: cfg.primary.model,
					texts: parsed.texts,
				});
				return { ...res, provider: 'mlx', model: cfg.primary.model };
			} catch {
				markUnhealthy('mlx', cfg.primary.model);
			}
		}
		const embeddings = await ollamaSemantic(parsed.texts);
		return {
			embeddings,
			provider: 'ollama',
			model: cfg.fallback.model,
			dimensions: embeddings.length === 0 ? null : embeddings[0].length,
		};
	};
}
