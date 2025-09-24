import { describe, expect, it, vi } from 'vitest';
import { createEmbed } from '../../src/lib/embed';

describe('createEmbed', () => {
	const strategy = {
		embeddings: { primary: { model: 'm1' }, fallback: { model: 'm2' } },
	};
	const baseDeps = {
		modelStrategy: strategy,
		mlxEmbed: vi.fn().mockResolvedValue({ embeddings: [[0.1]], model: 'm1', dimensions: 1 }),
		ollamaSemantic: vi.fn().mockResolvedValue([[0.2]]),
		markUnhealthy: vi.fn(),
	};

	it('uses MLX when healthy', async () => {
		const embed = createEmbed({ ...baseDeps, isHealthy: () => true });
		const res = await embed({ texts: ['hi'] });
		expect(res.provider).toBe('mlx');
		expect(baseDeps.mlxEmbed).toHaveBeenCalled();
	});

	it('falls back to Ollama when MLX unhealthy', async () => {
		const embed = createEmbed({ ...baseDeps, isHealthy: () => false });
		const res = await embed({ texts: ['hi'] });
		expect(res.provider).toBe('ollama');
		expect(baseDeps.ollamaSemantic).toHaveBeenCalled();
	});
});
