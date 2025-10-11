import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher, type Dispatcher } from 'undici';
import { fetchMarketplaceServer, MarketplaceProviderError } from '../src/providers/mcpmarket.js';

const MARKETPLACE_BASE_URL = 'https://mcpmarket.com';

describe('fetchMarketplaceServer', () => {
        let originalDispatcher: Dispatcher;
        let mockAgent: MockAgent;

        beforeAll(() => {
                originalDispatcher = getGlobalDispatcher();
        });

        beforeEach(() => {
                mockAgent = new MockAgent();
                mockAgent.disableNetConnect();
                setGlobalDispatcher(mockAgent);
        });

        afterEach(async () => {
                setGlobalDispatcher(originalDispatcher);
                await mockAgent.close();
        });

        it('normalizes stdio start command responses', async () => {
                const scope = mockAgent.get(MARKETPLACE_BASE_URL);
                scope
                        .intercept({
                                path: '/api/servers/arxiv-1',
                                method: 'GET',
                                headers: {
                                        accept: 'application/json',
                                        'user-agent': 'brAInwav-CortexOS/1.0',
                                },
                        })
                        .reply(
                                200,
                                {
                                        slug: 'arxiv-1',
                                        name: 'ArXiv reference',
                                        startCommand: {
                                                type: 'stdio',
                                                command: 'npx',
                                                args: ['-y', '@modelcontextprotocol/server-arxiv'],
                                                env: {
                                                        ARXIV_EMAIL: 'example@example.com',
                                                },
                                        },
                                },
                                {
                                        headers: {
                                                'content-type': 'application/json',
                                        },
                                },
                        );

                const server = await fetchMarketplaceServer('arxiv-1');

                expect(server).toEqual({
                        name: 'arxiv-1',
                        transport: 'stdio',
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-arxiv'],
                        env: {
                                ARXIV_EMAIL: 'example@example.com',
                        },
                });
        });

        it('throws validation error when command details are missing', async () => {
                const scope = mockAgent.get(MARKETPLACE_BASE_URL);
                scope
                        .intercept({
                                path: '/api/servers/broken',
                                method: 'GET',
                                headers: {
                                        accept: 'application/json',
                                        'user-agent': 'brAInwav-CortexOS/1.0',
                                },
                        })
                        .reply(
                                200,
                                {
                                        slug: 'broken',
                                        name: 'Broken server',
                                        startCommand: {
                                                type: 'stdio',
                                                args: ['--missing-command'],
                                        },
                                },
                                {
                                        headers: {
                                                'content-type': 'application/json',
                                        },
                                },
                        );

                await expect(fetchMarketplaceServer('broken')).rejects.toHaveProperty('code', 'validation_error');
        });

        it('returns fallback configuration on 404 for known slug', async () => {
                const scope = mockAgent.get(MARKETPLACE_BASE_URL);
                scope
                        .intercept({
                                path: '/api/servers/arxiv-1',
                                method: 'GET',
                                headers: {
                                        accept: 'application/json',
                                        'user-agent': 'brAInwav-CortexOS/1.0',
                                },
                        })
                        .reply(404, {}, { headers: { 'content-type': 'application/json' } });

                const server = await fetchMarketplaceServer('arxiv-1');

                expect(server.command).toBe('npx');
                expect(server.transport).toBe('stdio');
        });

        it('throws not_found error for unknown slug 404 responses', async () => {
                const scope = mockAgent.get(MARKETPLACE_BASE_URL);
                scope
                        .intercept({
                                path: '/api/servers/unknown',
                                method: 'GET',
                                headers: {
                                        accept: 'application/json',
                                        'user-agent': 'brAInwav-CortexOS/1.0',
                                },
                        })
                        .reply(404, {}, { headers: { 'content-type': 'application/json' } });

                await expect(fetchMarketplaceServer('unknown')).rejects.toBeInstanceOf(MarketplaceProviderError);
        });
});
