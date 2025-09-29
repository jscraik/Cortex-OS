import { AIMessage } from '@langchain/core/messages';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
        __resetModelGatewayMocks,
        __setModelGatewayMocks,
} from '@cortex-os/model-gateway';
import { createMasterAgentGraph, type SubAgentConfig } from '../src/MasterAgent.js';

vi.mock(
        '@cortex-os/hooks',
        () => ({
                getHooksSingleton: () => undefined,
        }),
        { virtual: true },
);

describe('Agents Package Guard – no mock responses', () => {
        let subAgents: SubAgentConfig[];

        beforeEach(() => {
                __resetModelGatewayMocks();
                subAgents = [
                        {
                                name: 'guard-code-analysis',
                                description: 'Ensures code analysis tasks are handled by real adapters',
                                capabilities: ['code-analysis', 'quality-review'],
                                model_targets: ['mlx-real'],
                                tools: ['analyze_code'],
                                specialization: 'code-analysis',
                        },
                ];
        });

        afterEach(() => {
                __resetModelGatewayMocks();
        });

        it('rejects placeholder responses from the master agent tool layer', async () => {
                const realContent = 'Real adapter output confirming tool execution';

                __setModelGatewayMocks({
                        mlx: {
                                isAvailable: async () => true,
                                generateChat: async () => ({
                                        content: realContent,
                                        model: 'mlx-production',
                                }),
                        },
                        ollama: {
                                generateChat: async () => ({
                                        content: 'Fallback ollama response that should not be needed',
                                        model: 'ollama-production',
                                }),
                        },
                });

                const masterAgent = createMasterAgentGraph({
                        name: 'production-guard-agent',
                        subAgents,
                });

                const result = await masterAgent.coordinate('Please review this module for regressions.');

                const execution = result.result as
                        | { executed: boolean; provider: string; payload?: { content: string } }
                        | undefined;
                expect(execution?.executed).toBe(true);
                expect(execution?.provider).toBe('mlx');
                expect(execution?.payload?.content).toBe(realContent);

                const aiMessages = result.messages.filter((message) => message instanceof AIMessage);
                expect(aiMessages.length).toBeGreaterThan(0);
                for (const message of aiMessages) {
                        const content = typeof message.content === 'string'
                                ? message.content
                                : JSON.stringify(message.content);

                        expect(content).toContain(realContent);
                        expect(content).not.toMatch(/Mock adapter response/i);
                        expect(content).not.toMatch(/not yet implemented/i);
                }

                expect(result.error).toBeUndefined();
        });
});
