#!/usr/bin/env tsx
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadMlxModelsConfig, MlxModelsConfig } from '../src/index.js';

function resolveModelPath(p: string): string {
  return p.replace('${MLX_CACHE_DIR}', process.env.MLX_CACHE_DIR || '');
}

export async function checkModelReadiness(
  configPath = path.resolve(process.cwd(), '..', '..', 'config', 'mlx-models.json'),
): Promise<boolean> {
  const cfg: MlxModelsConfig = await loadMlxModelsConfig(configPath);
  let ok = true;
  const categories: Array<[string, Record<string, { path: string; name: string }>]> = [
    ['embedding', cfg.embedding_models],
    ['reranker', cfg.reranker_models],
    ['chat', cfg.chat_models],
    ['safety', cfg.safety_models],
  ];

  for (const [category, models] of categories) {
    const defaultId = cfg.default_models[category];
    const model = models[defaultId];
    if (!model) {
      console.warn(`Missing default model for ${category}`);
      ok = false;
      continue;
    }
    const resolved = resolveModelPath(model.path);
    if (!existsSync(resolved)) {
      console.warn(`Model ${model.name} not found at ${resolved}`);
      const suggestions = Object.values(models)
        .map((m) => m.name)
        .join(', ');
      console.warn(`Fallback options: ${suggestions}`);
      ok = false;
    }
  }

  if (ok) {
    console.log('All recommended models available.');
  }
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = await checkModelReadiness();
  process.exit(ok ? 0 : 1);
}
