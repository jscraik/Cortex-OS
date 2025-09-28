import { describe, expect, it } from 'vitest';
import {
        AdaptiveCoordinationManager,
        type AgentDescriptor,
        type CoordinationOutcome,
} from '../../src/coordinator/adaptive-coordinator.js';
import type { PlanningResult } from '../../src/lib/long-horizon-planner.js';
import type { LongHorizonTask } from '../../src/lib/long-horizon-planner.js';

const baseTask: LongHorizonTask = {
        id: 'phase-11-task',
        description: 'Coordinate enhanced planning and DSP integration',
        complexity: 9,
        priority: 8,
        estimatedDuration: 120_000,
        dependencies: ['context', 'planner'],
        metadata: { capabilities: ['analysis', 'execution'] },
};

const agents: AgentDescriptor[] = [
        { id: 'brAInwav.agent.primary', capabilities: ['analysis', 'execution'] },
        { id: 'brAInwav.agent.secondary', capabilities: ['review', 'execution'] },
        { id: 'brAInwav.agent.reviewer', capabilities: ['review'] },
];

const planningResult: PlanningResult = {
        taskId: baseTask.id,
        success: true,
        phases: [
                { phase: 'initialization', duration: 10, result: {} },
                { phase: 'analysis', duration: 20, result: {} },
                { phase: 'strategy', duration: 30, result: {} },
                { phase: 'execution', duration: 40, result: {} },
                { phase: 'completion', duration: 50, result: {} },
        ],
        totalDuration: 150,
        adaptiveDepth: 4,
        recommendations: ['Use adaptive coordination flow'],
        brainwavMetadata: {
                createdBy: 'brAInwav',
                version: '1.0.0',
                timestamp: new Date('2025-01-01T00:00:00.000Z'),
        },
};

describe('AdaptiveCoordinationManager', () => {
        it('selects strategies based on history and emits telemetry', () => {
                const clock = () => new Date('2025-01-01T00:00:00.000Z');
                const manager = new AdaptiveCoordinationManager({ clock });

                const firstDecision = manager.coordinate({
                        task: baseTask,
                        agents,
                        planningResult,
                });

                expect(firstDecision.strategy).toBe('parallel-coordinated');
                expect(firstDecision.telemetry.length).toBeGreaterThan(0);
                expect(firstDecision.telemetry[0].branding).toBe('brAInwav');

                const failureOutcome: CoordinationOutcome = {
                        taskId: baseTask.id,
                        strategy: firstDecision.strategy,
                        success: false,
                        efficiency: 0.3,
                        quality: 0.4,
                        durationMs: 60_000,
                        timestamp: new Date('2025-01-01T00:01:00.000Z'),
                };
                manager.recordOutcome(failureOutcome);

                const secondDecision = manager.coordinate({
                        task: baseTask,
                        agents,
                        planningResult,
                });

                expect(secondDecision.strategy).toBe('hybrid');

                manager.recordOutcome({
                        taskId: baseTask.id,
                        strategy: secondDecision.strategy,
                        success: false,
                        efficiency: 0.2,
                        quality: 0.3,
                        durationMs: 70_000,
                        timestamp: new Date('2025-01-01T00:02:00.000Z'),
                });

                const thirdDecision = manager.coordinate({
                        task: baseTask,
                        agents,
                        planningResult,
                });

                expect(thirdDecision.strategy).toBe('sequential-safe');
                expect(manager.getHistory(baseTask.id).length).toBe(3);
        });
});
