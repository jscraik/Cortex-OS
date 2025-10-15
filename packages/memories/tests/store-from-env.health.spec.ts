import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Memory } from '../src/domain/types.js';
import { createStoreFromEnv } from '../src/config/store-from-env.js';

const ORIGINAL_ENV = { ...process.env };
const originalFetch = globalThis.fetch;

describe('createStoreFromEnv remote compatibility', () => {
        beforeEach(() => {
                process.env = { ...ORIGINAL_ENV };
        });

        afterEach(() => {
                vi.restoreAllMocks();
                if (originalFetch) {
                        globalThis.fetch = originalFetch;
                } else {
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        delete (globalThis as Record<string, unknown>).fetch;
                }
        });

        afterAll(() => {
                process.env = ORIGINAL_ENV;
        });

        it('falls back to the local provider when remote requests fail', async () => {
                process.env.LOCAL_MEMORY_BASE_URL = 'http://127.0.0.1:3999/api/v1';
                process.env.LOCAL_MEMORY_API_KEY = 'test';

                const failingFetch = vi
                        .fn<typeof fetch>()
                        .mockRejectedValue(new Error('remote service unavailable'));
                vi.stubGlobal('fetch', failingFetch);

                const store = await createStoreFromEnv();

                const sample: Memory = {
                        id: 'legacy-1',
                        kind: 'note',
                        text: 'remote fallback validation',
                        tags: ['test'],
                        createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
                        updatedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
                        provenance: { source: 'system' },
                };

                await expect(store.upsert(sample)).resolves.toMatchObject({ id: 'legacy-1' });

                const fetched = await store.get('legacy-1');
                expect(fetched?.id).toBe('legacy-1');
                expect(fetched?.text).toBe('remote fallback validation');
                expect(failingFetch).toHaveBeenCalled();
        });
});
