import { describe, expect, it, vi } from 'vitest';
import { getResourcePoolHealth } from '../../src/health/poolHealth.js';

describe('Resource pool health', () => {
        it('returns live pool counts without static placeholders', async () => {
                const pool = {
                        id: 'llm',
                        describe: vi.fn()
                                .mockResolvedValueOnce({ available: 4, busy: 6, capacity: 10 })
                                .mockResolvedValueOnce({ available: 5, busy: 5, capacity: 10 }),
                };

                const firstSnapshot = await getResourcePoolHealth([pool]);
                expect(firstSnapshot[0]).toMatchObject({
                        available: 4,
                        busy: 6,
                        capacity: 10,
                        saturation: 0.6,
                });

                const secondSnapshot = await getResourcePoolHealth([pool]);
                expect(secondSnapshot[0]).toMatchObject({
                        available: 5,
                        busy: 5,
                        capacity: 10,
                        saturation: 0.5,
                });
                expect(pool.describe).toHaveBeenCalledTimes(2);
        });
});
