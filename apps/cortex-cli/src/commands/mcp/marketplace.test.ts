/**
 * @file MCP Marketplace Commands Tests
 * @description TDD tests for cortex-cli MCP marketplace integration
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { MarketplaceClient } from './marketplace-client.js';
import { McpMarketplaceCommand } from './marketplace.js';
import type { ServerManifest, SearchRequest } from '@cortex-os/mcp-marketplace';

// Mock the marketplace client
vi.mock('./marketplace-client.js');

describe('McpMarketplaceCommand', () => {
  let command: McpMarketplaceCommand;
  let mockClient: MockedFunction<typeof MarketplaceClient>;
  let mockClientInstance: {
    search: MockedFunction<any>;
    getServer: MockedFunction<any>;
    addServer: MockedFunction<any>;
    removeServer: MockedFunction<any>;
    listServers: MockedFunction<any>;
    healthCheck: MockedFunction<any>;
    addRegistry: MockedFunction<any>;
    removeRegistry: MockedFunction<any>;
    listRegistries: MockedFunction<any>;
  };

  beforeEach(() => {
    mockClientInstance = {
      search: vi.fn(),
      getServer: vi.fn(),
      addServer: vi.fn(),
      removeServer: vi.fn(),
      listServers: vi.fn(),
      healthCheck: vi.fn(),
      addRegistry: vi.fn(),
      removeRegistry: vi.fn(),
      listRegistries: vi.fn(),
    };

    mockClient = vi.mocked(MarketplaceClient);
    mockClient.mockImplementation(() => mockClientInstance as any);

    command = new McpMarketplaceCommand();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should search servers with query', async () => {
      // Arrange
      const mockServers: ServerManifest[] = [
        {
          id: 'test-server',
          name: 'Test Server',
          description: 'A test MCP server',
          mcpVersion: '2025-06-18',
          capabilities: { tools: true, resources: false, prompts: false },
          publisher: { name: 'Test Publisher', verified: false },
          category: 'development',
          license: 'MIT',
          transport: {
            stdio: { command: 'test-command' },
          },
          install: {
            claude: 'claude mcp add test-server -- test-command',
            json: { mcpServers: { 'test-server': { command: 'test-command' } } },
          },
          permissions: ['files:read'],
          security: { riskLevel: 'low' },
          featured: false,
          downloads: 100,
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      mockClientInstance.search.mockResolvedValue({
        success: true,
        data: mockServers,
        meta: { total: 1, offset: 0, limit: 20 },
      });

      // Act
      await command.search('database');

      // Assert
      expect(mockClientInstance.search).toHaveBeenCalledWith({
        q: 'database',
        limit: 20,
        offset: 0,
      });
    });

    it('should handle search with filters', async () => {
      // Arrange
      mockClientInstance.search.mockResolvedValue({
        success: true,
        data: [],
        meta: { total: 0, offset: 0, limit: 20 },
      });

      // Act
      await command.search('ai', {
        category: 'ai-ml',
        verified: true,
        limit: 10,
      });

      // Assert
      expect(mockClientInstance.search).toHaveBeenCalledWith({
        q: 'ai',
        category: 'ai-ml',
        verified: true,
        limit: 10,
        offset: 0,
      });
    });

    it('should handle search errors gracefully', async () => {
      // Arrange
      mockClientInstance.search.mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Failed to connect to registry' },
      });

      // Act & Assert
      await expect(command.search('test')).rejects.toThrow('Failed to connect to registry');
    });

    it('should display "no servers found" when search returns empty', async () => {
      // Arrange
      mockClientInstance.search.mockResolvedValue({
        success: true,
        data: [],
        meta: { total: 0, offset: 0, limit: 20 },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.search('nonexistent');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No servers found'));
      consoleSpy.mockRestore();
    });
  });

  describe('show', () => {
    it('should display server details', async () => {
      // Arrange
      const mockServer: ServerManifest = {
        id: 'github-server',
        name: 'GitHub Integration',
        description: 'Access GitHub repositories and issues',
        mcpVersion: '2025-06-18',
        capabilities: { tools: true, resources: true, prompts: false },
        publisher: { name: 'GitHub', verified: true },
        category: 'development',
        license: 'MIT',
        repository: 'https://github.com/github/mcp-server',
        transport: {
          streamableHttp: {
            url: 'https://api.github.com/mcp',
            headers: { 'User-Agent': 'Cortex-MCP/1.0' },
            auth: { type: 'bearer' },
          },
        },
        install: {
          claude:
            'claude mcp add --transport streamableHttp github-server https://api.github.com/mcp --header "Authorization: Bearer <TOKEN>"',
          json: { mcpServers: { 'github-server': { serverUrl: 'https://api.github.com/mcp' } } },
        },
        permissions: ['network:http', 'data:read'],
        security: {
          riskLevel: 'medium',
          sigstore: 'https://github.com/attestations/github.sigstore',
        },
        featured: true,
        downloads: 5000,
        rating: 4.8,
        updatedAt: '2025-01-01T00:00:00Z',
      };

      mockClientInstance.getServer.mockResolvedValue(mockServer);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.show('github-server');

      // Assert
      expect(mockClientInstance.getServer).toHaveBeenCalledWith('github-server');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GitHub Integration'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Verified Publisher'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Rating: 4.8/5'));
      consoleSpy.mockRestore();
    });

    it('should display install commands for specific client', async () => {
      // Arrange
      const mockServer: ServerManifest = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        mcpVersion: '2025-06-18',
        capabilities: { tools: true, resources: false, prompts: false },
        publisher: { name: 'Test', verified: false },
        category: 'utility',
        license: 'MIT',
        transport: {
          stdio: { command: 'test-command' },
        },
        install: {
          claude: 'claude mcp add test-server -- test-command',
          json: { mcpServers: { 'test-server': { command: 'test-command' } } },
        },
        permissions: [],
        security: { riskLevel: 'low' },
        featured: false,
        downloads: 10,
        updatedAt: '2025-01-01T00:00:00Z',
      };

      mockClientInstance.getServer.mockResolvedValue(mockServer);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.show('test-server', { client: 'claude' });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('claude mcp add'));
      consoleSpy.mockRestore();
    });

    it('should handle server not found', async () => {
      // Arrange
      mockClientInstance.getServer.mockResolvedValue(null);

      // Act & Assert
      await expect(command.show('nonexistent-server')).rejects.toThrow(
        'Server not found: nonexistent-server',
      );
    });
  });

  describe('add', () => {
    it('should add server from marketplace', async () => {
      // Arrange
      mockClientInstance.addServer.mockResolvedValue({
        success: true,
        data: { installed: true, serverId: 'test-server' },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.add('test-server');

      // Assert
      expect(mockClientInstance.addServer).toHaveBeenCalledWith('test-server', {});
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Successfully added'));
      consoleSpy.mockRestore();
    });

    it('should add server with specific transport', async () => {
      // Arrange
      mockClientInstance.addServer.mockResolvedValue({
        success: true,
        data: { installed: true, serverId: 'test-server' },
      });

      // Act
      await command.add('test-server', { transport: 'stdio' });

      // Assert
      expect(mockClientInstance.addServer).toHaveBeenCalledWith('test-server', {
        transport: 'stdio',
      });
    });

    it('should handle add server failure', async () => {
      // Arrange
      mockClientInstance.addServer.mockResolvedValue({
        success: false,
        error: { code: 'SECURITY_VIOLATION', message: 'Server signature verification failed' },
      });

      // Act & Assert
      await expect(command.add('untrusted-server')).rejects.toThrow(
        'Server signature verification failed',
      );
    });

    it('should prompt for security confirmation on high-risk servers', async () => {
      // Arrange
      mockClientInstance.addServer.mockResolvedValue({
        success: false,
        error: {
          code: 'HIGH_RISK_SERVER',
          message: 'This server requires high-risk permissions',
          details: { riskLevel: 'high', permissions: ['system:exec'] },
        },
      });

      // Act & Assert
      await expect(command.add('high-risk-server')).rejects.toThrow(
        'This server requires high-risk permissions',
      );
    });
  });

  describe('remove', () => {
    it('should remove installed server', async () => {
      // Arrange
      mockClientInstance.removeServer.mockResolvedValue({
        success: true,
        data: { removed: true },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.remove('test-server');

      // Assert
      expect(mockClientInstance.removeServer).toHaveBeenCalledWith('test-server');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Successfully removed'));
      consoleSpy.mockRestore();
    });

    it('should handle remove server not found', async () => {
      // Arrange
      mockClientInstance.removeServer.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Server not installed: test-server' },
      });

      // Act & Assert
      await expect(command.remove('test-server')).rejects.toThrow(
        'Server not installed: test-server',
      );
    });
  });

  describe('list', () => {
    it('should list installed servers', async () => {
      // Arrange
      const mockServers = [
        { id: 'server1', name: 'Server 1', status: 'active', source: 'marketplace' },
        { id: 'server2', name: 'Server 2', status: 'inactive', source: 'manual' },
      ];

      mockClientInstance.listServers.mockResolvedValue({
        success: true,
        data: mockServers,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.list();

      // Assert
      expect(mockClientInstance.listServers).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('server1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('server2'));
      consoleSpy.mockRestore();
    });

    it('should display empty list message when no servers installed', async () => {
      // Arrange
      mockClientInstance.listServers.mockResolvedValue({
        success: true,
        data: [],
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.list();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No MCP servers installed'));
      consoleSpy.mockRestore();
    });
  });

  describe('bridge', () => {
    it('should add custom registry', async () => {
      // Arrange
      mockClientInstance.addRegistry.mockResolvedValue({
        success: true,
        data: { added: true, registryUrl: 'https://custom.registry.com/v1/registry.json' },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.bridge('https://custom.registry.com/v1/registry.json', {
        add: true,
        name: 'custom-registry',
      });

      // Assert
      expect(mockClientInstance.addRegistry).toHaveBeenCalledWith(
        'https://custom.registry.com/v1/registry.json',
        { name: 'custom-registry' },
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Registry added'));
      consoleSpy.mockRestore();
    });

    it('should list configured registries', async () => {
      // Arrange
      const mockRegistries = [
        { name: 'default', url: 'https://registry.cortex-os.dev/v1/registry.json', trusted: true },
        { name: 'custom', url: 'https://custom.registry.com/v1/registry.json', trusted: false },
      ];

      mockClientInstance.listRegistries.mockResolvedValue({
        success: true,
        data: mockRegistries,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.bridge(null, { list: true });

      // Assert
      expect(mockClientInstance.listRegistries).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('default'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Trusted'));
      consoleSpy.mockRestore();
    });

    it('should test registry connectivity', async () => {
      // Arrange
      mockClientInstance.healthCheck.mockResolvedValue({
        success: true,
        data: { healthy: true, serverCount: 42, lastUpdated: '2025-01-01T00:00:00Z' },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.bridge('https://test.registry.com/v1/registry.json', { test: true });

      // Assert
      expect(mockClientInstance.healthCheck).toHaveBeenCalledWith(
        'https://test.registry.com/v1/registry.json',
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Registry is healthy'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('42 servers'));
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      mockClientInstance.search.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(command.search('test')).rejects.toThrow('Network error');
    });

    it('should validate server IDs', async () => {
      // Act & Assert
      await expect(command.show('')).rejects.toThrow('Server ID is required');
      await expect(command.show('INVALID_ID')).rejects.toThrow('Invalid server ID format');
    });

    it('should validate registry URLs', async () => {
      // Act & Assert
      await expect(command.bridge('not-a-url', { add: true })).rejects.toThrow(
        'Invalid registry URL',
      );
      await expect(command.bridge('http://insecure.com', { add: true })).rejects.toThrow(
        'Registry URLs must use HTTPS',
      );
    });
  });

  describe('output formatting', () => {
    it('should support JSON output', async () => {
      // Arrange
      const mockServers: ServerManifest[] = [
        {
          id: 'test-server',
          name: 'Test Server',
          description: 'A test server',
          mcpVersion: '2025-06-18',
          capabilities: { tools: true, resources: false, prompts: false },
          publisher: { name: 'Test', verified: false },
          category: 'utility',
          license: 'MIT',
          transport: { stdio: { command: 'test' } },
          install: { claude: 'test', json: {} },
          permissions: [],
          security: { riskLevel: 'low' },
          featured: false,
          downloads: 0,
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];

      mockClientInstance.search.mockResolvedValue({
        success: true,
        data: mockServers,
        meta: { total: 1, offset: 0, limit: 20 },
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await command.search('test', { json: true });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(
          {
            success: true,
            data: mockServers,
            meta: { total: 1, offset: 0, limit: 20 },
          },
          null,
          2,
        ),
      );
      consoleSpy.mockRestore();
    });
  });
});
