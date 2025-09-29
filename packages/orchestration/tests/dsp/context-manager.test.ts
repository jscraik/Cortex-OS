/**
 * Planning Context Manager Test Suite
 * Tests context quarantine, isolation, and history management
 * Validates brAInwav-enhanced DSP context patterns for multi-tenant planning
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ContextConfig, PlanningContextManager } from '../../src/lib/context-manager.js';
import { type PlanningContext, PlanningPhase } from '../../src/utils/dsp.js';

describe('Planning Context Manager - Phase 11 DSP Integration', () => {
	let contextManager: PlanningContextManager;
	let config: ContextConfig;

	beforeEach(() => {
		config = {
			maxContexts: 10,
			historyRetentionMs: 300000, // 5 minutes
			quarantineEnabled: true,
			autoCleanupEnabled: true,
			brainwavTelemetryEnabled: true,
		};

		contextManager = new PlanningContextManager(config);
	});

	describe('Context Quarantine Mechanisms', () => {
		it('should quarantine contexts correctly for isolation', () => {
			const context1 = createMockContext('task-001', 'workspace-alpha');
			const context2 = createMockContext('task-002', 'workspace-beta');

			contextManager.createContext(context1);
			contextManager.createContext(context2);

			// Contexts from different workspaces should be quarantined
			const activeContexts = contextManager.getActiveContexts();
			expect(activeContexts).toHaveLength(2);

			const workspace1Contexts = contextManager.getContextsByWorkspace('workspace-alpha');
			const workspace2Contexts = contextManager.getContextsByWorkspace('workspace-beta');

			expect(workspace1Contexts).toHaveLength(1);
			expect(workspace2Contexts).toHaveLength(1);
			expect(workspace1Contexts[0].id).toBe('task-001');
			expect(workspace2Contexts[0].id).toBe('task-002');
		});

		it('should prevent cross-workspace context contamination', () => {
			const context1 = createMockContext('task-001', 'workspace-alpha');
			const context2 = createMockContext('task-002', 'workspace-alpha');

			contextManager.createContext(context1);
			contextManager.createContext(context2);

			// Add sensitive data to first context
			contextManager.updateContextHistory('task-001', {
				decision: 'Sensitive alpha decision',
				outcome: 'success',
				learned: 'Alpha-specific learning',
				timestamp: new Date(),
			});

			// Second context should not have access to first context's data
			const context2Data = contextManager.getContext('task-002');
			expect(context2Data?.history.some((h) => h.decision.includes('alpha'))).toBe(false);
		});

		it('should enforce quarantine boundaries during context operations', () => {
			const alphaContext = createMockContext('alpha-task', 'workspace-alpha');
			const betaContext = createMockContext('beta-task', 'workspace-beta');

			contextManager.createContext(alphaContext);
			contextManager.createContext(betaContext);

			// Try to access beta context from alpha workspace
			const crossAccessResult = contextManager
				.getContextsByWorkspace('workspace-alpha')
				.find((c) => c.id === 'beta-task');

			expect(crossAccessResult).toBeUndefined();
		});

		it('should maintain quarantine metadata for audit trails', () => {
			const context = createMockContext('audit-task', 'workspace-audit');
			contextManager.createContext(context);

			const quarantineInfo = contextManager.getQuarantineInfo('audit-task');

			expect(quarantineInfo).toBeDefined();
			expect(quarantineInfo?.workspaceId).toBe('workspace-audit');
			expect(quarantineInfo?.createdAt).toBeInstanceOf(Date);
			expect(quarantineInfo?.brainwavCreated).toBe(true);
		});
	});

	describe('Context Isolation Validation', () => {
		it('should isolate planning state between contexts', () => {
			const context1 = createMockContext('isolated-1', 'workspace-1');
			const context2 = createMockContext('isolated-2', 'workspace-1');

			contextManager.createContext(context1);
			contextManager.createContext(context2);

			// Advance first context to STRATEGY phase
			contextManager.advancePhase('isolated-1', PlanningPhase.STRATEGY, 'Strategic planning');

			// Second context should remain in INITIALIZATION
			const ctx1 = contextManager.getContext('isolated-1');
			const ctx2 = contextManager.getContext('isolated-2');

			expect(ctx1?.currentPhase).toBe(PlanningPhase.STRATEGY);
			expect(ctx2?.currentPhase).toBe(PlanningPhase.INITIALIZATION);
		});

		it('should prevent state leakage between isolated contexts', () => {
			const context1 = createMockContext('leak-test-1', 'workspace-shared');
			const context2 = createMockContext('leak-test-2', 'workspace-shared');

			contextManager.createContext(context1);
			contextManager.createContext(context2);

			// Add steps to first context
			contextManager.addContextStep('leak-test-1', {
				phase: PlanningPhase.ANALYSIS,
				action: 'Detailed analysis of sensitive data',
				status: 'completed',
				timestamp: new Date(),
				result: { sensitive: 'classified information' },
			});

			// Second context should not see first context's steps
			const ctx2 = contextManager.getContext('leak-test-2');
			expect(ctx2?.steps.some((s) => s.action.includes('sensitive'))).toBe(false);
		});

		it('should maintain context boundaries during concurrent operations', async () => {
			const contexts = Array.from({ length: 5 }, (_, i) =>
				createMockContext(`concurrent-${i}`, 'workspace-concurrent'),
			);

			// Create contexts concurrently
			await Promise.all(contexts.map((ctx) => Promise.resolve(contextManager.createContext(ctx))));

			// Verify all contexts exist and are isolated
			const allContexts = contextManager.getContextsByWorkspace('workspace-concurrent');
			expect(allContexts).toHaveLength(5);

			// Each context should have unique ID and clean state
			allContexts.forEach((ctx, index) => {
				expect(ctx.id).toBe(`concurrent-${index}`);
				expect(ctx.steps).toHaveLength(0);
				expect(ctx.history).toHaveLength(0);
			});
		});
	});

	describe('History Management and Trimming', () => {
		it('should trim context history when size limits are exceeded', () => {
			const context = createMockContext('history-test', 'workspace-history');
			contextManager.createContext(context);

			// Add many history entries
			for (let i = 0; i < 100; i++) {
				contextManager.updateContextHistory('history-test', {
					decision: `Decision ${i}`,
					outcome: i % 2 === 0 ? 'success' : 'failure',
					learned: `Learning ${i}`,
					timestamp: new Date(Date.now() - i * 1000),
				});
			}

			// Trigger history trimming
			contextManager.trimContextHistory('history-test', 50);

			const trimmedContext = contextManager.getContext('history-test');
			expect(trimmedContext?.history).toHaveLength(50);

			// Should keep most recent entries
			expect(trimmedContext?.history[0].decision).toBe('Decision 99');
		});

		it('should auto-cleanup expired contexts based on retention policy', async () => {
			const shortRetentionConfig = { ...config, historyRetentionMs: 100 };
			const shortRetentionManager = new PlanningContextManager(shortRetentionConfig);

			const expiredContext = createMockContext('expired-test', 'workspace-cleanup');
			expiredContext.metadata.createdAt = new Date(Date.now() - 200); // 200ms ago

			shortRetentionManager.createContext(expiredContext);

			// Wait for retention period to pass
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Trigger cleanup
			const cleanedCount = shortRetentionManager.cleanupExpiredContexts();

			expect(cleanedCount).toBe(1);
			expect(shortRetentionManager.getContext('expired-test')).toBeNull();
		});

		it('should preserve critical context data during cleanup', () => {
			const context = createMockContext('critical-test', 'workspace-critical');
			context.metadata.priority = 10; // Mark as critical

			contextManager.createContext(context);

			// Add critical decision
			contextManager.updateContextHistory('critical-test', {
				decision: 'Critical security decision',
				outcome: 'success',
				learned: 'Important security pattern',
				timestamp: new Date(),
			});

			// Attempt cleanup (should preserve critical context)
			const cleanedCount = contextManager.cleanupExpiredContexts();

			expect(cleanedCount).toBe(0);
			expect(contextManager.getContext('critical-test')).toBeDefined();
		});

		it('should maintain history integrity during trimming operations', () => {
			const context = createMockContext('integrity-test', 'workspace-integrity');
			contextManager.createContext(context);

			// Add chronological history entries
			const timestamps = Array.from(
				{ length: 20 },
				(_, i) => new Date(Date.now() - (19 - i) * 1000),
			);

			timestamps.forEach((timestamp, i) => {
				contextManager.updateContextHistory('integrity-test', {
					decision: `Decision ${i}`,
					outcome: 'success',
					learned: `Learning ${i}`,
					timestamp,
				});
			});

			// Trim to 10 entries
			contextManager.trimContextHistory('integrity-test', 10);

			const trimmedContext = contextManager.getContext('integrity-test');
			const history = trimmedContext?.history || [];

			// Verify chronological order is maintained
			for (let i = 1; i < history.length; i++) {
				expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
					history[i - 1].timestamp.getTime(),
				);
			}
		});
	});

	describe('Context Resource Management', () => {
		it('should enforce maximum context limits', () => {
			const limitedConfig = { ...config, maxContexts: 3 };
			const limitedManager = new PlanningContextManager(limitedConfig);

			// Create contexts up to limit
			for (let i = 0; i < 3; i++) {
				const context = createMockContext(`limited-${i}`, 'workspace-limited');
				limitedManager.createContext(context);
			}

			// Attempt to create one more (should fail or trigger cleanup)
			const overflowContext = createMockContext('overflow', 'workspace-limited');
			const _result = limitedManager.createContext(overflowContext);

			const activeContexts = limitedManager.getActiveContexts();
			expect(activeContexts.length).toBeLessThanOrEqual(3);
		});

		it('should prioritize high-value contexts during resource pressure', () => {
			const limitedConfig = { ...config, maxContexts: 2 };
			const limitedManager = new PlanningContextManager(limitedConfig);

			// Create low priority context
			const lowPriorityContext = createMockContext('low-priority', 'workspace-priority');
			lowPriorityContext.metadata.priority = 2;
			limitedManager.createContext(lowPriorityContext);

			// Create high priority context
			const highPriorityContext = createMockContext('high-priority', 'workspace-priority');
			highPriorityContext.metadata.priority = 9;
			limitedManager.createContext(highPriorityContext);

			// Create another high priority context (should evict low priority)
			const anotherHighContext = createMockContext('another-high', 'workspace-priority');
			anotherHighContext.metadata.priority = 8;
			limitedManager.createContext(anotherHighContext);

			const activeContexts = limitedManager.getActiveContexts();
			const lowPriorityExists = activeContexts.some((c) => c.id === 'low-priority');

			expect(lowPriorityExists).toBe(false);
		});
	});

	describe('brAInwav Telemetry Integration', () => {
		it('should emit telemetry events for context operations', () => {
			const telemetrySpy = vi.fn();
			contextManager.onTelemetry(telemetrySpy);

			const context = createMockContext('telemetry-test', 'workspace-telemetry');
			contextManager.createContext(context);

			expect(telemetrySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					event: 'context_created',
					contextId: 'telemetry-test',
					brainwavOrigin: true,
				}),
			);
		});

		it('should track context lifecycle metrics', () => {
			const context = createMockContext('metrics-test', 'workspace-metrics');
			contextManager.createContext(context);

			const metrics = contextManager.getContextMetrics('metrics-test');

			expect(metrics).toBeDefined();
			expect(metrics?.createdAt).toBeInstanceOf(Date);
			expect(metrics?.updatedAt).toBeInstanceOf(Date);
			expect(metrics?.brainwavTracked).toBe(true);
		});
	});
});

// Helper function to create mock planning contexts
function createMockContext(id: string, workspaceId: string): PlanningContext {
	return {
		id,
		workspaceId,
		currentPhase: PlanningPhase.INITIALIZATION,
		steps: [],
		history: [],
		metadata: {
			createdBy: 'brAInwav',
			createdAt: new Date(),
			updatedAt: new Date(),
			complexity: 5,
			priority: 5,
		},
	};
}
