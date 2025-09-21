/**
 * @fileoverview Integration and Performance Tests for nO Tool Orchestration
 * @module IntegrationPerformanceTests
 * @description Comprehensive integration testing and performance validation
 * @author brAInwav Development Team
 * @version 3.6.7
 * @since 2024-12-21
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChainExecutionResult, ToolChain } from '../tool-orchestration-contracts';
import { ToolOrchestrator } from '../tool-orchestrator';

// Functional test helper utilities following CODESTYLE.md
const createBasicToolDefinition = (
    id: string,
    layer: 'dashboard' | 'execution' | 'primitive',
    operation: string,
    dependencies: string[] = [],
    options: Record<string, unknown> = {},
) => ({
    id,
    layer,
    operation,
    dependencies,
    parallelizable: false,
    cacheable: false,
    retryable: false,
    optimizable: false,
    parameters: {},
    ...options,
});

const createRetryPolicy = (
    maxRetries: number = 3,
    backoffMs: number = 1000,
    exponentialBackoff: boolean = false,
) => ({ maxRetries, backoffMs, exponentialBackoff });

const createToolChain = (
    id: string,
    name: string,
    tools: any[],
    executionStrategy: string,
    timeout: number,
    options: Record<string, unknown> = {},
): ToolChain => ({
    id,
    name,
    tools,
    executionStrategy: executionStrategy as any,
    timeout,
    dynamicDependencies: false,
    metadata: {},
    ...options,
});

describe('Integration and Performance Tests - Phase 3.6.7', () => {
    let orchestrator: ToolOrchestrator;

    beforeEach(() => {
        orchestrator = new ToolOrchestrator();
    });

    afterEach(async () => {
        await orchestrator.shutdown();
    });

    describe('Performance Validation', () => {
        it('should execute large tool chains efficiently', async () => {
            // Create a large tool chain with 50 tools
            const largeToolChain = createLargeToolChain();

            const startTime = Date.now();
            const result = await orchestrator.executeChain(largeToolChain);
            const executionTime = Date.now() - startTime;

            expect(result.success).toBe(true);
            expect(result.totalTools).toBe(50);
            expect(result.toolResults).toHaveLength(50);
            expect(executionTime).toBeLessThan(10000); // Should complete in under 10 seconds

            // Performance metrics validation
            expect(result.totalExecutionTime).toBeGreaterThan(0);
            expect(result.layersExecuted).toBeGreaterThan(0);
            expect(result.performanceScore).toBeGreaterThan(0.8); // High success rate
        });

        it('should handle concurrent executions without interference', async () => {
            const chains = [
                createConcurrentTestChain('concurrent-1'),
                createConcurrentTestChain('concurrent-2'),
                createConcurrentTestChain('concurrent-3'),
            ];

            const startTime = Date.now();
            const results = await Promise.all(chains.map((chain) => orchestrator.executeChain(chain)));
            const totalTime = Date.now() - startTime;

            // All should succeed
            results.forEach((result) => {
                expect(result.success).toBe(true);
                expect(result.toolResults).toHaveLength(10);
            });

            // Concurrent execution should be faster than sequential
            expect(totalTime).toBeLessThan(5000); // Should complete concurrently in under 5 seconds
        });

        it('should demonstrate caching performance benefits', async () => {
            const cacheableChain = createCacheablePerformanceChain();

            // First execution - no cache
            const startTime1 = Date.now();
            const result1 = await orchestrator.executeChain(cacheableChain);
            const time1 = Date.now() - startTime1;

            expect(result1.success).toBe(true);
            expect(result1.cacheHits).toBe(0);

            // Second execution - with cache
            const startTime2 = Date.now();
            const result2 = await orchestrator.executeChain(cacheableChain);
            const time2 = Date.now() - startTime2;

            expect(result2.success).toBe(true);
            expect(result2.cacheHits).toBeGreaterThan(0);

            // Cached execution should be faster (at least 20% improvement)
            expect(time2).toBeLessThan(time1 * 0.8);
        });
    });

    describe('Integration Validation', () => {
        it('should integrate all orchestration features in complex scenario', async () => {
            const complexIntegrationChain = createComplexIntegrationChain();

            const result = await orchestrator.executeChain(complexIntegrationChain);

            // Validate comprehensive feature integration
            expect(result.success).toBe(true);
            expect(result.layersExecuted).toBe(3); // All layers: dashboard, execution, primitive
            expect(result.totalTools).toBe(15);
            expect(result.toolResults).toHaveLength(15);

            // Performance optimizations applied
            expect(result.optimizationsApplied).toBeGreaterThan(0);
            expect(result.parallelExecutions).toBeGreaterThan(0);
            expect(result.cacheHits).toBeGreaterThan(0);

            // Error handling features
            expect(result.retriesAttempted).toBeGreaterThan(0);
            expect(result.fallbacksUsed).toBeGreaterThan(0);

            // Security and validation
            expect(result.securityChecksPerformed).toBeGreaterThan(0);
            expect(result.unauthorizedAccessAttempts).toBe(0);

            // Cross-layer communication
            expect(result.crossLayerMessages).toHaveLength(2);
            expect(result.dataFlowComplete).toBe(true);

            // Performance metrics
            expect(result.performanceScore).toBeGreaterThan(0.7);
            expect(result.totalExecutionTime).toBeGreaterThan(0);
        });

        it('should maintain stability under stress conditions', async () => {
            // Execute multiple complex chains rapidly
            const stressChains = Array.from({ length: 20 }, (_, i) =>
                createStressTestChain(`stress-${i}`),
            );

            const results = await Promise.allSettled(
                stressChains.map((chain) => orchestrator.executeChain(chain)),
            );

            // Validate all executions completed
            expect(results).toHaveLength(20);

            const successfulResults = results.filter(
                (r) => r.status === 'fulfilled',
            ) as PromiseFulfilledResult<ChainExecutionResult>[];
            const failedResults = results.filter((r) => r.status === 'rejected');

            // At least 90% success rate under stress
            expect(successfulResults.length).toBeGreaterThanOrEqual(18);
            expect(failedResults.length).toBeLessThanOrEqual(2);

            // Validate successful results
            successfulResults.forEach(({ value: result }) => {
                expect(result.toolResults).toHaveLength(5);
                expect(result.totalExecutionTime).toBeGreaterThan(0);
            });
        });

        it('should demonstrate real-time monitoring capabilities', async () => {
            const monitoringChain = createMonitoringTestChain();
            const events: Array<{ type: string; timestamp: string }> = [];

            // Setup event monitoring
            orchestrator.on('toolExecutionStarted', (event) => events.push(event));
            orchestrator.on('toolExecutionCompleted', (event) => events.push(event));
            orchestrator.on('executionStatusUpdate', (event) => events.push(event));

            const result = await orchestrator.executeChain(monitoringChain);

            expect(result.success).toBe(true);
            expect(events.length).toBeGreaterThan(0);

            // Validate event types
            const startEvents = events.filter((e) => e.type === 'toolExecutionStarted');
            const completeEvents = events.filter((e) => e.type === 'toolExecutionCompleted');
            const statusEvents = events.filter((e) => e.type === 'executionStatusUpdate');

            expect(startEvents).toHaveLength(1);
            expect(completeEvents).toHaveLength(1);
            expect(statusEvents.length).toBeGreaterThan(0);
        });
    });

    describe('Production Readiness Validation', () => {
        it('should handle graceful shutdown with active executions', async () => {
            const longRunningChain = createLongRunningChain();

            // Start execution but don't wait
            const executionPromise = orchestrator.executeChain(longRunningChain);

            // Wait a moment then shutdown
            await new Promise((resolve) => setTimeout(resolve, 100));
            const shutdownPromise = orchestrator.shutdown();

            // Both should complete without hanging
            const [executionResult] = await Promise.all([executionPromise, shutdownPromise]);

            // Execution may or may not complete, but should not hang
            expect(executionResult).toBeDefined();
        });

        it('should maintain brAInwav branding in operational messages', async () => {
            const brandingChain = createBrandingTestChain();
            const events: Array<{ message?: string }> = [];

            orchestrator.on('orchestratorShutdown', (event) => events.push(event));

            await orchestrator.executeChain(brandingChain);
            await orchestrator.shutdown();

            // Validate brAInwav branding in shutdown message
            const shutdownEvent = events.find((e) => e.message?.includes('brAInwav'));
            expect(shutdownEvent).toBeDefined();
            expect(shutdownEvent?.message).toContain('brAInwav nO Tool Orchestrator');
        });
    });
});

// Test helper functions - following CODESTYLE.md functional approach
const createLargeToolChain = (): ToolChain => {
    const tools = Array.from({ length: 50 }, (_, i) =>
        createBasicToolDefinition(
            `tool-${i}`,
            i % 3 === 0 ? 'dashboard' : i % 3 === 1 ? 'execution' : 'primitive',
            `operation-${i}`,
            i > 0 ? [`tool-${i - 1}`] : [],
            {
                parallelizable: i % 5 === 0,
                cacheable: i % 7 === 0,
                optimizable: i % 3 === 0,
            },
        ),
    );

    return createToolChain(
        'large-performance-test',
        'Large Performance Test Chain',
        tools,
        'performance-optimized',
        30000,
    );
};

const createConcurrentTestChain = (id: string): ToolChain => {
    const tools = Array.from({ length: 10 }, (_, i) =>
        createBasicToolDefinition(`${id}-tool-${i}`, 'execution', `concurrent-operation-${i}`, [], {
            parallelizable: true,
            cacheable: true,
        }),
    );

    return createToolChain(id, `Concurrent Test Chain ${id}`, tools, 'parallel-optimized', 5000);
};

const createCacheablePerformanceChain = (): ToolChain =>
    createToolChain(
        'cacheable-performance-test',
        'Cacheable Performance Test Chain',
        [
            createBasicToolDefinition('cache-1', 'primitive', 'cacheable-operation-1', [], {
                cacheable: true,
            }),
            createBasicToolDefinition('cache-2', 'execution', 'cacheable-operation-2', [], {
                cacheable: true,
            }),
            createBasicToolDefinition('cache-3', 'dashboard', 'cacheable-operation-3', [], {
                cacheable: true,
            }),
        ],
        'cache-optimized',
        3000,
    );

const createComplexIntegrationChain = (): ToolChain =>
    createToolChain(
        'complex-integration-test',
        'Complex Integration Test Chain',
        [
            // Dashboard layer tools
            createBasicToolDefinition('dash-1', 'dashboard', 'dashboard-init', [], { cacheable: true }),
            createBasicToolDefinition('dash-2', 'dashboard', 'dashboard-viz', [], {
                parallelizable: true,
            }),
            createBasicToolDefinition('dash-3', 'dashboard', 'dashboard-report', ['exec-5'], {
                optimizable: true,
            }),

            // Execution layer tools with retry/fallback
            createBasicToolDefinition('exec-1', 'execution', 'flaky-execution', ['dash-1'], {
                retryable: true,
                fallbacks: [{ id: 'fallback-exec-1', operation: 'reliable-execution-1' }],
            }),
            createBasicToolDefinition('exec-2', 'execution', 'parallel-execution-1', [], {
                parallelizable: true,
            }),
            createBasicToolDefinition('exec-3', 'execution', 'parallel-execution-2', [], {
                parallelizable: true,
            }),
            createBasicToolDefinition('exec-4', 'execution', 'fallback-execution', [], {
                fallbacks: [{ id: 'fallback-exec-4', operation: 'reliable-execution-4' }],
            }),
            createBasicToolDefinition('exec-5', 'execution', 'secure-execution', ['prim-3'], {
                cacheable: true,
            }),

            // Primitive layer tools
            createBasicToolDefinition('prim-1', 'primitive', 'primitive-init', [], { cacheable: true }),
            createBasicToolDefinition('prim-2', 'primitive', 'primitive-process', ['prim-1'], {
                optimizable: true,
            }),
            createBasicToolDefinition('prim-3', 'primitive', 'primitive-data', ['prim-2'], {
                parallelizable: true,
            }),
            createBasicToolDefinition('prim-4', 'primitive', 'primitive-cache', [], { cacheable: true }),
            createBasicToolDefinition('prim-5', 'primitive', 'primitive-retry', [], {
                retryable: true,
                fallbacks: [{ id: 'fallback-prim-5', operation: 'reliable-primitive-5' }],
            }),

            // Cross-layer integration tools
            createBasicToolDefinition('cross-1', 'execution', 'cross-layer-message', [
                'dash-2',
                'prim-4',
            ]),
            createBasicToolDefinition('cross-2', 'dashboard', 'cross-layer-final', ['cross-1', 'exec-4']),
        ],
        'message-passing',
        20000,
        {
            securityLevel: 'high',
            retryPolicy: createRetryPolicy(),
        },
    );

const createStressTestChain = (id: string): ToolChain =>
    createToolChain(
        id,
        `Stress Test Chain ${id}`,
        [
            createBasicToolDefinition(`${id}-1`, 'primitive', 'stress-operation-1', [], {
                cacheable: true,
            }),
            createBasicToolDefinition(`${id}-2`, 'execution', 'stress-operation-2', [`${id}-1`], {
                retryable: true,
            }),
            createBasicToolDefinition(`${id}-3`, 'dashboard', 'stress-operation-3', [`${id}-2`], {
                parallelizable: true,
            }),
            createBasicToolDefinition(`${id}-4`, 'execution', 'stress-operation-4', [], {
                optimizable: true,
            }),
            createBasicToolDefinition(`${id}-5`, 'primitive', 'stress-operation-5', [
                `${id}-3`,
                `${id}-4`,
            ]),
        ],
        'performance-optimized',
        2000,
    );

const createMonitoringTestChain = (): ToolChain =>
    createToolChain(
        'monitoring-test',
        'Monitoring Test Chain',
        [
            createBasicToolDefinition('monitor-1', 'primitive', 'monitored-operation-1'),
            createBasicToolDefinition('monitor-2', 'execution', 'monitored-operation-2', ['monitor-1']),
        ],
        'telemetry-enabled',
        3000,
        { monitoring: { telemetryEnabled: true, metricsCollection: true } },
    );

const createLongRunningChain = (): ToolChain =>
    createToolChain(
        'long-running-test',
        'Long Running Test Chain',
        [
            createBasicToolDefinition('long-1', 'execution', 'long-operation-1', [], {
                estimatedDuration: 5000,
            }),
            createBasicToolDefinition('long-2', 'execution', 'long-operation-2', ['long-1'], {
                estimatedDuration: 5000,
            }),
        ],
        'status-tracking',
        15000,
    );

const createBrandingTestChain = (): ToolChain =>
    createToolChain(
        'branding-test',
        'brAInwav Branding Test Chain',
        [createBasicToolDefinition('brand-1', 'primitive', 'branding-operation')],
        'sequential',
        2000,
    );
