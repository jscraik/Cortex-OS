/**
 * @file_path packages/mcp/src/plugin-registry.ts
 * @description Plugin registry for discovering and managing MCP plugins
 * @maintainer @jamiescottcraik
 * @last_updated 2025-01-12
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { getMockMarketplaceIndex } from './mocks/marketplace.js';
import {
  MarketplaceIndex,
  MarketplaceIndexSchema,
  PluginInstallOptions,
  PluginMetadata,
  PluginSearchOptions,
  PluginStatus,
} from './types.js';

export class PluginRegistry {
  private readonly MARKETPLACE_URL = 'https://plugins.brainwav.ai/index.json';
  private readonly INSTALLED_PLUGINS_PATH = '.cortex-os/plugins/installed.json';
  private marketplaceIndex: MarketplaceIndex | null = null;
  private marketplaceRefreshPromise: Promise<void> | null = null;
  private installedPlugins: Map<string, PluginStatus> = new Map();
  private installDelayMs: number;

  constructor() {
    this.loadInstalledPlugins();
    this.installDelayMs = process.env.NODE_ENV === 'test' ? 10 : 1000;
  }

  /**
   * Fetch and cache the marketplace index
   */
  async refreshMarketplace(): Promise<void> {
    // Deduplicate concurrent refreshes
    if (this.marketplaceRefreshPromise) {
      return this.marketplaceRefreshPromise;
    }

    this.marketplaceRefreshPromise = (async () => {
      try {
        const response = await fetch(this.MARKETPLACE_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch marketplace: ${response.status}`);
        }

        const data = await response.json();
        this.marketplaceIndex = MarketplaceIndexSchema.parse(data);
      } catch (error: unknown) {
        // For development/test, fall back to mock data; in production rethrow
        // If it's a Zod error, include the details for easier debugging
        const env = (process.env as Record<string, string | undefined>).NODE_ENV;
        const isDev = env === 'development' || env === 'test';
        if (isDev) {
          this.marketplaceIndex = getMockMarketplaceIndex();
          // eslint-disable-next-line no-console
          console.warn(
            'Using mock marketplace data:',
            error instanceof Error ? error.message : String(error),
          );
        } else {
          throw error;
        }
      } finally {
        this.marketplaceRefreshPromise = null;
      }
    })();

    return this.marketplaceRefreshPromise;
  }

  /**
   * Search for plugins in the marketplace
   */
  async searchPlugins(options: PluginSearchOptions = {}): Promise<PluginMetadata[]> {
    // Set defaults
    const searchOptions = {
      limit: 20,
      offset: 0,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      ...options,
    };
    if (!this.marketplaceIndex) {
      await this.refreshMarketplace();
    }

    if (!this.marketplaceIndex) {
      return [];
    }

    let plugins = this.marketplaceIndex.plugins;

    // Apply filters
    if (searchOptions.query) {
      const query = searchOptions.query.toLowerCase();
      plugins = plugins.filter(
        (plugin: PluginMetadata) =>
          plugin.name.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query) ||
          plugin.keywords.some((keyword: string) => keyword.toLowerCase().includes(query)),
      );
    }

    if (searchOptions.category) {
      plugins = plugins.filter(
        (plugin: PluginMetadata) => plugin.category === searchOptions.category,
      );
    }

    if (searchOptions.verified !== undefined) {
      plugins = plugins.filter(
        (plugin: PluginMetadata) => plugin.verified === searchOptions.verified,
      );
    }

    if (searchOptions.maintainerVerified !== undefined) {
      plugins = plugins.filter(
        (plugin: PluginMetadata) => plugin.maintainerVerified === searchOptions.maintainerVerified,
      );
    }

    if (searchOptions.minRating !== undefined) {
      plugins = plugins.filter(
        (plugin: PluginMetadata) => (plugin.rating ?? 0) >= searchOptions.minRating!,
      );
    }

    if (searchOptions.minDownloads !== undefined) {
      plugins = plugins.filter(
        (plugin: PluginMetadata) => (plugin.downloads ?? 0) >= searchOptions.minDownloads!,
      );
    }

    // Apply sorting
    plugins.sort((a: PluginMetadata, b: PluginMetadata) => {
      // Resolve comparable values
      let aValue: number | string = '';
      let bValue: number | string = '';

      switch (searchOptions.sortBy) {
        case 'rating':
          aValue = (a.rating ?? 0) as number;
          bValue = (b.rating ?? 0) as number;
          break;
        case 'downloads':
          aValue = (a.downloads ?? 0) as number;
          bValue = (b.downloads ?? 0) as number;
          break;
        case 'updated':
          aValue = Number(new Date(a.updated).getTime() || 0);
          bValue = Number(new Date(b.updated).getTime() || 0);
          break;
        case 'name':
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }

      // Numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return searchOptions.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      }

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return searchOptions.sortOrder === 'desc'
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }

      return 0;
    });

    // Apply pagination
    const start = searchOptions.offset ?? 0;
    const end = start + (searchOptions.limit ?? 20);

    return plugins.slice(start, end);
  }

  /**
   * Get plugin details by name
   */
  async getPlugin(name: string): Promise<PluginMetadata | null> {
    if (!this.marketplaceIndex) {
      await this.refreshMarketplace();
    }

    return this.marketplaceIndex?.plugins.find((p: PluginMetadata) => p.name === name) || null;
  }

  /**
   * List all installed plugins
   */
  getInstalledPlugins(): PluginStatus[] {
    return Array.from(this.installedPlugins.values());
  }

  /**
   * Check if a plugin is installed
   */
  isPluginInstalled(name: string): boolean {
    return this.installedPlugins.has(name);
  }

  /**
   * Get status of an installed plugin
   */
  getPluginStatus(name: string): PluginStatus | null {
    return this.installedPlugins.get(name) || null;
  }

  /**
   * Install a plugin (placeholder implementation)
   */
  async installPlugin(
    name: string,
    options: PluginInstallOptions = { force: false, skipDependencies: false },
  ): Promise<boolean> {
    const plugin = await this.getPlugin(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found in marketplace`);
    }

    if (this.isPluginInstalled(name) && !options.force) {
      throw new Error(`Plugin '${name}' is already installed. Use --force to reinstall.`);
    }

    // Mock installation process
    const status: PluginStatus = {
      name: plugin.name,
      version: plugin.version,
      status: 'installing',
      installedAt: new Date().toISOString(),
      path: `.cortex-os/plugins/${name}`,
      enabled: true,
      errors: [],
    };

    this.installedPlugins.set(name, status);

    // Simulate installation time (shorter in test env)
    await new Promise((resolve) => setTimeout(resolve, this.installDelayMs));

    // Update status to installed
    status.status = 'installed';
    this.installedPlugins.set(name, status);

    await this.saveInstalledPlugins();
    return true;
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(name: string): Promise<boolean> {
    if (!this.isPluginInstalled(name)) {
      throw new Error(`Plugin '${name}' is not installed`);
    }

    this.installedPlugins.delete(name);
    await this.saveInstalledPlugins();
    return true;
  }

  /**
   * Get available categories
   */
  getCategories(): string[] {
    return (
      this.marketplaceIndex?.categories || [
        'development-tools',
        'ai-model-integrations',
        'project-management',
        'communication',
        'security-tools',
        'utilities',
      ]
    );
  }

  /**
   * Load installed plugins from storage
   */
  private async loadInstalledPlugins(): Promise<void> {
    // TODO: Implement real persistence for loading installed plugins.
    try {
      // Mock loading for now - in real implementation would read from file
      this.installedPlugins = new Map();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load installed plugins:', error);
      this.installedPlugins = new Map();
    }
  }

  /**
   * Save installed plugins to storage
   */
  private async saveInstalledPlugins(): Promise<void> {
    // TODO: Implement real persistence for installed plugins.
    try {
      // Mock saving for now - in real implementation would write to file
      const data = Array.from(this.installedPlugins.values());
      if (process.env.NODE_ENV === 'test') {
        // eslint-disable-next-line no-console
        console.log('Saving installed plugins:', data);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save installed plugins:', error);
    }
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
