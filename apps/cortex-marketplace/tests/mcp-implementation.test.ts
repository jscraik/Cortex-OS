import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ServerManifest } from '@cortex-os/mcp-registry';
import { MarketplaceService } from '../src/services/marketplace-service.js';
import { RegistryService } from '../src/services/registry-service.js';
import { MarketplaceMcpIntegration } from '../src/mcp/integration.js';

describe('Marketplace MCP integration', () => {
        const registryFixture = {
                version: '2025-01-15',
                mcpVersion: '2025-06-18',
                updatedAt: '2025-01-15T12:00:00Z',
                servers: [
                        {
                                id: 'test-filesystem',
                                name: 'Test Filesystem Server',
                                description: 'Test filesystem access server',
                                transports: { stdio: { command: 'npx', args: ['-y', '@test/filesystem'] } },
                                capabilities: { tools: true, resources: true, prompts: false },
                                publisher: { name: 'TestPublisher', verified: true },
                                category: 'development',
                                license: 'Apache-2.0',
                                install: {
                                        claude: 'claude mcp add test-filesystem -- npx -y @test/filesystem',
                                        cline: 'cline mcp add test-filesystem -- npx -y @test/filesystem',
                                        cursor: 'cursor mcp add test-filesystem -- npx -y @test/filesystem',
                                        json: {
                                                mcpServers: {
                                                        'test-filesystem': {
                                                                command: 'npx',
                                                                args: ['-y', '@test/filesystem'],
                                                        },
                                                },
                                        },
                                },
                                permissions: ['files:read', 'files:write'],
                                security: { riskLevel: 'medium' },
                                featured: true,
                                downloads: 1337,
                                rating: 4.7,
                                updatedAt: '2025-01-15T10:00:00Z',
                        },
                        {
                                id: 'test-github',
                                name: 'Test GitHub Integration',
                                description: 'Test GitHub API integration',
                                transports: { stdio: { command: 'npx', args: ['-y', '@test/github'] } },
                                capabilities: { tools: true, resources: true, prompts: true },
                                publisher: { name: 'GitHub', verified: true },
                                category: 'development',
                                license: 'Apache-2.0',
                                install: {
                                        claude: 'claude mcp add test-github -- npx -y @test/github',
                                        cline: 'cline mcp add test-github -- npx -y @test/github',
                                },
                                permissions: ['network:https', 'data:read'],
                                security: { riskLevel: 'low' },
                                featured: false,
                                downloads: 2450,
                                rating: 4.9,
                                updatedAt: '2025-01-14T15:00:00Z',
                        },
                        {
                                id: 'analytics-suite',
                                name: 'Analytics Suite',
                                description: 'Analytics and reporting tools',
                                transports: { stdio: { command: 'npx', args: ['-y', '@test/analytics'] } },
                                capabilities: { tools: true, resources: false, prompts: false },
                                publisher: { name: 'DataCorp', verified: false },
                                category: 'analytics',
                                license: 'Apache-2.0',
                                permissions: ['network:https'],
                                security: { riskLevel: 'medium' },
                                featured: true,
                                downloads: 980,
                                rating: 4.2,
                                updatedAt: '2025-01-13T08:00:00Z',
                        },
                ] as ServerManifest[],
        };

        let cacheDir: string;
        let registryFile: string;
        let integration: MarketplaceMcpIntegration;

        beforeAll(async () => {
                cacheDir = await mkdtemp(path.join(tmpdir(), 'marketplace-mcp-'));
                registryFile = path.join(cacheDir, 'registry.json');
                await writeFile(registryFile, JSON.stringify(registryFixture, null, 2));

                const registryService = new RegistryService({
                        registries: { local: `file://${registryFile}` },
                        cacheDir,
                        cacheTtl: 5_000,
                });
                const marketplaceService = new MarketplaceService(registryService);

                integration = new MarketplaceMcpIntegration({
                        marketplaceService,
                        registryService,
                });
        });

        afterAll(async () => {
                await rm(cacheDir, { recursive: true, force: true });
        });

        const toolCases = [
                {
                        tool: 'marketplace.search_servers',
                        params: { query: 'test' },
                        assertPayload: (payload: Record<string, unknown>) => {
                                expect(Array.isArray(payload.servers)).toBe(true);
                                const servers = payload.servers as Array<Record<string, unknown>>;
                                expect(servers.length).toBeGreaterThan(0);
                        },
                },
                {
                        tool: 'marketplace.get_server',
                        params: { serverId: 'test-filesystem' },
                        assertPayload: (payload: Record<string, unknown>) => {
                                expect(payload).toHaveProperty('server');
                                const server = payload.server as Record<string, unknown>;
                                expect(server.id).toBe('test-filesystem');
                        },
                },
                {
                        tool: 'marketplace.get_install_instructions',
                        params: { serverId: 'test-filesystem', client: 'cline' },
                        assertPayload: (payload: Record<string, unknown>) => {
                                const installation = payload.installation as Record<string, unknown>;
                                expect(installation.command).toContain('cline');
                        },
                },
                {
                        tool: 'marketplace.list_categories',
                        params: {},
                        assertPayload: (payload: Record<string, unknown>) => {
                                expect(payload.categories).toMatchObject({ development: expect.any(Number) });
                        },
                },
                {
                        tool: 'marketplace.get_category_servers',
                        params: { category: 'development', limit: 5 },
                        assertPayload: (payload: Record<string, unknown>) => {
                                const servers = payload.servers as Array<Record<string, unknown>>;
                                expect(servers.every((server) => server.category === 'development')).toBe(true);
                        },
                },
                {
                        tool: 'marketplace.get_stats',
                        params: {},
                        assertPayload: (payload: Record<string, unknown>) => {
                                expect(payload.totalServers).toBe(3);
                                expect(payload.totalDownloads).toBeGreaterThan(0);
                        },
                },
                {
                        tool: 'marketplace.get_trending',
                        params: { period: 'week', limit: 3 },
                        assertPayload: (payload: Record<string, unknown>) => {
                                expect(payload.servers).toBeInstanceOf(Array);
                                expect(payload.meta).toMatchObject({ algorithm: 'recently_updated' });
                        },
                },
                {
                        tool: 'marketplace.get_popular',
                        params: { limit: 3 },
                        assertPayload: (payload: Record<string, unknown>) => {
                                const servers = payload.servers as Array<Record<string, unknown>>;
                                expect(servers.length).toBeGreaterThan(0);
                        },
                },
                {
                        tool: 'marketplace.get_top_rated',
                        params: { limit: 3, minDownloads: 500 },
                        assertPayload: (payload: Record<string, unknown>) => {
                                const servers = payload.servers as Array<Record<string, unknown>>;
                                expect(servers.every((server) => (server.downloads as number) >= 500)).toBe(true);
                        },
                },
        ] as const;

        for (const { tool, params, assertPayload } of toolCases) {
                it(`executes ${tool} with real data`, async () => {
                        const response = await integration.executeTool(tool, params);
                        expect(response.isError).not.toBe(true);
                        expect(response.metadata.tool).toBe(tool);
                        expect(response.content).toHaveLength(1);
                        const [first] = response.content;
                        expect(first.type).toBe('text');
                        const payload = JSON.parse(first.text) as Record<string, unknown>;
                        expect(payload.success).toBe(true);
                        assertPayload(payload);
                });
        }
});
