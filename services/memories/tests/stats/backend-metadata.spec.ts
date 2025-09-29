import { describe, expect, it } from 'vitest';
import { LocalMemoryBackend, MemoryHealthChecker } from '../../src/health/memoryHealth.js';
import { MemoryStatsService } from '../../src/stats/memoryStats.js';

describe('MemoryStatsService', () => {
        it('reports metadata for the active backend', async () => {
                const backend = new LocalMemoryBackend(new Map([['seed', 'value']]));
                const checker = new MemoryHealthChecker(new Map([[backend.id, backend]]), backend.id);
                const service = new MemoryStatsService(checker);

                const stats = await service.collect();
                expect(stats.backendId).toBe('local-memory');
                expect(stats.health.status).toBe('ok');
                expect(stats.metadata).toMatchObject({ entries: 2 });
        });
});
