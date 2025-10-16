import { beforeEach, describe, expect, it } from 'vitest';
import { LocalMemoryProvider } from '../providers/LocalMemoryProvider.js';

function createProvider(): LocalMemoryProvider {
        return new LocalMemoryProvider({
                maxRecords: 100,
                maxLimit: 50,
        });
}

describe('LocalMemoryProvider SQL injection hardening', () => {
        let provider: LocalMemoryProvider;

        beforeEach(() => {
                provider = createProvider();
        });

        it('stores and retrieves memories without mutating data during search', async () => {
                const { id } = await provider.store({
                        text: 'Secure storage record',
                        tags: ['alpha', 'beta'],
                        meta: { tenant: 'tenant-a' },
                });

                const result = await provider.search({ query: 'secure', topK: 5 });
                expect(result.hits).toHaveLength(1);
                expect(result.hits[0].id).toBe(id);

                const stored = await provider.get({ id });
                expect(stored.text).toBe('Secure storage record');
                expect(stored.tags).toEqual(['alpha', 'beta']);
                expect(stored.meta).toEqual({ tenant: 'tenant-a' });
        });

        it('neutralises injection attempts in the query string', async () => {
                const { id } = await provider.store({ text: 'Normal entry', tags: ['reports'] });

                const maliciousQuery = "'; DROP TABLE memories; --";
                const search = await provider.search({ query: maliciousQuery, topK: 5 });
                expect(search.hits).toHaveLength(0);

                const plan = provider.getLastSearchPlanForTesting();
                expect(plan?.sql).toMatch(/WHERE\s+LOWER\(text\)\s+LIKE\s+\?/i);
                expect(plan?.sql).not.toContain("DROP TABLE");
                expect(plan?.params[0]).toBe(`%${maliciousQuery.trim().toLowerCase()}%`);

                // Database should remain intact after the malicious query attempt
                const followUp = await provider.search({ query: 'Normal', topK: 5 });
                expect(followUp.hits).toHaveLength(1);
                expect(followUp.hits[0].id).toBe(id);
        });

        it('sanitises filter tags before constructing SQL', async () => {
                const safe = await provider.store({
                        text: 'Tag search candidate',
                        tags: ['finance'],
                });
                await provider.store({ text: 'Another entry', tags: ['engineering'] });

                const maliciousTag = "finance') OR 1=1 --";
                const search = await provider.search({
                        query: 'candidate',
                        filterTags: [maliciousTag],
                        topK: 5,
                });
                expect(search.hits).toHaveLength(0);

                const plan = provider.getLastSearchPlanForTesting();
                expect(plan?.sql).toMatch(/json_each\(tags\)/);
                expect(plan?.sql).not.toContain("OR 1=1");
                expect(plan?.params.at(-1)).toBe(maliciousTag.toLowerCase());

                const followUp = await provider.search({ query: 'candidate', filterTags: ['finance'], topK: 5 });
                expect(followUp.hits).toHaveLength(1);
                expect(followUp.hits[0].id).toBe(safe.id);
        });
});
