import { Registry } from 'prom-client';
import { describe, expect, it } from 'vitest';
import { OrchestrationMetrics } from '../../src/observability/custom-metrics.js';

describe('OrchestrationMetrics', () => {
    it('registers planner persistence metrics and records events', async () => {
        const registry = new Registry();
        const metrics = new OrchestrationMetrics(registry);

        // Record a planner persistence success with a duration
        metrics.recordPlannerPersistenceEvent('planning_started', 'success', undefined, 0.123);

        const json = await registry.getMetricsAsJSON();
        const metricNames = json.map((m) => m.name);

        expect(metricNames).toContain('planner_persistence_events_total');
        expect(metricNames).toContain('planner_persistence_duration_seconds');

        // Verify the counter has an entry for the event_type/status we recorded
        const counterMetric = json.find((m) => m.name === 'planner_persistence_events_total');
        expect(counterMetric).toBeDefined();
        if (!counterMetric) return;
        expect(counterMetric.values.length).toBeGreaterThanOrEqual(1);
        expect(
            counterMetric.values.some(
                (v) => v.labels?.event_type === 'planning_started' && v.labels?.status === 'success',
            ),
        ).toBe(true);

        // Verify the histogram recorded duration values for the event_type
        const histMetric = json.find((m) => m.name === 'planner_persistence_duration_seconds');
        expect(histMetric).toBeDefined();
        if (!histMetric) return;
        expect(histMetric.values.length).toBeGreaterThan(0);
        // At least one value should include the event_type label we used
        expect(histMetric.values.some((v) => v.labels?.event_type === 'planning_started')).toBe(true);
    });

    it('reset clears all registered metrics', async () => {
        const registry = new Registry();
        const metrics = new OrchestrationMetrics(registry);

        metrics.recordPlannerPersistenceEvent('planning_completed', 'success', undefined, 0.2);

        let json = await registry.getMetricsAsJSON();
        expect(json.length).toBeGreaterThan(0);

        metrics.reset();

        json = await registry.getMetricsAsJSON();
        expect(json.length).toBe(0);
    });
});
