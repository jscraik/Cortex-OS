import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Phase 0 guard test: ensure essential config files exist and are valid JSON.
 * Frontier & Ollama envs are optional; catalogs are required.
 */
describe('orchestration prerequisites', () => {
	const root = resolve(__dirname, '..', '..');
	const mlxPath = resolve(
		root,
		process.env.MLX_MODEL_CONFIG_PATH ?? 'config/mlx-models.json',
	);
	const ollamaPath = resolve(
		root,
		process.env.OLLAMA_MODEL_CONFIG_PATH ?? 'config/ollama-models.json',
	);

	it('has required model catalogs present and valid JSON', () => {
		const missing: string[] = [];
		if (!existsSync(mlxPath)) missing.push(mlxPath);
		if (!existsSync(ollamaPath)) missing.push(ollamaPath);

		expect(
			missing,
			`Missing required model catalog file(s):\n${missing.join('\n')}`,
		).toHaveLength(0);

		// Validate JSON parse-ability (schema added later in Phase 1)
		expect(() => JSON.parse(readFileSync(mlxPath, 'utf8'))).not.toThrow();
		expect(() => JSON.parse(readFileSync(ollamaPath, 'utf8'))).not.toThrow();
	});

	it('documents optional providers via envs (non-fatal)', () => {
		// Presence checks are advisory only at this stage
		const frontier = process.env.FRONTIER_API_KEY;
		const ollama = process.env.OLLAMA_BASE_URL;
		// Accessing them should not throw; optionally log shape for developer context
		expect(
			typeof frontier === 'string' || typeof frontier === 'undefined',
		).toBe(true);
		expect(typeof ollama === 'string' || typeof ollama === 'undefined').toBe(
			true,
		);
	});
});
