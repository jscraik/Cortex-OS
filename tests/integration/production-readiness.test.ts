import { beforeEach, describe, expect, it } from 'vitest';
import { bootstrapLanggraphTestHarness } from '../setup/langgraph-integration.js';
import { loadFullSystemFixture } from '../utils/langgraph-integration.js';

describe('LangGraph production readiness', () => {
        let harness = bootstrapLanggraphTestHarness();

        beforeEach(() => {
                harness = bootstrapLanggraphTestHarness();
        });

        describe('streaming happy path', () => {
                it('emits branded websocket updates', async () => {
                        const fixture = loadFullSystemFixture();
                        const result = await harness.run(fixture.input, { streaming: true });

                        expect(result.summary.streaming).toBe(true);
                        expect(result.websocket[0]?.channel).toBe('brAInwav.streaming.update');
                        expect(result.websocket[0]?.payload).toMatchObject({
                                output: fixture.expectedOutput,
                        });
                });
        });

        describe('thermal coordination', () => {
                it('captures critical thermal state transitions', async () => {
                        harness.thermal.setState('critical');
                        const result = await harness.run('Thermal audit');

                        expect(result.summary.thermalState).toBe('critical');
                        expect(harness.thermal.history).toContain('critical');
                        expect(result.logs.some((entry) => entry.includes('thermalState'))).toBe(true);
                });
        });

        describe('multi-agent workflow', () => {
                it('records handoff events through the A2A bus', async () => {
                        const fixture = loadFullSystemFixture();
                        harness.a2aBus.on('brAInwav.workflow.completed', (payload) => {
                                harness.a2aBus.emit('brAInwav.agent.handoff', {
                                        from: 'alpha',
                                        to: 'beta',
                                        payload,
                                });
                        });

                        const result = await harness.run(fixture.input);
                        const handoff = result.events.find((event) => event.topic === 'brAInwav.agent.handoff');

                        expect(handoff?.status).toBe('delivered');
                        expect(handoff?.payload).toMatchObject({ from: 'alpha', to: 'beta' });
                        expect(result.summary.output).toBe(fixture.expectedOutput);
                });
        });
});
