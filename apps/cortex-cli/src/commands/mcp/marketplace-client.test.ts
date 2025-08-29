/**
 * @file Marketplace Client Tests
 * @description TDD tests for MCP marketplace client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MarketplaceClient, type MarketplaceConfig } from './marketplace-client.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import type { RegistryIndex, ServerManifest } from '@cortex-os/mcp-marketplace';
import os from 'os';
import path from 'path';

// Mock filesystem operations
vi.mock('fs/promises');
vi.mock('fs');

// Mock fetch for HTTP requests
global.fetch = vi.fn();

describe('MarketplaceClient', () => {
  let client: MarketplaceClient;
  let mockConfig: MarketplaceConfig;
  let cacheDir: string;

  const mockRegistryIndex: RegistryIndex = {
    version: '2025-01-15',
    mcpVersion: '2025-06-18',
    updatedAt: '2025-01-15T10:00:00Z',
    serverCount: 2,
    categories: {
      development: { name: 'Development', description: 'Dev tools', count: 1 },
      utility: { name: 'Utility', description: 'Utilities', count: 1 },
    },
    featured: ['test-server'],
    signing: {
      publicKey: 'mock-public-key',
      algorithm: 'Ed25519',
    },
    servers: [
      {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test MCP server for development',
        mcpVersion: '2025-06-18',
        capabilities: { tools: true, resources: false, prompts: false },
        publisher: { name: 'Test Publisher', verified: false },
        category: 'development',
        license: 'MIT',
        transport: {
          stdio: { command: 'test-command', args: ['--test'] },
        },
        install: {
          claude: 'claude mcp add test-server -- test-command --test',
          json: { mcpServers: { 'test-server': { command: 'test-command', args: ['--test'] } } },
        },
        permissions: ['files:read'],
        security: { riskLevel: 'low' },
        featured: true,
        downloads: 150,
        updatedAt: '2025-01-15T10:00:00Z',
      },
      {
        id: 'utility-server',
        name: 'Utility Server',
        description: 'A utility MCP server',
        mcpVersion: '2025-06-18',
        capabilities: { tools: false, resources: true, prompts: true },
        publisher: { name: 'Utility Corp', verified: true },
        category: 'utility',
        license: 'Apache-2.0',
        transport: {
          streamableHttp: {
            url: 'https://api.utility.com/mcp',
            auth: { type: 'bearer' },
          },
        },
        install: {
          claude:
            'claude mcp add --transport streamableHttp utility-server https://api.utility.com/mcp --header "Authorization: Bearer <TOKEN>"',
          json: { mcpServers: { 'utility-server': { serverUrl: 'https://api.utility.com/mcp' } } },
        },
        permissions: ['network:http', 'data:read'],
        security: { riskLevel: 'medium', sigstore: 'https://utility.com/sigstore.json' },
        featured: false,
        downloads: 75,
        updatedAt: '2025-01-14T15:30:00Z',
      },
    ],
  };

  beforeEach(() => {
    cacheDir = path.join(os.tmpdir(), 'cortex', 'mcp-cache-test');
    mockConfig = {
      registries: {
        default: 'https://registry.cortex-os.dev/v1/registry.json',
      },
      cacheDir,
      cacheTtl: 300000, // 5 minutes
      security: {
        requireSignatures: true,
        allowedRiskLevels: ['low', 'medium'],
        trustedPublishers: ['Test Publisher', 'Utility Corp'],
      },
    };

    client = new MarketplaceClient(mockConfig);

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default filesystem mocks
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(readFile).mockRejectedValue(new Error('File not found'));
    vi.mocked(writeFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should create cache directory if it does not exist', async () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(false);

      // Act
      await client.initialize();

      // Assert
      expect(mkdir).toHaveBeenCalledWith(cacheDir, { recursive: true });
    });

    it('should skip cache directory creation if it exists', async () => {
      // Arrange
      vi.mocked(existsSync).mockReturnValue(true);

      // Act
      await client.initialize();

      // Assert
      expect(mkdir).not.toHaveBeenCalled();
    });

    it('should load registry from cache if valid', async () => {
      // Arrange
      const cacheData = JSON.stringify({
        data: mockRegistryIndex,
        cachedAt: Date.now() - 60000, // 1 minute ago
        registryUrl: 'https://registry.cortex-os.dev/v1/registry.json',
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(cacheData);

      // Act
      await client.initialize();

      // Assert
      expect(readFile).toHaveBeenCalledWith(
        expect.stringContaining('registry-cache.json'),
        'utf-8',
      );
    });

    it('should fetch fresh registry if cache is stale', async () => {
      // Arrange
      const staleCacheData = JSON.stringify({
        data: mockRegistryIndex,
        cachedAt: Date.now() - 600000, // 10 minutes ago (stale)
        registryUrl: 'https://registry.cortex-os.dev/v1/registry.json',
      });

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(staleCacheData);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegistryIndex),
      } as Response);

      // Act
      await client.initialize();

      // Assert
      expect(fetch).toHaveBeenCalledWith('https://registry.cortex-os.dev/v1/registry.json');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Setup client with mock registry
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegistryIndex),
      } as Response);

      await client.initialize();
    });

    it('should search servers by query', async () => {
      // Act
      const result = await client.search({ q: 'test', limit: 10, offset: 0 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('test-server');
      expect(result.meta).toEqual({
        total: 1,
        offset: 0,
        limit: 10,
      });
    });

    it('should filter servers by category', async () => {
      // Act
      const result = await client.search({ category: 'utility', limit: 20, offset: 0 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('utility-server');
    });

    it('should filter servers by verified publisher', async () => {
      // Act
      const result = await client.search({ verified: true, limit: 20, offset: 0 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].publisher.verified).toBe(true);
    });

    it('should return empty results for no matches', async () => {
      // Act
      const result = await client.search({ q: 'nonexistent', limit: 20, offset: 0 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.meta!.total).toBe(0);
    });

    it('should handle pagination', async () => {
      // Act
      const result = await client.search({ limit: 1, offset: 1 });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('utility-server');
      expect(result.meta).toEqual({
        total: 2,
        offset: 1,
        limit: 1,
      });
    });

    it('should return error when registry not loaded', async () => {
      // Arrange
      const uninitializedClient = new MarketplaceClient(mockConfig);

      // Act
      const result = await uninitializedClient.search({ q: 'test', limit: 20, offset: 0 });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRY_NOT_LOADED');
    });
  });

  describe('getServer', () => {
    beforeEach(async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegistryIndex),
      } as Response);

      await client.initialize();
    });

    it('should return server by ID', async () => {
      // Act
      const server = await client.getServer('test-server');

      // Assert
      expect(server).toBeDefined();
      expect(server!.id).toBe('test-server');
      expect(server!.name).toBe('Test Server');
    });

    it('should return null for non-existent server', async () => {
      // Act
      const server = await client.getServer('nonexistent');

      // Assert
      expect(server).toBeNull();
    });
  });

  describe('addServer', () => {
    beforeEach(async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegistryIndex),
      } as Response);

      await client.initialize();
    });

    it('should add server with default transport', async () => {
      // Arrange
      const mockConfigData = JSON.stringify({ mcpServers: {} });
      vi.mocked(readFile).mockResolvedValue(mockConfigData);

      // Act
      const result = await client.addServer('test-server', {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.installed).toBe(true);
      expect(result.data?.serverId).toBe('test-server');

      // Verify config was written
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('servers.json'),
        expect.stringContaining('test-server'),
      );
    });

    it('should add server with specific transport', async () => {
      // Arrange
      const mockConfigData = JSON.stringify({ mcpServers: {} });
      vi.mocked(readFile).mockResolvedValue(mockConfigData);

      // Act
      const result = await client.addServer('utility-server', { transport: 'streamableHttp' });

      // Assert
      expect(result.success).toBe(true);
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('servers.json'),
        expect.stringContaining('"serverUrl":"https://api.utility.com/mcp"'),
      );
    });

    it('should reject server not in registry', async () => {
      // Act
      const result = await client.addServer('nonexistent-server', {});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVER_NOT_FOUND');
    });

    it('should reject high-risk server when not allowed', async () => {
      // Arrange
      const highRiskServer: ServerManifest = {
        ...mockRegistryIndex.servers[0],
        id: 'high-risk-server',
        security: { riskLevel: 'high' },
        permissions: ['system:exec'],
      };

      // Add high-risk server to registry
      mockRegistryIndex.servers.push(highRiskServer);

      // Act
      const result = await client.addServer('high-risk-server', {});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SECURITY_VIOLATION');
      expect(result.error?.message).toContain('Risk level not allowed');
    });

    it('should validate signatures when required', async () => {
      // Arrange
      const unsignedServer: ServerManifest = {
        ...mockRegistryIndex.servers[0],
        id: 'unsigned-server',
        security: { riskLevel: 'low' }, // No sigstore
      };

      mockRegistryIndex.servers.push(unsignedServer);

      // Act
      const result = await client.addServer('unsigned-server', {});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SIGNATURE_REQUIRED');
    });

    it('should handle config file creation', async () => {
      // Arrange - No existing config file
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await client.addServer('test-server', {});

      // Assert
      expect(result.success).toBe(true);
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('servers.json'),
        expect.stringContaining('"mcpServers"'),
      );
    });
  });

  describe('removeServer', () => {
    it('should remove installed server', async () => {
      // Arrange
      const mockConfig = JSON.stringify({
        mcpServers: {
          'test-server': { command: 'test-command' },
        },
      });
      vi.mocked(readFile).mockResolvedValue(mockConfig);

      // Act
      const result = await client.removeServer('test-server');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.removed).toBe(true);

      // Verify server was removed from config
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('servers.json'),
        expect.not.stringContaining('test-server'),
      );
    });

    it('should return error for non-installed server', async () => {
      // Arrange
      const mockConfig = JSON.stringify({ mcpServers: {} });
      vi.mocked(readFile).mockResolvedValue(mockConfig);

      // Act
      const result = await client.removeServer('nonexistent-server');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should handle missing config file', async () => {
      // Arrange
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await client.removeServer('test-server');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('listServers', () => {
    it('should list installed servers', async () => {
      // Arrange
      const mockConfig = JSON.stringify({
        mcpServers: {
          server1: { command: 'cmd1' },
          server2: { serverUrl: 'https://api.example.com' },
        },
      });
      vi.mocked(readFile).mockResolvedValue(mockConfig);

      // Act
      const result = await client.listServers();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].id).toBe('server1');
      expect(result.data![1].id).toBe('server2');
    });

    it('should return empty list when no servers installed', async () => {
      // Arrange
      const mockConfig = JSON.stringify({ mcpServers: {} });
      vi.mocked(readFile).mockResolvedValue(mockConfig);

      // Act
      const result = await client.listServers();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle missing config file', async () => {
      // Arrange
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await client.listServers();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('registry management', () => {
    it('should add custom registry', async () => {
      // Arrange
      const customRegistryUrl = 'https://custom.registry.com/v1/registry.json';
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegistryIndex),
      } as Response);

      // Act
      const result = await client.addRegistry(customRegistryUrl, { name: 'custom' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.added).toBe(true);
      expect(fetch).toHaveBeenCalledWith(customRegistryUrl); // Validation call
    });

    it('should reject invalid registry URL', async () => {
      // Act
      const result = await client.addRegistry('invalid-url', { name: 'invalid' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_URL');
    });

    it('should validate registry connectivity', async () => {
      // Arrange
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      // Act
      const result = await client.addRegistry('https://unreachable.com/registry.json', {
        name: 'unreachable',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REGISTRY_UNREACHABLE');
    });

    it('should list configured registries', async () => {
      // Act
      const result = await client.listRegistries();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe('default');
      expect(result.data![0].url).toBe('https://registry.cortex-os.dev/v1/registry.json');
    });
  });

  describe('health checks', () => {
    it('should check registry health', async () => {
      // Arrange
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegistryIndex),
      } as Response);

      // Act
      const result = await client.healthCheck('https://registry.cortex-os.dev/v1/registry.json');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.healthy).toBe(true);
      expect(result.data?.serverCount).toBe(2);
    });

    it('should report unhealthy registry', async () => {
      // Arrange
      vi.mocked(fetch).mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await client.healthCheck('https://unreachable.registry.com/v1/registry.json');

      // Assert
      expect(result.success).toBe(true); // Health check succeeds, but reports unhealthy
      expect(result.data?.healthy).toBe(false);
      expect(result.data?.error).toContain('Connection failed');
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      // Act
      const initPromise = client.initialize();

      // Assert
      await expect(initPromise).rejects.toThrow('Network error');
    });

    it('should handle invalid JSON responses', async () => {
      // Arrange
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      // Act
      const initPromise = client.initialize();

      // Assert
      await expect(initPromise).rejects.toThrow('Invalid JSON');
    });

    it('should handle filesystem errors', async () => {
      // Arrange
      vi.mocked(mkdir).mockRejectedValue(new Error('Permission denied'));

      // Act
      const initPromise = client.initialize();

      // Assert
      await expect(initPromise).rejects.toThrow('Permission denied');
    });
  });
});
