import { describe, expect, it } from 'vitest';

describe('mlx helpers entrypoint', () => {
        it('exposes python-backed helpers without native clip binding', async () => {
                const mod = await import('../src/lib/mlx/index.ts');
                expect(typeof mod.generateEmbedding).toBe('function');
                expect(typeof mod.rerankDocuments).toBe('function');
        });
});
