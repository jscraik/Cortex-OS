import fs from 'node:fs';
import path from 'node:path';
import {
	type MlxCatalog,
	mlxCatalogSchema,
	type OllamaCatalog,
	ollamaCatalogSchema,
} from './schemas.js';

export type Provider = 'mlx' | 'ollama';

export interface ModelRef {
	provider: Provider;
	model: string;
}

export interface ResolveOptions {
	availability?: Partial<Record<Provider, boolean>>;
}

export function resolveConfigPath(relOrAbs: string): string {
	if (path.isAbsolute(relOrAbs) && fs.existsSync(relOrAbs)) return relOrAbs;
	const candidates = [
		path.resolve(process.cwd(), relOrAbs),
		path.resolve(process.cwd(), '..', '..', relOrAbs),
		path.resolve(process.cwd(), '..', '..', '..', relOrAbs),
	];
	for (const p of candidates) {
		if (fs.existsSync(p)) return p;
	}
	// Fallback to raw path
	return relOrAbs;
}

function readJson(filePath: string): unknown {
	const content = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(content);
}

export class ModelRegistry {
	constructor(
		private readonly mlxCatalog: MlxCatalog,
		private readonly ollamaCatalog: OllamaCatalog,
	) {}

	getDefault(kind: string): ModelRef {
		const mlxDefault = this.mlxCatalog?.default_models?.[kind];
		if (mlxDefault) return { provider: 'mlx', model: mlxDefault };
		const ollamaDefault = this.ollamaCatalog?.default_models?.[kind];
		if (ollamaDefault) return { provider: 'ollama', model: ollamaDefault };
		throw new Error(`No default model for kind: ${kind}`);
	}

	resolveTask(task: string, options?: ResolveOptions): ModelRef[] {
		const out: ModelRef[] = [];
		const allowMlx = options?.availability?.mlx ?? true;
		const allowOllama = options?.availability?.ollama ?? true;
		const mlx = this.mlxCatalog?.task_routing?.[task];
		const oll = this.ollamaCatalog?.task_routing?.[task];
		if (allowMlx && mlx) out.push({ provider: 'mlx', model: mlx });
		if (allowOllama && oll) out.push({ provider: 'ollama', model: oll });
		return out;
	}
}

export async function loadModelRegistry(): Promise<ModelRegistry> {
	const mlxPath = resolveConfigPath(
		process.env.MLX_MODEL_CONFIG_PATH ?? 'config/mlx-models.json',
	);
	const ollamaPath = resolveConfigPath(
		process.env.OLLAMA_MODEL_CONFIG_PATH ?? 'config/ollama-models.json',
	);
	const mlxRaw = readJson(mlxPath);
	const ollamaRaw = readJson(ollamaPath);
	const mlx = mlxCatalogSchema.parse(mlxRaw);
	const ollama = ollamaCatalogSchema.parse(ollamaRaw);
	return new ModelRegistry(mlx, ollama);
}

export default ModelRegistry;
