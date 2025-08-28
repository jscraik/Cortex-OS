/**
 * @file_path apps/cortex-os/packages/mcp/src/mcp-config-storage.ts
 * @description Persistent storage layer for MCP server configurations
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { promises as fs } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

interface McpServerConfig {
  name: string;
  type: 'stdio' | 'sse' | 'http';
  transport: 'stdio' | 'sse' | 'http';
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
  environment?: Record<string, string>;
  timeout?: number;
  connectionMode?: 'lenient' | 'strict';
  maxRetries?: number;
  sandbox?: boolean;
  allowedCapabilities?: string[];
  approved?: boolean;
  approvedAt?: string;
  hash?: string;
  installedAt?: string;
  securityLevel?: 'low' | 'medium' | 'high';
  disabled?: boolean;
  autoApprove?: string[];
}

interface McpRuntimeConfig {
  servers: Record<string, McpServerConfig>;
  metadata?: {
    lastUpdated: string;
    version: string;
    totalServers: number;
  };
}

interface ServerInstallationResult {
  installed: boolean;
  config?: McpServerConfig;
  message: string;
}

interface ServerListResult {
  servers: McpServerConfig[];
  metadata: {
    total: number;
    active: number;
    disabled: number;
    securitySummary: {
      low: number;
      medium: number;
      high: number;
    };
  };
}

/**
 * Manages persistent storage of MCP server configurations
 * Supports multiple configuration locations for different use cases
 */
export class McpConfigStorage {
  private readonly configPaths = {
    // Primary runtime config for Cortex OS
    runtime: join(homedir(), '.cortex-os', '.cortex', 'mcp.runtime.json'),
    // Project-specific config (if in project directory)
    project: '.mcp.json',
  };

  /**
   * Get the primary configuration file path
   */
  private getPrimaryConfigPath(): string {
    return this.configPaths.runtime;
  }

  /**
   * Ensure configuration directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    const configPath = this.getPrimaryConfigPath();
    const configDir = dirname(configPath);

    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }
  }

  /**
   * Read the current MCP runtime configuration
   */
  async readConfig(): Promise<McpRuntimeConfig> {
    const configPath = this.getPrimaryConfigPath();

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as McpRuntimeConfig;

      // Ensure servers object exists
      if (!config.servers) {
        config.servers = {};
      }

      return config;
    } catch {
      // Return empty config if file doesn't exist or is invalid
      return {
        servers: {},
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: '1.0.0',
          totalServers: 0,
        },
      };
    }
  }

  /**
   * Write MCP runtime configuration
   */
  async writeConfig(config: McpRuntimeConfig): Promise<void> {
    await this.ensureConfigDir();
    const configPath = this.getPrimaryConfigPath();

    // Update metadata
    config.metadata = {
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
      totalServers: Object.keys(config.servers).length,
    };

    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(configPath, content, 'utf-8');
  }

  /**
   * Check if a server is already installed
   */
  async isServerInstalled(nameOrUrl: string): Promise<ServerInstallationResult> {
    try {
      const config = await this.readConfig();

      // Check by name first
      if (config.servers[nameOrUrl]) {
        return {
          installed: true,
          config: config.servers[nameOrUrl],
          message: `MCP server '${nameOrUrl}' is installed and configured`,
        };
      }

      // Check by URL for http/sse servers
      const serverByUrl = Object.values(config.servers).find((server) => server.url === nameOrUrl);

      if (serverByUrl) {
        return {
          installed: true,
          config: serverByUrl,
          message: `MCP server with URL '${nameOrUrl}' is installed as '${serverByUrl.name}'`,
        };
      }

      return {
        installed: false,
        message: `MCP server '${nameOrUrl}' is not currently installed`,
      };
    } catch (error) {
      return {
        installed: false,
        message: `Error checking installation status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Add or update an MCP server configuration
   */
  async addServer(serverConfig: McpServerConfig): Promise<void> {
    const config = await this.readConfig();

    // Add installation timestamp
    const configWithMetadata: McpServerConfig = {
      ...serverConfig,
      installedAt: new Date().toISOString(),
      transport: serverConfig.type, // Ensure transport matches type
    };

    config.servers[serverConfig.name] = configWithMetadata;
    await this.writeConfig(config);
  }

  /**
   * Remove an MCP server configuration
   */
  async removeServer(serverName: string): Promise<boolean> {
    const config = await this.readConfig();

    if (config.servers[serverName]) {
      delete config.servers[serverName];
      await this.writeConfig(config);
      return true;
    }

    return false;
  }

  /**
   * List all configured MCP servers
   */
  async listServers(): Promise<ServerListResult> {
    const config = await this.readConfig();
    const servers = Object.values(config.servers);

    const active = servers.filter((s) => !s.disabled).length;
    const disabled = servers.filter((s) => s.disabled).length;

    const securitySummary = servers.reduce(
      (acc, server) => {
        const level = server.securityLevel || 'low';
        acc[level]++;
        return acc;
      },
      { low: 0, medium: 0, high: 0 },
    );

    return {
      servers,
      metadata: {
        total: servers.length,
        active,
        disabled,
        securitySummary,
      },
    };
  }

  /**
   * Get status information for a specific server
   */
  async getServerStatus(serverName: string): Promise<McpServerConfig | null> {
    const config = await this.readConfig();
    return config.servers[serverName] || null;
  }

  /**
   * Update server status or configuration
   */
  async updateServer(serverName: string, updates: Partial<McpServerConfig>): Promise<boolean> {
    const config = await this.readConfig();

    if (config.servers[serverName]) {
      config.servers[serverName] = {
        ...config.servers[serverName],
        ...updates,
      };
      await this.writeConfig(config);
      return true;
    }

    return false;
  }

  /**
   * Get configuration file paths for debugging
   */
  getConfigPaths(): typeof this.configPaths {
    return this.configPaths;
  }

  /**
   * Backup current configuration
   */
  async backupConfig(): Promise<string> {
    const config = await this.readConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.getPrimaryConfigPath()}.backup-${timestamp}`;

    await fs.writeFile(backupPath, JSON.stringify(config, null, 2), 'utf-8');
    return backupPath;
  }
}

// Export singleton instance
export const mcpConfigStorage = new McpConfigStorage();
