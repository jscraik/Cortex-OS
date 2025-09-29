
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AddressInfo } from 'node:net';
import { createOrchestrationServer } from '../src/server.js';
import { MasterAgentOrchestrator } from '../src/masterAgent.js';
import { AdapterRegistry } from '../src/adapters/adapterRegistry.js';
import type { GenerationAdapter } from '../src/adapters/types.js';
import { LangGraphOrchestrator } from '../src/orchestrator.js';

const createAdapter = (id: string): GenerationAdapter => ({
        id,
        isAvailable: vi.fn().mockResolvedValue(true),
        generate: vi.fn().mockImplementation(async () => ({
                output: `generated-by-${id}`,
                adapterId: id,
                tokensUsed: 64,
        })),
});

describe('Orchestration server integration', () => {
        const adapter = createAdapter('ollama');
        const registry = new AdapterRegistry([adapter]);
        const langGraph = new LangGraphOrchestrator({
                entryNode: 'start',
                nodes: {
                        start: async (context) => ({
                                memory: { ...context.memory, 'start:visited': true },
                                inputs: context.inputs,
                        }),
                        finalize: async (context) => ({
                                memory: { ...context.memory, outcome: 'completed' },
                                inputs: context.inputs,
                        }),
                },
                edges: {
                        start: ['finalize'],
                        finalize: [],
                },
        });
        const master = new MasterAgentOrchestrator(registry, langGraph);
        const server = createOrchestrationServer({ orchestrator: master });
        let url: string;

        beforeAll(() => {
                return new Promise<void>((resolve) => {
                        server.listen(0, '127.0.0.1', () => {
                                const address = server.address() as AddressInfo;
                                url = `http://${address.address}:${address.port}`;
                                resolve();
                        });
                });
        });

        afterAll(() => {
                return new Promise<void>((resolve, reject) => {
                        server.close((error) => {
                                if (error) {
                                        reject(error);
                                } else {
                                        resolve();
                                }
                        });
                });
        });

        it('executes a workflow and returns execution log', async () => {
                const response = await fetch(`${url}/agents/execute`, {
                        method: 'POST',
                        headers: {
                                'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                                steps: [
                                        {
                                                id: 'plan-1',
                                                adapterId: 'ollama',
                                                prompt: 'Resolve the ticket',
                                        },
                                ],
                                context: { memory: {}, inputs: { ticketId: '42' } },
                        }),
                });

                expect(response.status).toBe(200);
                const payload = (await response.json()) as {
                        workflowLog: Array<{ nodeId: string }>;
                        stepLogs: Array<{ adapterId: string }>;
                };

                expect(payload.workflowLog.map((entry) => entry.nodeId)).toStrictEqual(['start', 'finalize']);
                expect(payload.stepLogs[0]).toMatchObject({ adapterId: 'ollama' });
                expect(adapter.generate).toHaveBeenCalledOnce();
        });

});
