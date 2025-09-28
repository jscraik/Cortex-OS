import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../../src/langgraph/create-cerebrum-graph.js';
import { THERMAL_CTX_KEY } from '../../src/langgraph/state/thermal-history.js';
import { createThermalFixture } from './__fixtures__/mlx-telemetry.js';

describe('Thermal model fallback', () => {
        it('preserves budget and reroutes to Ollama during warning events', async () => {
                const fixtures = createThermalFixture();
                const initialBudget = { tokens: 2048, timeMs: 4800, depth: 5 } as const;
                const graph = createCerebrumGraph({ clock: () => Date.parse(fixtures.warning.timestamp) });

                const result = await graph.invoke({
                        input: 'diagnostics',
                        ctx: {
                                [THERMAL_CTX_KEY]: {
                                        pendingEvent: fixtures.warning,
                                },
                        },
                        budget: initialBudget,
                });

                expect(result.budget).toEqual(initialBudget);
                expect(result.selectedModel?.provider).toBe('ollama');
                const telemetry = result.ctx?.telemetry as any[] | undefined;
                expect(telemetry?.[0]?.payload?.thermal?.response.fallbackProvider).toBe('ollama.brainwav-fallback');
        });
});
