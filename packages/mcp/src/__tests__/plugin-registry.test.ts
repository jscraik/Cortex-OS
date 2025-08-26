/**
 * @file_path packages/mcp/src/__tests__/plugin-registry.test.ts
 * @description Unit tests for plugin registry marketplace functionality
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PluginRegistry } from '../plugin-registry.js';
import type { PluginSearchOptions } from '../types.js';
import { MarketplaceIndexSchema } from '../types.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new PluginRegistry();
  });

  describe('refreshMarketplace', () => {
    it('should fetch marketplace data successfully', async () => {
      const mockResponse = {
        version: '1.0.0',
        lastUpdated: '2025-08-20T00:00:00Z',
        categories: ['development-tools'],
        plugins: [
          {
            name: 'test-plugin',
            version: '1.0.0',
            description: 'Test plugin',
            author: 'Test Author',
            category: 'development-tools',
            capabilities: ['test.capability'],
            cortexOsVersion: '>=1.0.0',
            mcpVersion: '1.0.0',
            entrypoint: 'test.js',
            downloadUrl: 'https://plugins.brainwav.ai/test-plugin.tar.gz',
            created: '2025-01-01T00:00:00Z',
            updated: '2025-01-01T00:00:00Z',
            verified: true,
            license: 'MIT',
            keywords: ['test'],
            dependencies: [],
            permissions: [],
          },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await registry.refreshMarketplace();

      expect(fetch).toHaveBeenCalledWith('https://plugins.brainwav.ai/index.json');
    });

    it('should handle fetch failure in production environment', async () => {
      const env = process.env as Record<string, string | undefined>;
      const original = env.NODE_ENV;
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

        // Simulate network failure and ensure production throws
        (fetch as any).mockRejectedValueOnce(new Error('Network error'));
        await expect(registry.refreshMarketplace()).rejects.toThrow('Network error');
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = original;
      }
    });

    it('should use mock data in development environment when fetch fails', async () => {
      const env = process.env as Record<string, string | undefined>;
      const original = env.NODE_ENV;
      try {
        env.NODE_ENV = 'development';

        (fetch as any).mockRejectedValueOnce(new Error('Network error'));

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await registry.refreshMarketplace();

        expect(consoleSpy).toHaveBeenCalledWith('Using mock marketplace data:', expect.any(String));

        consoleSpy.mockRestore();
      } finally {
        env.NODE_ENV = original;
      }
    });

    it('should use mock data in test environment when fetch fails', async () => {
      const env = process.env as Record<string, string | undefined>;
      const original = env.NODE_ENV;
      try {
        env.NODE_ENV = 'test';

        (fetch as any).mockRejectedValueOnce(new Error('Network error'));

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await registry.refreshMarketplace();

        expect(consoleSpy).toHaveBeenCalledWith('Using mock marketplace data:', expect.any(String));

        consoleSpy.mockRestore();
      } finally {
        env.NODE_ENV = original;
      }
    });
  });

  describe('searchPlugins', () => {
    beforeEach(async () => {
      // Set up mock marketplace data
      const originalEnv = (process.env as any).NODE_ENV;
      (process.env as any).NODE_ENV = 'test';
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await registry.refreshMarketplace();
      (process.env as any).NODE_ENV = originalEnv;
    });

    it('should return all plugins with default options', async () => {
      const plugins = await registry.searchPlugins();

      expect(plugins).toHaveLength(8); // Updated to match new mock data
      // Test first few in alphabetical order (default sort)
      expect(plugins[0].name).toBe('api-documentation-generator');
      expect(plugins[1].name).toBe('claude-code-templates');
      expect(plugins[2].name).toBe('eslint-analyzer');
    });

    it('should filter plugins by query', async () => {
      const options: PluginSearchOptions = { query: 'eslint' };
      const plugins = await registry.searchPlugins(options);

      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('eslint-analyzer');
    });

    it('should filter plugins by category', async () => {
      const options: PluginSearchOptions = { category: 'development-tools' };
      const plugins = await registry.searchPlugins(options);

      expect(plugins).toHaveLength(2); // eslint-analyzer, github-actions-manager
      expect(plugins[0].name).toBe('eslint-analyzer');
      expect(plugins[1].name).toBe('github-actions-manager');
    });

    it('should filter plugins by verification status', async () => {
      const options: PluginSearchOptions = { verified: true };
      const plugins = await registry.searchPlugins(options);

      expect(plugins).toHaveLength(6); // 6 verified plugins in mock data
      expect(plugins.every((p) => p.verified)).toBe(true);
    });

    it('should apply pagination limits', async () => {
      const options: PluginSearchOptions = { limit: 1, offset: 1 };
      const plugins = await registry.searchPlugins(options);

      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('claude-code-templates'); // 2nd plugin in alphabetical order
    });

    it('should return empty array when marketplace is not loaded', async () => {
      const newRegistry = new PluginRegistry();
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const env = process.env as Record<string, string | undefined>;
      const original = env.NODE_ENV;
      try {
        env.NODE_ENV = 'production';

        // In production, the error should be thrown, so catch it
        await expect(newRegistry.searchPlugins()).rejects.toThrow('Network error');
      } finally {
        env.NODE_ENV = original;
      }
    });
  });

  describe('getPlugin', () => {
    beforeEach(async () => {
      // Set up mock marketplace data
      const originalEnv = (process.env as any).NODE_ENV;
      (process.env as any).NODE_ENV = 'test';
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await registry.refreshMarketplace();
      (process.env as any).NODE_ENV = originalEnv;
    });

    it('should return plugin by name', async () => {
      const plugin = await registry.getPlugin('linear-connector');

      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('linear-connector');
      expect(plugin?.category).toBe('project-management');
    });

    it('should return null for non-existent plugin', async () => {
      const plugin = await registry.getPlugin('non-existent');

      expect(plugin).toBeNull();
    });
  });

  describe('plugin installation', () => {
    beforeEach(async () => {
      // Set up mock marketplace data
      const originalEnv = (process.env as any).NODE_ENV;
      (process.env as any).NODE_ENV = 'test';
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await registry.refreshMarketplace();
      (process.env as any).NODE_ENV = originalEnv;
    });

    it('should install plugin successfully', async () => {
      const result = await registry.installPlugin('linear-connector');

      expect(result).toBe(true);
      expect(registry.isPluginInstalled('linear-connector')).toBe(true);

      const status = registry.getPluginStatus('linear-connector');
      expect(status?.status).toBe('installed');
      expect(status?.enabled).toBe(true);
    });

    it('should throw error for non-existent plugin', async () => {
      await expect(registry.installPlugin('non-existent')).rejects.toThrow(
        "Plugin 'non-existent' not found in marketplace",
      );
    });

    it('should throw error when installing already installed plugin without force', async () => {
      await registry.installPlugin('linear-connector');

      await expect(registry.installPlugin('linear-connector')).rejects.toThrow(
        "Plugin 'linear-connector' is already installed. Use --force to reinstall.",
      );
    });

    it('should reinstall plugin with force option', async () => {
      await registry.installPlugin('linear-connector');

      const result = await registry.installPlugin('linear-connector', { force: true });
      expect(result).toBe(true);
    });

    it('should uninstall plugin successfully', async () => {
      await registry.installPlugin('linear-connector');

      const result = await registry.uninstallPlugin('linear-connector');
      expect(result).toBe(true);
      expect(registry.isPluginInstalled('linear-connector')).toBe(false);
    });

    it('should throw error when uninstalling non-installed plugin', async () => {
      await expect(registry.uninstallPlugin('non-existent')).rejects.toThrow(
        "Plugin 'non-existent' is not installed",
      );
    });
  });

  describe('categories', () => {
    it('should return default categories when marketplace not loaded', () => {
      const categories = registry.getCategories();

      expect(categories).toContain('development-tools');
      expect(categories).toContain('ai-model-integrations');
      expect(categories).toContain('project-management');
    });

    it('should return marketplace categories when loaded', async () => {
      const mockResponse = {
        version: '1.0.0',
        lastUpdated: '2025-08-20T00:00:00Z',
        categories: ['custom-category'],
        plugins: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await registry.refreshMarketplace();
      const categories = registry.getCategories();

      expect(categories).toEqual(['custom-category']);
    });
  });

  describe('installed plugins management', () => {
    it('should return empty list initially', () => {
      const plugins = registry.getInstalledPlugins();
      expect(plugins).toEqual([]);
    });

    it('should track installed plugins', async () => {
      await registry.installPlugin('linear-connector');
      const plugins = registry.getInstalledPlugins();

      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('linear-connector');
      expect(plugins[0].status).toBe('installed');
    });
  });

  describe('schema conformance', () => {
    it('should validate mock marketplace index against schema', () => {
      const mockIndex = (registry as any).getMockMarketplaceIndex();

      // This test ensures the mock data stays in sync with the schema
      expect(() => {
        MarketplaceIndexSchema.parse(mockIndex);
      }).not.toThrow();

      // Verify claude-code-templates specifically has required fields
      const claudePlugin = mockIndex.plugins.find((p: any) => p.name === 'claude-code-templates');
      expect(claudePlugin).toBeDefined();
      expect(claudePlugin.rating).toBe(4.8);
      expect(claudePlugin.downloads).toBe(15420);
      expect(claudePlugin.maintainerVerified).toBe(true);
      expect(claudePlugin.documentation).toEqual({
        readme: 'https://docs.cortexos.ai/plugins/claude-code-templates',
        api: 'https://docs.cortexos.ai/plugins/claude-code-templates/api',
        examples: 'https://docs.cortexos.ai/plugins/claude-code-templates/examples',
      });
    });
  });
});
