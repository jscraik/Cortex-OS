import { beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import type { ServerInfo } from '@cortex-os/mcp-core';
import * as fsStore from '../src/fs-store.js';
import { registryMarketplaceImportTool } from '../src/mcp/tools.js';
import { fetchMarketplaceServer, MarketplaceProviderError } from '../src/providers/mcpmarket.js';

vi.mock('../src/fs-store.js', () => ({
        readAll: vi.fn(),
        upsert: vi.fn(),
        remove: vi.fn(),
}));

vi.mock('../src/providers/mcpmarket.js', async () => {
        const actual = await vi.importActual<typeof import('../src/providers/mcpmarket.js')>(
                '../src/providers/mcpmarket.js',
        );
        return {
                ...actual,
                fetchMarketplaceServer: vi.fn(),
        };
});

const mockedReadAll = fsStore.readAll as MockedFunction<typeof fsStore.readAll>;
const mockedUpsert = fsStore.upsert as MockedFunction<typeof fsStore.upsert>;
const mockedFetchMarketplaceServer = fetchMarketplaceServer as MockedFunction<typeof fetchMarketplaceServer>;

describe('registryMarketplaceImportTool', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        it('imports server from marketplace and upserts it', async () => {
                const serverInfo: ServerInfo = {
                        name: 'arxiv-1',
                        transport: 'stdio',
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-arxiv'],
                };

                mockedReadAll.mockResolvedValue([]);
                mockedFetchMarketplaceServer.mockResolvedValue(serverInfo);

                const response = await registryMarketplaceImportTool.handler({
                        slug: 'arxiv-1',
                });

                expect(response.isError).toBeFalsy();
                const content = JSON.parse(response.content[0].text);
                expect(content.status).toBe('created');
                expect(content.source).toBe('mcpmarket');
                expect(mockedUpsert).toHaveBeenCalledWith(serverInfo);
        });

        it('rejects duplicate registrations without overwrite', async () => {
                const serverInfo: ServerInfo = {
                        name: 'arxiv-1',
                        transport: 'stdio',
                        command: 'npx',
                };

                mockedReadAll.mockResolvedValue([serverInfo]);
                mockedFetchMarketplaceServer.mockResolvedValue(serverInfo);

                const response = await registryMarketplaceImportTool.handler({
                        slug: 'arxiv-1',
                });

                expect(response.isError).toBe(true);
                const content = JSON.parse(response.content[0].text);
                expect(content.error).toBe('duplicate_server');
                expect(content.message).toContain('already exists');
                expect(mockedUpsert).not.toHaveBeenCalled();
        });

        it('propagates marketplace provider errors with mapped codes', async () => {
                mockedReadAll.mockResolvedValue([]);
                mockedFetchMarketplaceServer.mockRejectedValue(
                        new MarketplaceProviderError('not_found', 'Server missing', ['Check slug']),
                );

                const response = await registryMarketplaceImportTool.handler({
                        slug: 'missing',
                        overwrite: true,
                });

                expect(response.isError).toBe(true);
                const content = JSON.parse(response.content[0].text);
                expect(content.error).toBe('not_found');
                expect(content.details).toContain('Check slug');
        });

        it('surfaces timeout errors from aborted requests', async () => {
                mockedReadAll.mockResolvedValue([]);
                mockedFetchMarketplaceServer.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

                const response = await registryMarketplaceImportTool.handler({
                        slug: 'slow-server',
                        timeoutMs: 1000,
                });

                expect(response.isError).toBe(true);
                const content = JSON.parse(response.content[0].text);
                expect(content.error).toBe('internal_error');
                expect(content.details).toContain('Increase timeoutMs');
        });
});
