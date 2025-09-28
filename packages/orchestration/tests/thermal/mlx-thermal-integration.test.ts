import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../../src/langgraph/create-cerebrum-graph.js';
import { THERMAL_CTX_KEY } from '../../src/langgraph/state/thermal-history.js';
import { createThermalFixture } from './__fixtures__/mlx-telemetry.js';

describe('Thermal integration', () => {
        it('pauses MLX selection and emits brAInwav telemetry when temperatures spike', async () => {
                const fixtures = createThermalFixture();
                const clock = () => Date.parse(fixtures.critical.timestamp);
                const graph = createCerebrumGraph({ clock });

                const result = await graph.invoke({
                        input: 'status',
                        ctx: {
                                [THERMAL_CTX_KEY]: {
                                        pendingEvent: fixtures.critical,
                                        paused: false,
                                        checkpoints: [],
                                },
                        },
                        budget: { tokens: 999, timeMs: 2500, depth: 3 },
                });

                expect(result.selectedModel).toEqual({
                        provider: 'ollama',
                        model: 'brainwav-mlx-fallback',
                });

                const thermal = result.ctx?.[THERMAL_CTX_KEY] as Record<string, any> | undefined;
                expect(thermal?.paused).toBe(true);
                expect(thermal?.checkpoints?.length).toBe(1);
                expect(thermal?.checkpoints?.[0]?.reason).toBe('brAInwav thermal critical');

                const telemetry = result.ctx?.telemetry as any[] | undefined;
                expect(telemetry).toBeTruthy();
                expect(telemetry?.[0]?.payload?.thermal?.event.level).toBe('critical');
                expect(telemetry?.[0]?.metadata?.brainwav_component).toBe('orchestration.thermal');

                expect(result.output).toBe('brAInwav thermal hold: rerouted to ollama');
        });
});
