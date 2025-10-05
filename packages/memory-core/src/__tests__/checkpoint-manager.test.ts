import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCheckpointManager } from '../checkpoints/index.js';

const ISO = () => new Date().toISOString();

describe('CheckpointManager', () => {
        let db: Database.Database;
        let manager: ReturnType<typeof createCheckpointManager>;

        beforeEach(() => {
                db = new Database(':memory:');
                manager = createCheckpointManager(db, {
                        policy: {
                                maxRetained: 3,
                                ttlMs: 5,
                                branchBudget: 2,
                        },
                });
        });

        afterEach(() => {
                db.close();
        });

        it('saves and loads checkpoint', async () => {
                const record = {
                        meta: {
                                id: 'ckpt_primary',
                                createdAt: ISO(),
                                labels: ['test'],
                        },
                        state: { plan: { step: 1 } },
                };

                await manager.save(record);
                const loaded = await manager.load('ckpt_primary');

                expect(loaded?.meta.id).toBe('ckpt_primary');
                expect(loaded?.state).toEqual({ plan: { step: 1 } });
        });

        it('enforces branch budget', async () => {
                const record = {
                        meta: {
                                id: 'ckpt_branch_source',
                                createdAt: ISO(),
                        },
                        state: { plan: { option: 'base' } },
                };

                await manager.save(record);

                await expect(
                        manager.branch({ from: 'ckpt_branch_source', count: 3 }),
                ).rejects.toThrowError(/branch budget/i);
        });

        it('prunes checkpoints beyond retention policy', async () => {
                const oldRecord = {
                        meta: {
                                id: 'ckpt_old',
                                createdAt: new Date(Date.now() - 100).toISOString(),
                        },
                        state: { plan: { old: true } },
                };
                await manager.save(oldRecord);

                // TTL is 5ms, ensure prune executes
                await new Promise((resolve) => setTimeout(resolve, 10));

                await manager.save({
                        meta: {
                                id: 'ckpt_new',
                                createdAt: ISO(),
                        },
                        state: { plan: { latest: true } },
                });

                const loadedOld = await manager.load('ckpt_old');
                expect(loadedOld).toBeNull();
        });
});
