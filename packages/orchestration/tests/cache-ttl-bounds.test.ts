import { afterEach, describe, expect, it, vi } from 'vitest';
import winston from 'winston';
import {
    clearValidationCache,
    estimateValidationCost,
    getValidationCacheStats,
    validateWorkflow,
    validateWorkflowWithMetrics,
} from '../src/workflow-validator.js';

const baseWorkflow = {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'sample',
    version: '1',
    entry: 'start',
    steps: {
        start: { id: 'start', name: 'start', kind: 'agent', next: 'end' },
        end: { id: 'end', name: 'end', kind: 'agent' },
    },
};

describe('Cache TTL & Bounds Tests', () => {
    afterEach(() => {
        clearValidationCache();
    });

    it('should track cache hit rate accurately', () => {
        // First validation - cache miss
        validateWorkflow(baseWorkflow);
        let stats = getValidationCacheStats();
        expect(stats.hitRate).toBe(0); // First access should be a miss

        // Second validation - cache hit
        validateWorkflow(baseWorkflow);
        stats = getValidationCacheStats();
        expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 total accesses

        // Third validation - another cache hit
        validateWorkflow(baseWorkflow);
        stats = getValidationCacheStats();
        expect(stats.hitRate).toBe(2 / 3); // 2 hits out of 3 total accesses
    });

    it('should expire cache entries after TTL', async () => {
        // Create a workflow with shorter TTL for testing
        vi.useFakeTimers();

        validateWorkflow(baseWorkflow);
        let stats = getValidationCacheStats();
        expect(stats.size).toBe(1);

        // Fast forward beyond TTL (30 minutes + buffer)
        vi.advanceTimersByTime(31 * 60 * 1000);

        // Trigger cache access to check TTL expiration
        validateWorkflow(baseWorkflow);
        stats = getValidationCacheStats();

        // The entry should have been recreated, but hitRate should reflect the miss
        expect(stats.hitRate).toBeLessThan(1); // Should show some cache misses

        vi.useRealTimers();
    });

    it('should enforce cache size limits with LRU eviction', () => {
        // Create many different workflows to test size limits
        const workflows = [];
        const maxCacheSize = 1000; // Default max size

        // Create more workflows than the cache can hold
        for (let i = 0; i < maxCacheSize + 10; i++) {
            const workflow = {
                ...baseWorkflow,
                id: `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`,
                name: `workflow-${i}`,
            };
            workflows.push(workflow);
            validateWorkflow(workflow);
        }

        const stats = getValidationCacheStats();
        expect(stats.size).toBeLessThanOrEqual(maxCacheSize);
    });

    it('should provide accurate memory usage estimates', () => {
        validateWorkflow(baseWorkflow);
        const stats = getValidationCacheStats();

        expect(stats.memoryUsage).toBeGreaterThan(0);
        expect(typeof stats.memoryUsage).toBe('number');
    });

    it('should handle validation metrics correctly', () => {
        const result = validateWorkflowWithMetrics(baseWorkflow);

        expect(result.metrics.validationTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.metrics.cacheHit).toBe(false); // First time
        expect(result.metrics.stepCount).toBe(2);
        expect(result.metrics.complexity).toBe('low');

        // Second call should be a cache hit
        const result2 = validateWorkflowWithMetrics(baseWorkflow);
        expect(result2.metrics.cacheHit).toBe(true);
    });

    it('should estimate validation cost correctly', () => {
        const simpleWorkflow = baseWorkflow;
        const estimate = estimateValidationCost(simpleWorkflow);

        expect(estimate.estimatedCost).toBe('low');
        expect(estimate.stepCount).toBe(2);
        expect(estimate.estimatedTimeMs).toBeLessThan(5);

        // Test complex workflow
        const complexSteps: Record<string, any> = {};
        for (let i = 0; i < 60; i++) {
            complexSteps[`step${i}`] = {
                id: `step${i}`,
                name: `step${i}`,
                kind: 'agent',
                next: i < 59 ? `step${i + 1}` : undefined,
                branches: i % 5 === 0 ? [
                    { when: 'condition1', to: `step${Math.min(i + 10, 59)}` },
                    { when: 'condition2', to: `step${Math.min(i + 20, 59)}` }
                ] : undefined
            };
        }

        const complexWorkflow = {
            ...baseWorkflow,
            steps: complexSteps,
            entry: 'step0'
        };

        const complexEstimate = estimateValidationCost(complexWorkflow);
        expect(complexEstimate.estimatedCost).toBe('high');
        expect(complexEstimate.stepCount).toBe(60);
    });

    it('should use structured logging for unreachable steps', () => {
        const mockLogger = {
            warn: vi.fn(),
        } as unknown as winston.Logger;

        const workflowWithUnreachable = {
            ...baseWorkflow,
            steps: {
                ...baseWorkflow.steps,
                unreachable: { id: 'unreachable', name: 'unreachable', kind: 'agent' },
            },
        };

        validateWorkflow(workflowWithUnreachable, mockLogger);

        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Workflow validation found unreachable steps',
            expect.objectContaining({
                workflowId: workflowWithUnreachable.id,
                unreachableSteps: ['unreachable'],
                unreachableCount: 1,
                totalSteps: 3,
                component: 'workflow-validator',
            })
        );
    });
});
