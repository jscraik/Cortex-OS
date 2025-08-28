/**
 * @file MCP Marketplace Client
 * @description Client for interacting with MCP marketplace registries
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import type {
  RegistryIndex,
  ServerManifest,
  SearchRequest,
  ApiResponse,
} from '@cortex-os/mcp-marketplace';
import {
  RegistryIndexSchema,
  ServerManifestSchema,
  SearchRequestSchema,
} from '@cortex-os/mcp-marketplace';

/**
 * Configuration for marketplace client
 */
export const MarketplaceConfigSchema = z.object({
  registries: z.record(z.string().url()),
  cacheDir: z.string(),
  cacheTtl: z.number().int().min(60000).default(300000), // 5 minutes default
  security: z
    .object({
      requireSignatures: z.boolean().default(true),
      allowedRiskLevels: z.array(z.enum(['low', 'medium', 'high'])).default(['low', 'medium']),
      trustedPublishers: z.array(z.string()).default([]),
    })
    .default({}),
});

export type MarketplaceConfig = z.infer<typeof MarketplaceConfigSchema>;

/**
 * Cache entry structure
 */
const CacheEntrySchema = z.object({
  data: RegistryIndexSchema,
  cachedAt: z.number(),
  registryUrl: z.string().url(),
});

type CacheEntry = z.infer<typeof CacheEntrySchema>;

/**
 * Installed server information
 */
export interface InstalledServer {
  id: string;
  name?: string;
  status: 'active' | 'inactive' | 'error';
  transport: 'stdio' | 'streamableHttp';
  source: 'marketplace' | 'manual';
  installedAt: string;
}

/**
 * Registry information
 */
export interface RegistryInfo {
  name: string;
  url: string;
  trusted: boolean;
  healthy?: boolean;
  lastChecked?: string;
}

/**
 * MCP Marketplace Client
 */
export class MarketplaceClient {
  private registryCache = new Map<string, RegistryIndex>();
  private cacheTimes = new Map<string, number>();

  constructor(private config: MarketplaceConfig) {
    // Validate config
    MarketplaceConfigSchema.parse(config);
  }

  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    // Ensure cache directory exists
    if (!existsSync(this.config.cacheDir)) {
      await mkdir(this.config.cacheDir, { recursive: true });
    }

    // Load cached registries
    await this.loadCachedRegistries();

    // Fetch fresh data for stale registries
    for (const [name, url] of Object.entries(this.config.registries)) {
      if (this.isCacheStale(url)) {
        try {
          await this.fetchRegistry(url);
        } catch (error) {
          console.warn(
            `Failed to update registry ${name}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }
  }

  /**
   * Search servers across all registries
   */
  async search(
    request: SearchRequest,
    registryUrl?: string,
  ): Promise<ApiResponse<ServerManifest[]>> {
    try {
      // Validate request
      const validatedRequest = SearchRequestSchema.parse(request);

      // Determine which registries to search
      const registriesToSearch = registryUrl
        ? [registryUrl]
        : Object.values(this.config.registries);

      if (registriesToSearch.length === 0) {
        return {
          success: false,
          error: { code: 'REGISTRY_NOT_LOADED', message: 'No registries available' },
        };
      }

      let allServers: ServerManifest[] = [];

      // Collect servers from all registries
      for (const url of registriesToSearch) {
        const registry = this.registryCache.get(url);
        if (registry) {
          allServers.push(...registry.servers);
        }
      }

      if (allServers.length === 0) {
        return {
          success: false,
          error: { code: 'REGISTRY_NOT_LOADED', message: 'Registry data not available' },
        };
      }

      // Apply filters
      let filteredServers = allServers;

      // Text search
      if (validatedRequest.q) {
        const query = validatedRequest.q.toLowerCase();
        filteredServers = filteredServers.filter(
          (server) =>
            server.name.toLowerCase().includes(query) ||
            server.description?.toLowerCase().includes(query) ||
            server.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
            server.publisher.name.toLowerCase().includes(query),
        );
      }

      // Category filter
      if (validatedRequest.category) {
        filteredServers = filteredServers.filter(
          (server) => server.category === validatedRequest.category,
        );
      }

      // Capabilities filter
      if (validatedRequest.capabilities && validatedRequest.capabilities.length > 0) {
        filteredServers = filteredServers.filter((server) =>
          validatedRequest.capabilities!.every((cap) => server.capabilities[cap]),
        );
      }

      // Verified publisher filter
      if (validatedRequest.verified !== undefined) {
        filteredServers = filteredServers.filter(
          (server) => server.publisher.verified === validatedRequest.verified,
        );
      }

      // Sort by featured first, then by downloads/rating
      filteredServers.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;

        // If both are featured or both are not, sort by downloads then rating
        if (b.downloads !== a.downloads) {
          return b.downloads - a.downloads;
        }

        if (a.rating && b.rating) {
          return b.rating - a.rating;
        }

        return 0;
      });

      // Apply pagination
      const total = filteredServers.length;
      const paginatedServers = filteredServers.slice(
        validatedRequest.offset,
        validatedRequest.offset + validatedRequest.limit,
      );

      return {
        success: true,
        data: paginatedServers,
        meta: {
          total,
          offset: validatedRequest.offset,
          limit: validatedRequest.limit,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid search parameters',
            details: error.errors,
          },
        };
      }

      throw error;
    }
  }

  /**
   * Get server by ID
   */
  async getServer(serverId: string): Promise<ServerManifest | null> {
    for (const registry of this.registryCache.values()) {
      const server = registry.servers.find((s) => s.id === serverId);
      if (server) {
        return server;
      }
    }
    return null;
  }

  /**
   * Add server to local configuration
   */
  async addServer(
    serverId: string,
    options: {
      transport?: 'stdio' | 'streamableHttp';
    } = {},
  ): Promise<ApiResponse<{ installed: boolean; serverId: string }>> {
    try {
      // Find server in registry
      const server = await this.getServer(serverId);
      if (!server) {
        return {
          success: false,
          error: { code: 'SERVER_NOT_FOUND', message: `Server not found in registry: ${serverId}` },
        };
      }

      // Security validation
      const securityCheck = this.validateServerSecurity(server);
      if (!securityCheck.allowed) {
        return {
          success: false,
          error: {
            code: securityCheck.reason === 'risk' ? 'SECURITY_VIOLATION' : 'SIGNATURE_REQUIRED',
            message: securityCheck.message,
            details: { riskLevel: server.security.riskLevel, permissions: server.permissions },
          },
        };
      }

      // Determine transport to use
      let selectedTransport: 'stdio' | 'streamableHttp';
      if (options.transport) {
        selectedTransport = options.transport;

        // Validate transport is available
        if (selectedTransport === 'stdio' && !server.transport.stdio) {
          return {
            success: false,
            error: {
              code: 'TRANSPORT_UNAVAILABLE',
              message: 'stdio transport not available for this server',
            },
          };
        }
        if (selectedTransport === 'streamableHttp' && !server.transport.streamableHttp) {
          return {
            success: false,
            error: {
              code: 'TRANSPORT_UNAVAILABLE',
              message: 'streamableHttp transport not available for this server',
            },
          };
        }
      } else {
        // Auto-select transport (prefer stdio for local, streamableHttp for remote)
        selectedTransport = server.transport.stdio ? 'stdio' : 'streamableHttp';
      }

      // Load existing configuration
      const configPath = path.join(this.config.cacheDir, '..', 'servers.json');
      let config: any = { mcpServers: {} };

      try {
        const configData = await readFile(configPath, 'utf-8');
        config = JSON.parse(configData);
      } catch (error) {
        // File doesn't exist, will create new one
        config = { mcpServers: {} };
      }

      // Add server configuration
      if (selectedTransport === 'stdio' && server.transport.stdio) {
        config.mcpServers[serverId] = {
          command: server.transport.stdio.command,
          args: server.transport.stdio.args || [],
          env: server.transport.stdio.env || {},
        };
      } else if (selectedTransport === 'streamableHttp' && server.transport.streamableHttp) {
        config.mcpServers[serverId] = {
          serverUrl: server.transport.streamableHttp.url,
          headers: server.transport.streamableHttp.headers || {},
        };
      }

      // Save configuration
      await writeFile(configPath, JSON.stringify(config, null, 2));

      return {
        success: true,
        data: { installed: true, serverId },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INSTALLATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Remove server from local configuration
   */
  async removeServer(serverId: string): Promise<ApiResponse<{ removed: boolean }>> {
    try {
      const configPath = path.join(this.config.cacheDir, '..', 'servers.json');

      let config: any;
      try {
        const configData = await readFile(configPath, 'utf-8');
        config = JSON.parse(configData);
      } catch (error) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Server not installed: ${serverId}` },
        };
      }

      if (!config.mcpServers || !config.mcpServers[serverId]) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: `Server not installed: ${serverId}` },
        };
      }

      // Remove server
      delete config.mcpServers[serverId];

      // Save configuration
      await writeFile(configPath, JSON.stringify(config, null, 2));

      return {
        success: true,
        data: { removed: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REMOVAL_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * List installed servers
   */
  async listServers(): Promise<ApiResponse<InstalledServer[]>> {
    try {
      const configPath = path.join(this.config.cacheDir, '..', 'servers.json');

      let config: any;
      try {
        const configData = await readFile(configPath, 'utf-8');
        config = JSON.parse(configData);
      } catch (error) {
        return {
          success: true,
          data: [],
        };
      }

      const servers: InstalledServer[] = [];

      if (config.mcpServers) {
        for (const [id, serverConfig] of Object.entries(config.mcpServers)) {
          const manifest = await this.getServer(id);

          servers.push({
            id,
            name: manifest?.name || id,
            status: 'active', // TODO: Implement actual status checking
            transport: (serverConfig as any).command ? 'stdio' : 'streamableHttp',
            source: manifest ? 'marketplace' : 'manual',
            installedAt: new Date().toISOString(), // TODO: Track actual install time
          });
        }
      }

      return {
        success: true,
        data: servers,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Add custom registry
   */
  async addRegistry(
    url: string,
    options: { name?: string } = {},
  ): Promise<ApiResponse<{ added: boolean; registryUrl: string }>> {
    try {
      // Validate URL
      try {
        new URL(url);
      } catch {
        return {
          success: false,
          error: { code: 'INVALID_URL', message: 'Invalid registry URL' },
        };
      }

      if (!url.startsWith('https://')) {
        return {
          success: false,
          error: { code: 'INSECURE_URL', message: 'Registry URL must use HTTPS' },
        };
      }

      // Test connectivity
      try {
        await this.fetchRegistry(url);
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'REGISTRY_UNREACHABLE',
            message: `Cannot connect to registry: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        };
      }

      // Add to configuration (this would persist to config file in real implementation)
      const name = options.name || `custom-${Date.now()}`;
      this.config.registries[name] = url;

      return {
        success: true,
        data: { added: true, registryUrl: url },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_REGISTRY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Remove registry
   */
  async removeRegistry(nameOrUrl: string): Promise<ApiResponse<{ removed: boolean }>> {
    const registryToRemove = Object.entries(this.config.registries).find(
      ([name, url]) => name === nameOrUrl || url === nameOrUrl,
    );

    if (!registryToRemove) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Registry not found: ${nameOrUrl}` },
      };
    }

    const [name, url] = registryToRemove;
    delete this.config.registries[name];
    this.registryCache.delete(url);
    this.cacheTimes.delete(url);

    return {
      success: true,
      data: { removed: true },
    };
  }

  /**
   * List configured registries
   */
  async listRegistries(): Promise<ApiResponse<RegistryInfo[]>> {
    const registries: RegistryInfo[] = [];

    for (const [name, url] of Object.entries(this.config.registries)) {
      registries.push({
        name,
        url,
        trusted: name === 'default', // TODO: Implement proper trust system
        healthy: this.registryCache.has(url),
        lastChecked: this.cacheTimes.has(url)
          ? new Date(this.cacheTimes.get(url)!).toISOString()
          : undefined,
      });
    }

    return {
      success: true,
      data: registries,
    };
  }

  /**
   * Check registry health
   */
  async healthCheck(registryUrl: string): Promise<
    ApiResponse<{
      healthy: boolean;
      serverCount?: number;
      lastUpdated?: string;
      error?: string;
    }>
  > {
    try {
      const registry = await this.fetchRegistry(registryUrl);

      return {
        success: true,
        data: {
          healthy: true,
          serverCount: registry.serverCount,
          lastUpdated: registry.updatedAt,
        },
      };
    } catch (error) {
      return {
        success: true, // Health check itself succeeds, but registry is unhealthy
        data: {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Private methods
   */
  private async fetchRegistry(url: string): Promise<RegistryIndex> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const registry = RegistryIndexSchema.parse(data);

    // Cache the registry
    this.registryCache.set(url, registry);
    this.cacheTimes.set(url, Date.now());

    // Save to disk cache
    await this.saveCacheEntry(url, registry);

    return registry;
  }

  private async loadCachedRegistries(): Promise<void> {
    for (const url of Object.values(this.config.registries)) {
      try {
        const cacheFile = this.getCacheFilePath(url);
        if (existsSync(cacheFile)) {
          const cacheData = await readFile(cacheFile, 'utf-8');
          const cacheEntry = CacheEntrySchema.parse(JSON.parse(cacheData));

          this.registryCache.set(url, cacheEntry.data);
          this.cacheTimes.set(url, cacheEntry.cachedAt);
        }
      } catch (error) {
        // Ignore cache errors, will fetch fresh data
        console.debug(`Failed to load cache for ${url}:`, error);
      }
    }
  }

  private async saveCacheEntry(url: string, registry: RegistryIndex): Promise<void> {
    try {
      const cacheEntry: CacheEntry = {
        data: registry,
        cachedAt: Date.now(),
        registryUrl: url,
      };

      const cacheFile = this.getCacheFilePath(url);
      await writeFile(cacheFile, JSON.stringify(cacheEntry, null, 2));
    } catch (error) {
      console.warn(`Failed to save cache for ${url}:`, error);
    }
  }

  private getCacheFilePath(url: string): string {
    // Create a safe filename from URL
    const urlHash = Buffer.from(url).toString('base64url');
    return path.join(this.config.cacheDir, `registry-${urlHash}.json`);
  }

  private isCacheStale(url: string): boolean {
    const cacheTime = this.cacheTimes.get(url);
    if (!cacheTime) return true;

    return Date.now() - cacheTime > this.config.cacheTtl;
  }

  private validateServerSecurity(server: ServerManifest): {
    allowed: boolean;
    reason?: 'risk' | 'signature' | 'publisher';
    message: string;
  } {
    // Check risk level
    if (!this.config.security.allowedRiskLevels.includes(server.security.riskLevel)) {
      return {
        allowed: false,
        reason: 'risk',
        message: `Risk level not allowed: ${server.security.riskLevel}. Allowed levels: ${this.config.security.allowedRiskLevels.join(', ')}`,
      };
    }

    // Check signature requirement
    if (this.config.security.requireSignatures && !server.security.sigstore) {
      return {
        allowed: false,
        reason: 'signature',
        message: 'Server signature required but not provided',
      };
    }

    // Check trusted publishers (if configured)
    if (
      this.config.security.trustedPublishers.length > 0 &&
      !this.config.security.trustedPublishers.includes(server.publisher.name)
    ) {
      return {
        allowed: false,
        reason: 'publisher',
        message: `Publisher not in trusted list: ${server.publisher.name}`,
      };
    }

    return { allowed: true, message: 'Security validation passed' };
  }
}
