/**
 * @file Marketplace Client Tests
 * @description TDD tests for MCP marketplace client (moved to __tests__)
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketplaceClient, type MarketplaceConfig } from "../marketplace-client";

// Mock filesystem operations
vi.mock("fs/promises");
vi.mock("fs");

// Mock fetch for HTTP requests
global.fetch = vi.fn();

describe("MarketplaceClient", () => {
    let seq = 0;
    let client: MarketplaceClient;
    let mockConfig: MarketplaceConfig;
    let cacheDir: string;

    // Minimal inline RegistryIndex test representation (avoids dependency on package build output)
    const mockRegistryIndex: { version?: string; metadata?: Record<string, unknown>; servers: any[] } = {
        version: "2025-01-15",
        metadata: {
            updatedAt: "2025-01-15T10:00:00Z",
            serverCount: 2,
            categories: ["development", "utility"],
        },
        servers: [
            {
                id: "test-server",
                name: "Test Server",
                owner: "Test Publisher",
                description: "A test MCP server for development",
                category: "development",
                transports: {
                    stdio: { command: "test-command", args: ["--test"] },
                },
                install: {
                    claude: "claude mcp add test-server -- test-command --test",
                    json: {
                        mcpServers: {
                            "test-server": { command: "test-command", args: ["--test"] },
                        },
                    },
                },
                scopes: ["files:read"],
                security: {
                    riskLevel: "low",
                    verifiedPublisher: false,
                    sigstoreBundle: "https://example.com/sigstore.json",
                },
                tags: ["dev", "test"],
            },
            {
                id: "utility-server",
                name: "Utility Server",
                owner: "Utility Publisher",
                description: "A utility MCP server",
                category: "utility",
                transports: {
                    streamableHttp: { url: "https://utility.example.com" },
                },
                install: {},
                scopes: [],
                security: {
                    riskLevel: "medium",
                    verifiedPublisher: true,
                },
                tags: ["utility"],
            },
        ],
    };

    beforeEach(async () => {
        seq += 1;
        cacheDir = path.join(os.tmpdir(), `mcp-marketplace-test-${seq}`);
        mockConfig = {
            registries: { default: "https://registry.example.com/index.json" },
            cacheDir,
            cacheTtl: 300000,
            security: {
                requireSignatures: true,
                allowedRiskLevels: ["low", "medium"],
                trustedPublishers: ["Utility Publisher"],
            },
        };

        (vi.mocked(mkdir) as any).mockResolvedValue(undefined);
        (vi.mocked(writeFile) as any).mockResolvedValue(undefined);
        (vi.mocked(readFile) as any).mockResolvedValue(
            Buffer.from(JSON.stringify(mockRegistryIndex)),
        );
        (vi.mocked(existsSync) as any).mockReturnValue(true);

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockRegistryIndex,
        });

        client = new MarketplaceClient(mockConfig);
        await client.initialize();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("searches servers by query (simple overload)", async () => {
        const results = await client.search("Test");
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
    });

    it("searches servers with structured request (ApiResponse)", async () => {
        const response = await client.search({ q: "utility", limit: 10, offset: 0 });
        if (!('success' in response)) throw new Error('Unexpected response shape');
        expect(response.success).toBe(true);
        if (response.success) {
            expect(response.data.some((s) => s.id === 'utility-server')).toBe(true);
        }
    });
});
