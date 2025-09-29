import { describe, expect, it, vi } from 'vitest';
import { HealthMonitor } from '../../src/monitor/healthMonitor.js';

describe('HealthMonitor', () => {
        it('collects results from database, queue, and LangGraph dependencies', async () => {
                const dependencies = [
                        {
                                id: 'database',
                                check: vi.fn().mockResolvedValue({ id: 'database', status: 'ok', detail: 'connected', latencyMs: 0 }),
                        },
                        {
                                id: 'queue',
                                check: vi.fn().mockResolvedValue('degraded'),
                        },
                        {
                                id: 'langgraph',
                                check: vi.fn().mockResolvedValue('ok'),
                        },
                ];

                const monitor = new HealthMonitor(dependencies);
                const report = await monitor.run();

                expect(report.status).toBe('degraded');
                expect(report.checks.map((check) => check.id)).toStrictEqual(['database', 'queue', 'langgraph']);
                expect(dependencies[0].check).toHaveBeenCalledOnce();
                expect(dependencies[1].check).toHaveBeenCalledOnce();
                expect(dependencies[2].check).toHaveBeenCalledOnce();
        });

        it('fails fast when dependency list is empty', () => {
                expect(() => new HealthMonitor([])).toThrowError(/brAInwav health monitor requires at least one dependency/);
        });
});
