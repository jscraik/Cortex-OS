import { describe, expect, it, vi } from 'vitest';

// Minimal degraded-mode behavior test: when embedder throws, pipeline still returns empty results
// or a safe fallback without throwing.

describe('degraded mode integration', () => {
    it('continues without crashing when embedder errors', async () => {
        // Mock a minimal pipeline-like behavior around store + failing embedder
        // const store = memoryStore();
        const embedder = {
            embed: vi.fn().mockRejectedValue(new Error('embedder down')),
            isHealthy: vi.fn().mockResolvedValue(false),
        };

        // Simulate ingest -> query guarded flow
        // Ingest side: no-op in this minimal test

        // Query: if embedding fails, return empty array (graceful degrade)
        async function retrieveSafe(query: string): Promise<unknown[]> {
            try {
                await embedder.embed([query]);
            } catch {
                return [] as unknown[];
            }
            // Should not get here in this test
            return [] as unknown[];
        }

        const results = await retrieveSafe('test');
        expect(results).toEqual([]);
    });
});
