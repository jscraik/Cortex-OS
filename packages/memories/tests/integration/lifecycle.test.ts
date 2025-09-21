import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LifecycleMemoryStore } from '../../src/adapters/store.lifecycle.js';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { createMemory } from '../test-utils.js';

describe('LifecycleMemoryStore', () => {
  let baseStore: InMemoryStore;
  let lifecycleStore: LifecycleMemoryStore;
  let namespace: string;

  beforeEach(() => {
    vi.clearAllMocks();
    baseStore = new InMemoryStore();
    namespace = `test-${Math.random().toString(36).substring(7)}`;
  });

  afterEach(async () => {
    // Clean up
    const allMemories = await baseStore.list(namespace);
    for (const memory of allMemories) {
      await baseStore.delete(memory.id, namespace);
    }
  });

  describe('Stage Transitions', () => {
    it('should track memory lifecycle stages', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        stages: {
          enabled: true,
          defaultStage: 'draft',
          stages: ['draft', 'active', 'archived', 'deleted'],
          transitions: {
            draft: ['active', 'deleted'],
            active: ['archived', 'deleted'],
            archived: ['deleted'],
            deleted: []
          }
        }
      });

      const memory = createMemory({ text: 'Test memory' });
      const result = await lifecycleStore.upsert(memory, namespace);

      expect(result.lifecycle).toBeDefined();
      expect(result.lifecycle.stage).toBe('draft');
      expect(result.lifecycle.createdAt).toBeDefined();
      expect(result.lifecycle.history).toHaveLength(1);
    });

    it('should enforce valid stage transitions', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        stages: {
          enabled: true,
          defaultStage: 'draft',
          stages: ['draft', 'active', 'archived', 'deleted'],
          transitions: {
            draft: ['active', 'deleted'],
            active: ['archived', 'deleted'],
            archived: ['deleted'],
            deleted: []
          }
        }
      });

      const memory = createMemory({ text: 'Test memory' });
      await lifecycleStore.upsert(memory, namespace);

      // Valid transition
      let updated = await lifecycleStore.transitionTo(memory.id, 'active', namespace);
      expect(updated.lifecycle.stage).toBe('active');

      // Invalid transition - should throw
      await expect(lifecycleStore.transitionTo(memory.id, 'draft', namespace))
        .rejects.toThrow('Invalid transition from active to draft');
    });

    it('should track stage transition history', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        stages: {
          enabled: true,
          defaultStage: 'draft',
          stages: ['draft', 'active', 'archived'],
          transitions: {
            draft: ['active'],
            active: ['archived'],
            archived: []
          }
        }
      });

      const memory = createMemory({ text: 'Test memory' });
      await lifecycleStore.upsert(memory, namespace);

      await lifecycleStore.transitionTo(memory.id, 'active', namespace);
      await lifecycleStore.transitionTo(memory.id, 'archived', namespace);

      const final = await lifecycleStore.get(memory.id, namespace);
      expect(final?.lifecycle.history).toHaveLength(3);
      expect(final?.lifecycle.history[0].stage).toBe('draft');
      expect(final?.lifecycle.history[1].stage).toBe('active');
      expect(final?.lifecycle.history[2].stage).toBe('archived');
    });

    it('should support custom transition logic', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        stages: {
          enabled: true,
          defaultStage: 'draft',
          stages: ['draft', 'review', 'approved'],
          transitions: {
            draft: ['review'],
            review: ['approved'],
            approved: []
          },
          customTransitions: {
            'draft->review': async (memory, context) => {
              if (!memory.metadata?.reviewer) {
                throw new Error('Reviewer required for review');
              }
            }
          }
        }
      });

      const memory = createMemory({
        text: 'Test memory',
        metadata: { reviewer: 'john.doe@example.com' }
      });
      await lifecycleStore.upsert(memory, namespace);

      // Should succeed with reviewer
      await expect(lifecycleStore.transitionTo(memory.id, 'review', namespace))
        .resolves.not.toThrow();
    });
  });

  describe('Retention Policies', () => {
    it('should automatically archive old memories', async () => {
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        retention: {
          enabled: true,
          policies: [
            {
              name: 'archive-old',
              condition: {
                stage: 'active',
                age: '90d'
              },
              action: 'archive'
            }
          ],
          checkInterval: 1000
        }
      });

      // Create old memory
      const oldMemory = createMemory({
        text: 'Old memory',
        createdAt: oldDate
      });
      // Set it to active stage to match retention policy
      await lifecycleStore.upsert(oldMemory, namespace);
      await lifecycleStore.transitionTo(oldMemory.id, 'active', namespace);

      // Apply retention policies
      const results = await lifecycleStore.applyRetentionPolicies(namespace);
      expect(results.archived).toBeGreaterThan(0);

      const retrieved = await lifecycleStore.get(oldMemory.id, namespace);
      expect(retrieved?.lifecycle.stage).toBe('archived');
    });

    it('should delete memories after retention period', async () => {
      const veryOldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        retention: {
          enabled: true,
          policies: [
            {
              name: 'delete-very-old',
              condition: {
                age: '365d'
              },
              action: 'delete'
            }
          ]
        }
      });

      const veryOldMemory = createMemory({
        text: 'Very old memory',
        createdAt: veryOldDate
      });
      await lifecycleStore.upsert(veryOldMemory, namespace);

      const results = await lifecycleStore.applyRetentionPolicies(namespace);
      expect(results.deleted).toBe(1);

      const retrieved = await lifecycleStore.get(veryOldMemory.id, namespace);
      expect(retrieved).toBeNull();
    });

    it('should respect stage-specific retention', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        retention: {
          enabled: true,
          policies: [
            {
              name: 'archive-drafts',
              condition: {
                stage: 'draft',
                age: '30d'
              },
              action: 'archive'
            }
          ]
        }
      });

      const draftMemory = createMemory({
        text: 'Draft memory',
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      });
      draftMemory.lifecycle = { stage: 'draft', createdAt: draftMemory.createdAt, history: [] };
      await lifecycleStore.upsert(draftMemory, namespace);

      const results = await lifecycleStore.applyRetentionPolicies(namespace);
      expect(results.archived).toBe(1);
    });
  });

  describe('Compaction', () => {
    it('should compact similar memories in same stage', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        compaction: {
          enabled: true,
          strategies: [
            {
              name: 'consolidate-similar',
              stage: 'active',
              similarity: 0.5,
              maxSize: 1000
            }
          ]
        }
      });

      const memories = [
        createMemory({ text: 'Meeting about project status' }),
        createMemory({ text: 'Project status meeting discussion' }),
        createMemory({ text: 'Discussion about project status meeting' })
      ];

      for (const memory of memories) {
        memory.lifecycle = { stage: 'active', createdAt: memory.createdAt, history: [] };
        await lifecycleStore.upsert(memory, namespace);
      }

      const results = await lifecycleStore.compactMemories(namespace);
      expect(results.consolidated.length).toBeGreaterThan(0);
      expect(results.originalCount).toBe(3);
    });

    it('should preserve lifecycle information during compaction', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        compaction: {
          enabled: true,
          strategies: [
            {
              name: 'consolidate',
              stage: 'draft',
              similarity: 0.5,
              preserveLifecycle: true
            }
          ]
        }
      });

      const memory1 = createMemory({ text: 'Draft document v1' });
      memory1.lifecycle = {
        stage: 'draft',
        createdAt: memory1.createdAt,
        history: [{ stage: 'draft', timestamp: memory1.createdAt, reason: 'created' }]
      };

      const memory2 = createMemory({ text: 'Draft document v2' });
      memory2.lifecycle = {
        stage: 'draft',
        createdAt: memory2.createdAt,
        history: [{ stage: 'draft', timestamp: memory2.createdAt, reason: 'created' }]
      };

      await lifecycleStore.upsert(memory1, namespace);
      await lifecycleStore.upsert(memory2, namespace);

      const results = await lifecycleStore.compactMemories(namespace);
      expect(results.consolidated.length).toBeGreaterThan(0);
      const consolidated = await lifecycleStore.get(results.consolidated[0].id, namespace);

      expect(consolidated?.lifecycle.compactedFrom).toHaveLength(2);
      expect(consolidated?.lifecycle.originalStages).toContain('draft');
    });
  });

  describe('Archival', () => {
    it('should move memories to cold storage', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        archival: {
          enabled: true,
          coldStorage: {
            provider: 'memory', // For testing
            conditions: [
              {
                stage: 'archived',
                age: '30d'
              }
            ]
          }
        }
      });

      const archivedMemory = createMemory({ text: 'To be archived' });
      archivedMemory.lifecycle = {
        stage: 'archived',
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        history: []
      };
      await lifecycleStore.upsert(archivedMemory, namespace);

      const results = await lifecycleStore.archiveToColdStorage(namespace);
      expect(results.archived).toBe(1);

      // Should still be accessible but marked as in cold storage
      const retrieved = await lifecycleStore.get(archivedMemory.id, namespace);
      expect(retrieved?.lifecycle.coldStorage).toBe(true);
    });

    it('should support retrieving from cold storage', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        archival: {
          enabled: true,
          coldStorage: {
            provider: 'memory',
            autoRetrieve: true
          }
        }
      });

      const memory = createMemory({ text: 'Cold storage test' });
      memory.lifecycle = {
        stage: 'archived',
        createdAt: memory.createdAt,
        history: [],
        coldStorage: true,
        coldStorageId: 'cold-123'
      };
      await lifecycleStore.upsert(memory, namespace);

      const retrieved = await lifecycleStore.get(memory.id, namespace);
      expect(retrieved?.text).toBe('Cold storage test');
    });
  });

  describe('Metadata and Analytics', () => {
    it('should provide lifecycle analytics', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        stages: {
          enabled: true,
          defaultStage: 'draft',
          stages: ['draft', 'active', 'archived']
        }
      });

      const memories = [
        createMemory({ text: 'Draft 1' }),
        createMemory({ text: 'Draft 2' }),
        createMemory({ text: 'Active 1' })
      ];

      await lifecycleStore.upsert(memories[0], namespace);
      await lifecycleStore.upsert(memories[1], namespace);

      const activeMem = memories[2];
      await lifecycleStore.upsert(activeMem, namespace);
      await lifecycleStore.transitionTo(activeMem.id, 'active', namespace);

      // Add small delay to ensure all operations complete
      await new Promise(resolve => setTimeout(resolve, 10));

      const analytics = await lifecycleStore.getLifecycleAnalytics(namespace);
      expect(analytics.byStage.draft).toBe(2);
      expect(analytics.byStage.active).toBe(1);
      expect(analytics.totalTransitions).toBe(4); // 2 initial + 1 transition + 1 initial for activeMem
    });

    it('should track lifecycle metrics', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        stages: {
          enabled: true,
          defaultStage: 'draft',
          stages: ['draft', 'active'],
        },
        metrics: {
          enabled: true
        }
      });

      const memory = createMemory({ text: 'Test memory' });
      await lifecycleStore.upsert(memory, namespace);
      await lifecycleStore.transitionTo(memory.id, 'active', namespace);

      const metrics = await lifecycleStore.getLifecycleMetrics(namespace);
      expect(metrics.transitions.draft_to_active).toBe(1);
      expect(metrics.averageTimeInStage.draft).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate stage configurations', () => {
      expect(() => {
        new LifecycleMemoryStore(baseStore, {
          stages: {
            enabled: true,
            defaultStage: 'draft',
            stages: ['draft', 'active'],
            transitions: {
              draft: ['active'],
              active: ['draft'] // Invalid cycle
            }
          }
        });
      }).toThrow('Cycle detected in stage transitions');
    });

    it('should handle missing lifecycle gracefully', async () => {
      lifecycleStore = new LifecycleMemoryStore(baseStore, {
        stages: {
          enabled: true,
          defaultStage: 'draft'
        }
      });

      const memory = createMemory({ text: 'Test memory' });
      await lifecycleStore.upsert(memory, namespace);

      const retrieved = await lifecycleStore.get(memory.id, namespace);
      expect(retrieved?.lifecycle).toBeDefined();
    });
  });
});