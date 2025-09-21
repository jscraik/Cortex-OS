import { describe, expect, it } from 'vitest';
import { QwenEmbedding } from '../../src/lib/embedding/qwen-embedding';
import { MLXAdapter } from '../../src/mlx-adapter';

// Simple sleep helper
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('MLX Memory Management', () => {
    it('should unload models after timeout', async () => {
        const adapter = new MLXAdapter({
            modelName: 'Qwen2.5-0.5B-Instruct-4bit',
            autoUnload: true,
            unloadTimeout: 100,
        });

        await adapter.load();
        const loaded = adapter.isLoaded();
        expect(loaded).toBe(true);

        await sleep(150);
        expect(adapter.isLoaded()).toBe(false);
    });

    it('should limit model cache size', async () => {
        const adapter = new MLXAdapter({ modelName: 'Qwen2.5-0.5B-Instruct-4bit', maxCacheSize: 1 });
        await adapter.loadModel('model1');
        await adapter.loadModel('model2');

        const cached = adapter.getCachedModels();
        expect(cached).toHaveLength(1);
        expect(cached[0]).toBe('model2');
    });
});

describe('Embedding Memory Management', () => {
    it('should release embedding tensors', async () => {
        const embedder = new QwenEmbedding();
        const tensor = await embedder.encode('test');
        expect(tensor).toBeDefined();

        embedder.releaseTensor(tensor);
        expect(() => tensor.data()).toThrow('Tensor released');
    });

    it('should batch process with memory limit', async () => {
        const embedder = new QwenEmbedding({ maxBatchMemory: 50 * 1024 * 1024 });

        const docs = Array(1000).fill('test document');
        const batches = await embedder.batchProcess(docs);

        expect(batches.length).toBeGreaterThan(1);
    });
});
