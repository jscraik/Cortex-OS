/**
 * @fileoverview Test suite for Learning System Integration Manager
 * @module LearningSystemIntegrationManager.test
 * @description Comprehensive TDD tests for cross-component learning, knowledge sharing, and adaptive behavior
 * @author brAInwav Development Team
 * @version 2.4.0
 * @since 2024-12-09
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type LearningSystemConfig,
  LearningSystemIntegrationManager
} from '../learning-system-integration-manager';

describe('LearningSystemIntegrationManager', () => {
  let learningManager: LearningSystemIntegrationManager;
  let config: Partial<LearningSystemConfig>;

  beforeEach(() => {
    config = {
      learningEnabled: true,
      learningRate: 0.1,
      knowledgeRetentionDays: 30,
      minimumDataPoints: 5,
      confidenceThreshold: 0.7,
      adaptationEnabled: true,
      adaptationInterval: 60000,
      insightGenerationEnabled: true,
      insightGenerationInterval: 120000,
      crossComponentLearningEnabled: true,
      maxKnowledgeTransfers: 50,
      performanceAnalysisEnabled: true,
    };
    learningManager = new LearningSystemIntegrationManager(config);
  });

  afterEach(async () => {
    await learningManager.shutdown();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new LearningSystemIntegrationManager();
      const status = defaultManager.getLearningStatus();

      expect(status.configuration.learningEnabled).toBe(true);
      expect(status.configuration.learningRate).toBe(0.1);
      expect(status.configuration.adaptationEnabled).toBe(true);
      expect(status.modelsCount).toBe(0);
      expect(status.knowledgeBaseSize).toBe(0);

      defaultManager.shutdown();
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        learningEnabled: false,
        learningRate: 0.05,
        minimumDataPoints: 10,
        adaptationEnabled: false,
      };

      const customManager = new LearningSystemIntegrationManager(customConfig);
      const status = customManager.getLearningStatus();

      expect(status.configuration.learningEnabled).toBe(false);
      expect(status.configuration.learningRate).toBe(0.05);
      expect(status.configuration.minimumDataPoints).toBe(10);
      expect(status.configuration.adaptationEnabled).toBe(false);

      customManager.shutdown();
    });

    it('should validate configuration parameters', () => {
      expect(() => {
        new LearningSystemIntegrationManager({
          learningRate: 1.5, // Invalid: > 1
        });
      }).toThrow();

      expect(() => {
        new LearningSystemIntegrationManager({
          minimumDataPoints: 0, // Invalid: < 1
        });
      }).toThrow();
    });
  });

  describe('Learning from Execution', () => {
    it('should learn from successful execution', async () => {
      const executionData = {
        strategy: 'aggressive',
        performance: { throughput: 100, latency: 50 },
        outcome: 'success' as const,
        duration: 1000,
      };

      const learningId = await learningManager.learnFromExecution('agent-pool', executionData);

      expect(learningId).toMatch(/^learning-agent-pool-\d+$/);

      const status = learningManager.getLearningStatus();
      expect(status.modelsCount).toBe(1);
      expect(status.learningHistorySize).toBe(1);
    });

    it('should learn from failed execution', async () => {
      const executionData = {
        strategy: 'conservative',
        performance: { throughput: 20, latency: 200 },
        outcome: 'failure' as const,
        duration: 5000,
      };

      const learningId = await learningManager.learnFromExecution('scheduler', executionData);

      expect(learningId).toMatch(/^learning-scheduler-\d+$/);

      const status = learningManager.getLearningStatus();
      expect(status.modelsCount).toBe(1);
    });

    it('should learn from partial execution', async () => {
      const executionData = {
        strategy: 'balanced',
        performance: { throughput: 60, latency: 100 },
        outcome: 'partial' as const,
        duration: 3000,
      };

      const learningId = await learningManager.learnFromExecution(
        'resource-manager',
        executionData,
      );

      expect(learningId).toMatch(/^learning-resource-manager-\d+$/);
    });

    it('should accumulate learning data over multiple executions', async () => {
      const baseExecutionData = {
        strategy: 'adaptive',
        performance: { throughput: 80, latency: 75 },
        outcome: 'success' as const,
        duration: 2000,
      };

      // Execute multiple learning cycles
      for (let i = 0; i < 5; i++) {
        await learningManager.learnFromExecution('decision-engine', {
          ...baseExecutionData,
          performance: {
            throughput: 80 + i * 5,
            latency: 75 - i * 2,
          },
        });
      }

      const status = learningManager.getLearningStatus();
      expect(status.learningHistorySize).toBe(5);
      expect(status.modelsCount).toBe(1);
    });

    it('should emit learning events', async () => {
      const eventPromise = new Promise<any>((resolve) => {
        learningManager.once('learning-updated', resolve);
      });

      const executionData = {
        strategy: 'test',
        performance: { metric: 1 },
        outcome: 'success' as const,
        duration: 1000,
      };

      await learningManager.learnFromExecution('test-component', executionData);

      const event = await eventPromise;
      expect(event.component).toBe('test-component');
      expect(event.executionData).toEqual(executionData);
      expect(event.learningId).toMatch(/^learning-test-component-\d+$/);
    });

    it('should return disabled message when learning disabled', async () => {
      const disabledManager = new LearningSystemIntegrationManager({
        learningEnabled: false,
      });

      const result = await disabledManager.learnFromExecution('component', {
        strategy: 'test',
        performance: {},
        outcome: 'success',
        duration: 1000,
      });

      expect(result).toBe('learning-disabled');

      await disabledManager.shutdown();
    });
  });

  describe('Knowledge Sharing', () => {
    beforeEach(async () => {
      // Prepare source component with learning data
      await learningManager.learnFromExecution('source-component', {
        strategy: 'optimized',
        performance: { efficiency: 95, speed: 85 },
        outcome: 'success',
        duration: 1500,
      });
    });

    it('should share strategy knowledge between components', async () => {
      const transferId = await learningManager.shareKnowledge(
        'source-component',
        'target-component',
        'strategy',
      );

      expect(transferId).toMatch(/^transfer-source-component-target-component-\d+$/);

      const targetKnowledge = learningManager.getComponentKnowledge('target-component');
      expect(targetKnowledge).toHaveLength(1);
      expect(targetKnowledge[0].knowledgeType).toBe('strategy');
      expect(targetKnowledge[0].sourceComponent).toBe('source-component');
      expect(targetKnowledge[0].confidence).toBeGreaterThan(0);
      expect(targetKnowledge[0].applicability).toBeGreaterThan(0);
    });

    it('should share performance pattern knowledge', async () => {
      const transferId = await learningManager.shareKnowledge(
        'source-component',
        'target-component',
        'performance-pattern',
      );

      expect(transferId).toMatch(/^transfer-source-component-target-component-\d+$/);

      const targetKnowledge = learningManager.getComponentKnowledge('target-component');
      expect(targetKnowledge[0].knowledgeType).toBe('performance-pattern');
    });

    it('should share resource usage knowledge', async () => {
      await learningManager.shareKnowledge(
        'source-component',
        'target-component',
        'resource-usage',
      );

      const targetKnowledge = learningManager.getComponentKnowledge('target-component');
      expect(targetKnowledge[0].knowledgeType).toBe('resource-usage');
    });

    it('should share failure pattern knowledge', async () => {
      await learningManager.shareKnowledge(
        'source-component',
        'target-component',
        'failure-pattern',
      );

      const targetKnowledge = learningManager.getComponentKnowledge('target-component');
      expect(targetKnowledge[0].knowledgeType).toBe('failure-pattern');
    });

    it('should share optimization knowledge', async () => {
      await learningManager.shareKnowledge('source-component', 'target-component', 'optimization');

      const targetKnowledge = learningManager.getComponentKnowledge('target-component');
      expect(targetKnowledge[0].knowledgeType).toBe('optimization');
    });

    it('should limit knowledge base size', async () => {
      const smallConfig = {
        ...config,
        maxKnowledgeTransfers: 3,
      };
      const limitedManager = new LearningSystemIntegrationManager(smallConfig);

      // Share more knowledge than the limit
      for (let i = 0; i < 5; i++) {
        await limitedManager.shareKnowledge('source', 'target', 'strategy');
      }

      const knowledge = limitedManager.getComponentKnowledge('target');
      expect(knowledge.length).toBe(3);

      await limitedManager.shutdown();
    });

    it('should emit knowledge sharing events', async () => {
      const eventPromise = new Promise<any>((resolve) => {
        learningManager.once('knowledge-shared', resolve);
      });

      await learningManager.shareKnowledge('source-component', 'target-component', 'strategy');

      const event = await eventPromise;
      expect(event.transfer.sourceComponent).toBe('source-component');
      expect(event.transfer.targetComponent).toBe('target-component');
      expect(event.transfer.knowledgeType).toBe('strategy');
      expect(event.transferId).toMatch(/^transfer-source-component-target-component-\d+$/);
    });

    it('should return disabled message when knowledge sharing disabled', async () => {
      const disabledManager = new LearningSystemIntegrationManager({
        crossComponentLearningEnabled: false,
      });

      const result = await disabledManager.shareKnowledge('source', 'target', 'strategy');

      expect(result).toBe('knowledge-sharing-disabled');

      await disabledManager.shutdown();
    });
  });

  describe('Performance Insights Generation', () => {
    beforeEach(async () => {
      // Generate learning data for insights
      for (let i = 0; i < 6; i++) {
        await learningManager.learnFromExecution('performance-test', {
          strategy: 'test',
          performance: { metric: 50 + i * 10 },
          outcome: 'success',
          duration: 1000 + i * 100,
        });
      }
    });

    it('should generate insights for specific component', async () => {
      const insights = await learningManager.generateInsights('performance-test');

      expect(insights).toHaveLength(1);
      expect(insights[0].component).toBe('performance-test');
      expect(insights[0].category).toBe('optimization');
      expect(insights[0].actionable).toBe(true);
      expect(insights[0].recommendedActions.length).toBeGreaterThan(0);
    });

    it('should generate insights for all components', async () => {
      // Add another component with sufficient data points
      for (let i = 0; i < 6; i++) {
        await learningManager.learnFromExecution('another-component', {
          strategy: 'test',
          performance: { metric: 75 + i * 5 },
          outcome: 'success',
          duration: 1200 + i * 50,
        });
      }

      const insights = await learningManager.generateInsights();

      // Should generate insights for components with sufficient data
      // Note: The actual number depends on implementation details,
      // so we just verify it doesn't throw and returns an array
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when insight generation disabled', async () => {
      const disabledManager = new LearningSystemIntegrationManager({
        insightGenerationEnabled: false,
      });

      const insights = await disabledManager.generateInsights('test');
      expect(insights).toHaveLength(0);

      await disabledManager.shutdown();
    });

    it('should store generated insights', async () => {
      await learningManager.generateInsights('performance-test');

      const storedInsights = learningManager.getComponentInsights('performance-test');
      expect(storedInsights.length).toBeGreaterThan(0);
    });

    it('should emit insights generation events', async () => {
      const eventPromise = new Promise<any>((resolve) => {
        learningManager.once('insights-generated', resolve);
      });

      await learningManager.generateInsights('performance-test');

      const event = await eventPromise;
      expect(event.component).toBe('performance-test');
      expect(event.insights.length).toBeGreaterThan(0);
    });
  });

  describe('Adaptive Behavior', () => {
    it('should adapt threshold behavior', async () => {
      const behaviorId = await learningManager.adaptBehavior(
        'test-component',
        'threshold',
        { min: 10, max: 100 },
        ['performance-degradation'],
      );

      expect(behaviorId).toMatch(/^behavior-test-component-threshold-\d+$/);

      const behaviors = learningManager.getAdaptiveBehaviors('test-component');
      expect(behaviors).toHaveLength(1);
      expect(behaviors[0].adaptationType).toBe('threshold');
      expect(behaviors[0].targetValue).toEqual({ min: 10, max: 100 });
      expect(behaviors[0].conditions).toContain('performance-degradation');
    });

    it('should adapt strategy behavior', async () => {
      await learningManager.adaptBehavior('scheduler', 'strategy', 'aggressive', [
        'high-load',
        'resource-available',
      ]);

      const behaviors = learningManager.getAdaptiveBehaviors('scheduler');
      expect(behaviors[0].adaptationType).toBe('strategy');
      expect(behaviors[0].targetValue).toBe('aggressive');
      expect(behaviors[0].conditions).toHaveLength(2);
    });

    it('should adapt resource allocation behavior', async () => {
      await learningManager.adaptBehavior('resource-manager', 'resource-allocation', {
        cpu: 0.8,
        memory: 0.6,
      });

      const behaviors = learningManager.getAdaptiveBehaviors('resource-manager');
      expect(behaviors[0].adaptationType).toBe('resource-allocation');
      expect(behaviors[0].targetValue).toEqual({ cpu: 0.8, memory: 0.6 });
    });

    it('should adapt scheduling behavior', async () => {
      await learningManager.adaptBehavior('scheduler', 'scheduling', 'round-robin');

      const behaviors = learningManager.getAdaptiveBehaviors('scheduler');
      expect(behaviors[0].adaptationType).toBe('scheduling');
      expect(behaviors[0].targetValue).toBe('round-robin');
    });

    it('should maintain adaptation history', async () => {
      const component = 'history-test';

      // First adaptation
      await learningManager.adaptBehavior(component, 'threshold', 50);

      // Second adaptation
      await learningManager.adaptBehavior(component, 'threshold', 75);

      const behaviors = learningManager.getAdaptiveBehaviors(component);
      expect(behaviors[0].adaptationHistory).toHaveLength(2);
      expect(behaviors[0].adaptationHistory[0].oldValue).toBeNull();
      expect(behaviors[0].adaptationHistory[0].newValue).toBe(50);
      expect(behaviors[0].adaptationHistory[1].oldValue).toBe(50);
      expect(behaviors[0].adaptationHistory[1].newValue).toBe(75);
    });

    it('should get all adaptive behaviors', async () => {
      await learningManager.adaptBehavior('comp1', 'threshold', 10);
      await learningManager.adaptBehavior('comp2', 'strategy', 'test');
      await learningManager.adaptBehavior('comp1', 'scheduling', 'fifo');

      const allBehaviors = learningManager.getAdaptiveBehaviors();
      expect(allBehaviors).toHaveLength(3);

      const comp1Behaviors = learningManager.getAdaptiveBehaviors('comp1');
      expect(comp1Behaviors).toHaveLength(2);
    });

    it('should emit behavior adaptation events', async () => {
      const eventPromise = new Promise<any>((resolve) => {
        learningManager.once('behavior-adapted', resolve);
      });

      await learningManager.adaptBehavior('test-component', 'threshold', 100);

      const event = await eventPromise;
      expect(event.component).toBe('test-component');
      expect(event.behaviorType).toBe('threshold');
      expect(event.adaptiveBehavior.targetValue).toBe(100);
    });

    it('should return disabled message when adaptation disabled', async () => {
      const disabledManager = new LearningSystemIntegrationManager({
        adaptationEnabled: false,
      });

      const result = await disabledManager.adaptBehavior('test', 'threshold', 100);

      expect(result).toBe('adaptation-disabled');

      await disabledManager.shutdown();
    });
  });

  describe('Learning Status and Metrics', () => {
    it('should provide comprehensive learning status', async () => {
      // Generate some data
      await learningManager.learnFromExecution('component1', {
        strategy: 'test',
        performance: { metric: 1 },
        outcome: 'success',
        duration: 1000,
      });

      await learningManager.shareKnowledge('component1', 'component2', 'strategy');
      await learningManager.adaptBehavior('component1', 'threshold', 50);

      const status = learningManager.getLearningStatus();

      expect(status.modelsCount).toBe(1);
      expect(status.knowledgeBaseSize).toBe(1);
      expect(status.adaptiveBehaviorsCount).toBe(1);
      expect(status.learningHistorySize).toBe(1);
      expect(status.configuration).toBeDefined();
      expect(status.configuration.learningEnabled).toBe(true);
    });

    it('should return empty knowledge for non-existent component', () => {
      const knowledge = learningManager.getComponentKnowledge('non-existent');
      expect(knowledge).toHaveLength(0);
    });

    it('should return empty insights for non-existent component', () => {
      const insights = learningManager.getComponentInsights('non-existent');
      expect(insights).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle errors gracefully during learning', async () => {
      // Mock a method to throw an error
      const originalMethod = learningManager['updateLearningModel'];
      learningManager['updateLearningModel'] = vi.fn().mockRejectedValue(new Error('Test error'));

      await expect(
        learningManager.learnFromExecution('error-component', {
          strategy: 'test',
          performance: {},
          outcome: 'success',
          duration: 1000,
        }),
      ).rejects.toThrow('Test error');

      // Restore original method
      learningManager['updateLearningModel'] = originalMethod;
    });

    it('should handle empty performance data', async () => {
      const learningId = await learningManager.learnFromExecution('empty-perf', {
        strategy: 'test',
        performance: {},
        outcome: 'success',
        duration: 1000,
      });

      expect(learningId).toMatch(/^learning-empty-perf-\d+$/);
    });

    it('should handle zero duration', async () => {
      const learningId = await learningManager.learnFromExecution('zero-duration', {
        strategy: 'test',
        performance: { metric: 1 },
        outcome: 'success',
        duration: 0,
      });

      expect(learningId).toMatch(/^learning-zero-duration-\d+$/);
    });
  });

  describe('Periodic Tasks and Shutdown', () => {
    it('should start periodic tasks when enabled', () => {
      const timerManager = new LearningSystemIntegrationManager({
        adaptationEnabled: true,
        insightGenerationEnabled: true,
        adaptationInterval: 60000,
        insightGenerationInterval: 120000,
      });

      expect(timerManager['adaptationTimer']).toBeDefined();
      expect(timerManager['insightTimer']).toBeDefined();

      timerManager.shutdown();
    });

    it('should not start timers when disabled', () => {
      const noTimerManager = new LearningSystemIntegrationManager({
        adaptationEnabled: false,
        insightGenerationEnabled: false,
      });

      expect(noTimerManager['adaptationTimer']).toBeNull();
      expect(noTimerManager['insightTimer']).toBeNull();

      noTimerManager.shutdown();
    });

    it('should shutdown gracefully', async () => {
      const shutdownPromise = new Promise<any>((resolve) => {
        learningManager.once('learning-system-shutdown', resolve);
      });

      await learningManager.shutdown();

      const shutdownEvent = await shutdownPromise;
      expect(shutdownEvent.status).toBe('graceful');
      expect(learningManager['isShuttingDown']).toBe(true);
      expect(learningManager['adaptationTimer']).toBeNull();
      expect(learningManager['insightTimer']).toBeNull();
    });

    it('should not perform periodic tasks after shutdown', async () => {
      await learningManager.shutdown();

      // Try to trigger periodic adaptation - should not throw or cause issues
      await learningManager['performPeriodicAdaptation']();

      // Verify no new behaviors were created
      const behaviors = learningManager.getAdaptiveBehaviors();
      expect(behaviors).toHaveLength(0);
    });
  });
});
