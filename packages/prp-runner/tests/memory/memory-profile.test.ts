import { describe, expect, it } from 'vitest';
import { createAICapabilities } from '../../src/ai-capabilities.js';
import { EmbeddingAdapter } from '../../src/embedding-adapter.js';
import { forceGC, getActiveResources, measureHeapUsed } from '../../src/lib/testing/memory-utils.js';

// Ensure tests only run when Node GC is exposed
const hasGC = typeof (global as unknown as { gc?: () => void }).gc === 'function';

describe.skipIf(!hasGC)('Memory Profile', () => {
	it('should measure baseline memory usage', () => {
		const baseline = process.memoryUsage();
		expect(baseline.heapUsed).toBeLessThan(100 * 1024 * 1024);
	});

	it('should not leak memory during AI initialization', async () => {
		const before = measureHeapUsed();
		const ai = createAICapabilities('minimal' as any);
		await ai.shutdown();
		await forceGC();
		const after = measureHeapUsed();
		expect(after - before).toBeLessThan(10 * 1024 * 1024);
	});

	it('should clean up embeddings after use', async () => {
		const adapter = new EmbeddingAdapter({ provider: 'local' });
		const before = measureHeapUsed();
		await adapter.generateEmbeddings('test');
		await adapter.shutdown();
		await forceGC();
		const after = measureHeapUsed();
		expect(after - before).toBeLessThan(5 * 1024 * 1024);
	});
});

// Capture baseline resource counts once for this file
const baselineResources = getActiveResources();

describe('Test Isolation', () => {
	it('should properly clean up after each test', () => {
		// Verify no global state pollution expected by plan
		expect((global as Record<string, unknown>).__testState).toBeUndefined();
	});

	it('should release all resources in afterEach', () => {
		const resources = getActiveResources();
		expect(resources.handles).toBeLessThanOrEqual(baselineResources.handles);
		expect(resources.requests).toBeLessThanOrEqual(baselineResources.requests);
	});
});
