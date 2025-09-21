import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowAwareMemoryStore } from '../../src/adapters/store.workflow.js';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { createMemory } from '../test-utils.js';

describe('WorkflowAwareMemoryStore', () => {
  let baseStore: InMemoryStore;
  let workflowStore: WorkflowAwareMemoryStore;
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

  describe('Workflow Triggers', () => {
    it('should detect content-based triggers', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          triggers: [
            {
              id: 'urgent-task',
              name: 'Urgent Task Detection',
              type: 'content',
              condition: {
                pattern: /urgent|critical|asap/i,
                field: 'text'
              },
              actions: [
                {
                  type: 'tag',
                  tags: ['urgent', 'priority-high']
                },
                {
                  type: 'notify',
                  channels: ['email', 'slack']
                }
              ]
            }
          ]
        }
      });

      const memory = createMemory({
        text: 'This is an URGENT task that needs immediate attention'
      });
      const result = await workflowStore.upsert(memory, namespace);

      expect(result.metadata?.workflowTriggers).toBeDefined();
      expect(result.metadata?.workflowTriggers).toContain('urgent-task');
      expect(result.tags).toContain('urgent');
      expect(result.tags).toContain('priority-high');
    });

    it('should detect metadata-based triggers', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          triggers: [
            {
              id: 'high-value',
              name: 'High Value Transaction',
              type: 'metadata',
              condition: {
                field: 'value',
                operator: '>',
                value: 10000
              },
              actions: [
                {
                  type: 'escalate',
                  level: 'manager'
                }
              ]
            }
          ]
        }
      });

      const memory = createMemory({
        text: 'Large purchase order',
        metadata: { value: 15000 }
      });
      const result = await workflowStore.upsert(memory, namespace);

      expect(result.metadata?.workflowTriggers).toContain('high-value');
      expect(result.metadata?.escalatedTo).toBe('manager');
    });

    it('should detect time-based triggers', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          triggers: [
            {
              id: 'follow-up',
              name: 'Follow Up Reminder',
              type: 'time',
              condition: {
                field: 'followUpDate',
                operator: 'before',
                value: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              },
              actions: [
                {
                  type: 'remind',
                  message: 'Follow up required'
                }
              ]
            }
          ]
        }
      });

      const memory = createMemory({
        text: 'Customer follow up needed',
        metadata: { followUpDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() }
      });
      const result = await workflowStore.upsert(memory, namespace);

      expect(result.metadata?.workflowTriggers).toContain('follow-up');
      expect(result.metadata?.reminders).toContain('Follow up required');
    });

    it('should detect relationship-based triggers', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          triggers: [
            {
              id: 'related-entities',
              name: 'Related Entities Detected',
              type: 'relationship',
              condition: {
                relationshipType: 'mentions',
                minCount: 3
              },
              actions: [
                {
                  type: 'categorize',
                  category: 'highly-connected'
                }
              ]
            }
          ]
        }
      });

      // Create related memories
      const memory1 = createMemory({ text: 'Project Alpha planning' });
      const memory2 = createMemory({ text: 'Project Alpha requirements' });
      const memory3 = createMemory({ text: 'Project Alpha timeline' });

      await workflowStore.upsert(memory1, namespace);
      await workflowStore.upsert(memory2, namespace);
      await workflowStore.upsert(memory3, namespace);

      const result = await workflowStore.upsert(
        createMemory({
          text: 'Project Alpha update',
          metadata: { relatedTo: [memory1.id, memory2.id, memory3.id] }
        }),
        namespace
      );

      expect(result.metadata?.workflowTriggers || []).toContain('related-entities');
      expect(result.metadata?.category).toBe('highly-connected');
    });

    it('should support composite triggers with AND/OR logic', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          triggers: [
            {
              id: 'critical-incident',
              name: 'Critical Incident',
              type: 'composite',
              condition: {
                operator: 'AND',
                rules: [
                  {
                    field: 'text',
                    pattern: /error|failure/i
                  },
                  {
                    field: 'priority',
                    operator: '=',
                    value: 'critical'
                  },
                  {
                    operator: 'OR',
                    rules: [
                      {
                        field: 'system',
                        operator: '=',
                        value: 'production'
                      },
                      {
                        field: 'usersAffected',
                        operator: '>',
                        value: 100
                      }
                    ]
                  }
                ]
              },
              actions: [
                {
                  type: 'escalate',
                  level: 'emergency'
                },
                {
                  type: 'create',
                  template: 'incident-report'
                }
              ]
            }
          ]
        }
      });

      const memory = createMemory({
        text: 'System ERROR detected',
        metadata: {
          priority: 'critical',
          system: 'production',
          usersAffected: 500
        }
      });
      const result = await workflowStore.upsert(memory, namespace);

      expect(result.metadata?.workflowTriggers).toContain('critical-incident');
      expect(result.metadata?.escalatedTo).toBe('emergency');
    });

    it('should execute custom workflow actions', async () => {
      const customAction = vi.fn().mockResolvedValue({ processed: true });

      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          triggers: [
            {
              id: 'custom-workflow',
              name: 'Custom Workflow',
              type: 'content',
              condition: {
                pattern: /process this/i,
                field: 'text'
              },
              actions: [
                {
                  type: 'custom',
                  handler: customAction
                }
              ]
            }
          ]
        }
      });

      const memory = createMemory({ text: 'Please PROCESS THIS item' });
      await workflowStore.upsert(memory, namespace);

      expect(customAction).toHaveBeenCalledWith(
        expect.objectContaining({
          memory: expect.objectContaining({ text: 'Please PROCESS THIS item' }),
          trigger: expect.objectContaining({ id: 'custom-workflow' }),
          namespace: expect.any(String),
          timestamp: expect.any(Date)
        })
      );
    });

    it('should handle trigger execution errors gracefully', async () => {
      const failingAction = vi.fn().mockRejectedValue(new Error('Action failed'));

      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          triggers: [
            {
              id: 'failing-trigger',
              name: 'Failing Trigger',
              type: 'content',
              condition: {
                pattern: /trigger error/i,
                field: 'text'
              },
              actions: [
                {
                  type: 'custom',
                  handler: failingAction
                }
              ]
            }
          ]
        }
      });

      const memory = createMemory({ text: 'This will TRIGGER ERROR' });
      const result = await workflowStore.upsert(memory, namespace);

      expect(result.metadata?.workflowErrors).toBeDefined();
      expect(result.metadata?.workflowErrors?.length).toBeGreaterThan(0);
      expect(result.metadata?.workflowErrors?.[0].triggerId).toBe('failing-trigger');
    });

    it('should support trigger conditions based on memory count', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          triggers: [
            {
              id: 'high-volume',
              name: 'High Volume Detection',
              type: 'volume',
              condition: {
                timeWindow: '1h',
                minCount: 10,
                pattern: /request/i
              },
              actions: [
                {
                  type: 'throttle',
                  limit: 5
                }
              ]
            }
          ]
        }
      });

      // Create multiple matching memories
      for (let i = 0; i < 12; i++) {
        await workflowStore.upsert(
          createMemory({ text: `Request #${i} processed` }),
          namespace
        );
      }

      const latest = await workflowStore.upsert(
        createMemory({ text: 'Latest request' }),
        namespace
      );

      expect(latest.metadata?.workflowTriggers).toContain('high-volume');
      expect(latest.metadata?.throttleLimit).toBe(5);
    });

    it('should debounce frequent triggers', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          triggers: [
            {
              id: 'debounced-trigger',
              name: 'Debounced Trigger',
              type: 'content',
              condition: {
                pattern: /frequent event/i,
                field: 'text'
              },
              debounce: {
                enabled: true,
                wait: 1000
              },
              actions: [
                {
                  type: 'notify',
                  channels: ['batch']
                }
              ]
            }
          ]
        }
      });

      // Create multiple matching memories rapidly
      const memories = [];
      for (let i = 0; i < 5; i++) {
        const memory = createMemory({ text: `FREQUENT EVENT ${i}` });
        memories.push(await workflowStore.upsert(memory, namespace));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Check that only the last one triggered
      const last = memories[memories.length - 1];
      expect(last.metadata?.workflowTriggers).toContain('debounced-trigger');
    });

    it('should track workflow execution metrics', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          metrics: {
            enabled: true
          },
          triggers: [
            {
              id: 'metric-trigger',
              name: 'Metric Trigger',
              type: 'content',
              condition: {
                pattern: /track me/i,
                field: 'text'
              },
              actions: [
                {
                  type: 'tag',
                  tags: ['tracked']
                }
              ]
            }
          ]
        }
      });

      await workflowStore.upsert(createMemory({ text: 'Please TRACK ME' }), namespace);

      const metrics = await workflowStore.getWorkflowMetrics(namespace);
      expect(metrics.triggers.executed).toBeGreaterThan(0);
      expect(metrics.triggers.byId['metric-trigger']).toBeDefined();
      expect(metrics.actions.executed).toBeGreaterThan(0);
    });
  });

  describe('Workflow Templates', () => {
    it('should apply workflow templates to memories', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          templates: [
            {
              id: 'incident-response',
              name: 'Incident Response',
              fields: {
                severity: { required: true, type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
                category: { required: true, type: 'string' },
                impact: { required: false, type: 'number' }
              },
              triggers: [
                {
                  condition: {
                    pattern: /incident/i,
                    field: 'text'
                  },
                  actions: [
                    {
                      type: 'set-status',
                      status: 'investigating'
                    }
                  ]
                }
              ]
            }
          ]
        }
      });

      const memory = createMemory({
        text: 'New security incident detected',
        metadata: {
          workflowTemplate: 'incident-response',
          severity: 'high',
          category: 'security',
          impact: 50
        }
      });
      const result = await workflowStore.upsert(memory, namespace);

      expect(result.metadata?.workflowTemplate).toBe('incident-response');
      expect(result.metadata?.status).toBe('investigating');
    });

    it('should validate template fields', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          templates: [
            {
              id: 'structured-data',
              name: 'Structured Data',
              fields: {
                type: { required: true, type: 'string' },
                priority: { required: true, type: 'number', min: 1, max: 10 }
              }
            }
          ]
        }
      });

      const memory = createMemory({
        text: 'Test data',
        metadata: {
          workflowTemplate: 'structured-data',
          type: 'bug',
          priority: 15 // Invalid - exceeds max
        }
      });

      await expect(workflowStore.upsert(memory, namespace))
        .rejects.toThrow('Value for field \'priority\' exceeds maximum');
    });
  });

  describe('Workflow Chains', () => {
    it('should execute sequential workflows', async () => {
      workflowStore = new WorkflowAwareMemoryStore(baseStore, {
        workflows: {
          enabled: true,
          chains: [
            {
              id: 'approval-chain',
              name: 'Approval Chain',
              steps: [
                {
                  trigger: {
                    condition: {
                      pattern: /request approval/i,
                      field: 'text'
                    }
                  },
                  actions: [
                    {
                      type: 'set-status',
                      status: 'pending-review'
                    }
                  ]
                },
                {
                  trigger: {
                    condition: {
                      field: 'status',
                      operator: '=',
                      value: 'pending-review'
                    }
                  },
                  actions: [
                    {
                      type: 'escalate',
                      level: 'manager'
                    }
                  ]
                }
              ]
            }
          ]
        }
      });

      // Initial request
      const memory = createMemory({ text: 'Request APPROVAL for purchase' });
      let result = await workflowStore.upsert(memory, namespace);

      expect(result.metadata?.status).toBe('pending-review');

      // Update status to trigger next step
      result.metadata = { ...result.metadata, status: 'pending-review' };
      result = await workflowStore.upsert(result, namespace);

      expect(result.metadata?.escalatedTo).toBe('manager');
    });
  });
});