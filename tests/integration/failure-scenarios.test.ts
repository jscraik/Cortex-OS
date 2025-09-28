import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapLanggraphTestHarness } from '../setup/langgraph-integration.js';
import { loadFullSystemFixture } from '../utils/langgraph-integration.js';

describe('LangGraph failure scenarios', () => {
        let harness = bootstrapLanggraphTestHarness();

        beforeEach(() => {
                harness = bootstrapLanggraphTestHarness();
        });

        it('recovers from executor failure with deterministic backoff', async () => {
                vi.useFakeTimers();
                harness.failNext();
                const fixture = loadFullSystemFixture();
                let attempts = 0;

                const execute = async () => {
                        attempts += 1;
                        return harness.run(fixture.input);
                };

                let result;
                try {
                        result = await execute();
                } catch (error) {
                        expect((error as Error).message).toContain('brAInwav');
                        await vi.advanceTimersByTimeAsync(500);
                        result = await execute();
                }

                vi.useRealTimers();
                expect(attempts).toBe(2);
                expect(result?.summary.output).toBe(fixture.expectedOutput);
        });

        it('records dropped events when the A2A bus is offline', async () => {
                harness.a2aBus.simulateOutage();
                const result = await harness.run('Bus outage probe');
                const lastEvent = result.events.at(-1);

                expect(lastEvent?.status).toBe('dropped');
                expect(lastEvent?.topic).toBe('brAInwav.workflow.completed');
        });

        it('propagates MCP tool rejection telemetry', async () => {
                const failures: Error[] = [];
                const results = await harness.spool(
                        [
                                {
                                        id: 'tool-1',
                                        estimateTokens: 4,
                                        execute: async () => 'ok',
                                },
                                {
                                        id: 'tool-2',
                                        estimateTokens: 4,
                                        execute: async () => {
                                                throw new Error('policy violation');
                                        },
                                },
                        ],
                        {
                                ms: 2500,
                                tokens: 12,
                                integrationMetrics: {
                                        enabled: true,
                                        onRecord: (_duration, attributes) => {
                                                expect(attributes.channel).toBe('langgraph-harness');
                                        },
                                },
                                onSettle: (result) => {
                                        if (result.status === 'rejected' && result.reason) {
                                                failures.push(result.reason);
                                        }
                                },
                        },
                );

                const rejected = results.find((entry) => entry.status === 'rejected');
                expect(rejected?.reason?.message).toContain('brAInwav tool execution failed');
                expect(failures).toHaveLength(1);
        });
});
