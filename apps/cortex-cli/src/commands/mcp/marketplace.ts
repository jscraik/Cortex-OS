/**
 * @file MCP Marketplace Commands Implementation
 * @description Command implementations for MCP marketplace integration (TDD)
 */

import type { ClientType, ServerManifest } from '@cortex-os/mcp-marketplace';
import { InstallCommandGenerator } from '@cortex-os/mcp-marketplace/install';
import chalk from 'chalk';
import os from 'os';
import path from 'path';
import { MarketplaceClient, type MarketplaceConfig } from './marketplace-client.js';

/**
 * Marketplace command options
 */
interface SearchOptions {
  category?: string;
  verified?: boolean;
  limit?: number;
  offset?: number;
  json?: boolean;
}

interface ShowOptions {
  client?: ClientType;
  json?: boolean;
}

interface AddOptions {
  transport?: 'stdio' | 'streamableHttp';
  client?: ClientType;
  force?: boolean;
}

interface BridgeOptions {
  add?: boolean;
  remove?: boolean;
  list?: boolean;
  test?: boolean;
  name?: string;
  trusted?: boolean;
}

/**
 * MCP Marketplace Command Implementation
 */
export class McpMarketplaceCommand {
  private client: MarketplaceClient;
  private installGenerator: InstallCommandGenerator;

  constructor() {
    // Initialize with default configuration
    const defaultConfig: MarketplaceConfig = {
      registries: {
        default: 'https://registry.cortex-os.dev/v1/registry.json',
      },
      cacheDir: path.join(os.homedir(), '.cortex', 'mcp', 'cache'),
      cacheTtl: 300000, // 5 minutes
      security: {
        requireSignatures: false, // Relaxed for development
        allowedRiskLevels: ['low', 'medium', 'high'],
        trustedPublishers: [],
      },
    };

    this.client = new MarketplaceClient(defaultConfig);
    this.installGenerator = new InstallCommandGenerator();
  }

  /**
   * Initialize the marketplace client
   */
  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  /**
   * Search for MCP servers in marketplace
   */
  async search(query?: string, options: SearchOptions = {}): Promise<void> {
    await this.ensureInitialized();

    const searchRequest = {
      q: query,
      category: options.category,
      verified: options.verified,
      limit: options.limit || 20,
      offset: options.offset || 0,
    };

    const result = await this.client.search(searchRequest);

    if (!result.success) {
      throw new Error(result.error!.message);
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const servers = result.data!;

    if (servers.length === 0) {
      console.log(chalk.yellow('No servers found matching your criteria.'));
      console.log(chalk.gray('Try broadening your search or check different categories.'));
      return;
    }

    // Display header
    console.log(
      chalk.bold(`\n🔍 Found ${result.meta!.total} server${result.meta!.total === 1 ? '' : 's'}\n`),
    );

    // Display servers
    for (const server of servers) {
      this.displayServerSummary(server);
    }

    // Display pagination info
    if (result.meta!.total > result.meta!.limit) {
      const hasMore = result.meta!.offset + result.meta!.limit < result.meta!.total;
      const showing = Math.min(result.meta!.offset + result.meta!.limit, result.meta!.total);

      console.log(
        chalk.gray(
          `\nShowing ${result.meta!.offset + 1}-${showing} of ${result.meta!.total} results`,
        ),
      );

      if (hasMore) {
        console.log(chalk.gray('Use --offset and --limit options to see more results.'));
      }
    }
  }

  /**
   * Show detailed information about a specific server
   */
  async show(serverId: string, options: ShowOptions = {}): Promise<void> {
    // Input validation
    if (!serverId || serverId.trim() === '') {
      throw new Error('Server ID is required');
    }

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(serverId)) {
      throw new Error('Invalid server ID format');
    }

    await this.ensureInitialized();

    const server = await this.client.getServer(serverId);

    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    if (options.json) {
      console.log(JSON.stringify(server, null, 2));
      return;
    }

    this.displayServerDetails(server, options.client);
  }

  /**
   * Add server from marketplace
   */
  async add(serverId: string, options: AddOptions = {}): Promise<void> {
    // Input validation
    if (!serverId || serverId.trim() === '') {
      throw new Error('Server ID is required');
    }

    await this.ensureInitialized();

    const result = await this.client.addServer(serverId, {
      transport: options.transport,
    });

    if (!result.success) {
      throw new Error(result.error!.message);
    }

    console.log(chalk.green(`✅ Successfully added server: ${serverId}`));

    // Show next steps
    const server = await this.client.getServer(serverId);
    if (server && options.client) {
      console.log(chalk.gray('\n📋 Installation command:'));
      const command = this.installGenerator.generateCommand(server, options.client);
      if (command) {
        console.log(chalk.blue(`  ${command.command}`));
      }
    }
  }

  /**
   * Remove server
   */
  async remove(serverId: string): Promise<void> {
    await this.ensureInitialized();

    const result = await this.client.removeServer(serverId);

    if (!result.success) {
      throw new Error(result.error!.message);
    }

    console.log(chalk.green(`✅ Successfully removed server: ${serverId}`));
  }

  /**
   * List installed servers
   */
  async list(): Promise<void> {
    await this.ensureInitialized();

    const result = await this.client.listServers();

    if (!result.success) {
      throw new Error(result.error!.message);
    }

    const servers = result.data!;

    if (servers.length === 0) {
      console.log(chalk.yellow('No MCP servers installed.'));
      console.log(chalk.gray('Use "cortex mcp search" to find servers to install.'));
      return;
    }

    console.log(chalk.bold(`\n📦 Installed MCP Servers (${servers.length})\n`));

    for (const server of servers) {
      const statusIcon =
        server.status === 'active' ? '🟢' : server.status === 'inactive' ? '🟡' : '🔴';
      const sourceIcon = server.source === 'marketplace' ? '🏪' : '⚙️';

      console.log(`${statusIcon} ${sourceIcon} ${chalk.bold(server.name || server.id)}`);
      console.log(`   ID: ${chalk.dim(server.id)}`);
      console.log(`   Transport: ${chalk.cyan(server.transport)}`);
      console.log(
        `   Status: ${chalk[server.status === 'active' ? 'green' : 'yellow'](server.status)}`,
      );
      console.log();
    }
  }

  /**
   * Manage custom registries and bridge connections
   */
  async bridge(registryUrl: string | null, options: BridgeOptions = {}): Promise<void> {
    await this.ensureInitialized();

    // List registries
    if (options.list || (!registryUrl && !options.add && !options.remove)) {
      const result = await this.client.listRegistries();
      if (!result.success) {
        throw new Error(result.error!.message);
      }

      const registries = result.data!;
      console.log(chalk.bold(`\n🌐 Configured Registries (${registries.length})\n`));

      for (const registry of registries) {
        const trustIcon = registry.trusted ? '✓' : '!';
        const healthIcon = registry.healthy ? '🟢' : '🔴';

        console.log(`${healthIcon} ${trustIcon} ${chalk.bold(registry.name)}`);
        console.log(`   URL: ${chalk.cyan(registry.url)}`);
        console.log(`   Trusted: ${registry.trusted ? chalk.green('Yes') : chalk.yellow('No')}`);
        if (registry.lastChecked) {
          console.log(
            `   Last checked: ${chalk.dim(new Date(registry.lastChecked).toLocaleString())}`,
          );
        }
        console.log();
      }
      return;
    }

    if (!registryUrl) {
      throw new Error('Registry URL is required');
    }

    // Validate URL
    try {
      new URL(registryUrl);
    } catch {
      throw new Error('Invalid registry URL');
    }

    if (!registryUrl.startsWith('https://')) {
      throw new Error('Registry URLs must use HTTPS');
    }

    // Test registry connectivity
    if (options.test) {
      const result = await this.client.healthCheck(registryUrl);
      if (!result.success) {
        throw new Error(result.error!.message);
      }

      const health = result.data!;
      if (health.healthy) {
        console.log(chalk.green('✅ Registry is healthy'));
        console.log(`   Servers available: ${health.serverCount}`);
        console.log(`   Last updated: ${new Date(health.lastUpdated!).toLocaleString()}`);
      } else {
        console.log(chalk.red('❌ Registry is unhealthy'));
        console.log(`   Error: ${health.error}`);
      }
      return;
    }

    // Add registry
    if (options.add) {
      const result = await this.client.addRegistry(registryUrl, {
        name: options.name,
      });

      if (!result.success) {
        throw new Error(result.error!.message);
      }

      console.log(chalk.green(`✅ Registry added: ${registryUrl}`));
      return;
    }

    // Remove registry
    if (options.remove) {
      const result = await this.client.removeRegistry(registryUrl);

      if (!result.success) {
        throw new Error(result.error!.message);
      }

      console.log(chalk.green(`✅ Registry removed: ${registryUrl}`));
      return;
    }
  }

  /**
   * Private helper methods
   */
  private async ensureInitialized(): Promise<void> {
    // This would check if client is initialized, reinitialize if needed
    // For now, we assume it's always initialized
  }

  private displayServerSummary(server: ServerManifest): void {
    // Risk level indicator
    const riskIcon =
      server.security.riskLevel === 'low'
        ? '🟢'
        : server.security.riskLevel === 'medium'
          ? '🟡'
          : '🔴';

    // Featured indicator
    const featuredIcon = server.featured ? '⭐' : '';

    // Verification indicator
    const verifiedIcon = server.publisher.verified ? '✓' : '';

    console.log(
      `${riskIcon} ${featuredIcon} ${chalk.bold(server.name)} ${verifiedIcon && chalk.green(verifiedIcon)}`,
    );
    console.log(
      `   ${chalk.dim(server.id)} • ${chalk.cyan(server.category)} • ${server.publisher.name}`,
    );

    if (server.description) {
      const truncatedDesc =
        server.description.length > 80
          ? server.description.substring(0, 77) + '...'
          : server.description;
      console.log(`   ${chalk.gray(truncatedDesc)}`);
    }

    // Capabilities
    const capabilities = [];
    if (server.capabilities.tools) capabilities.push('Tools');
    if (server.capabilities.resources) capabilities.push('Resources');
    if (server.capabilities.prompts) capabilities.push('Prompts');

    console.log(`   Capabilities: ${chalk.blue(capabilities.join(', ') || 'None')}`);

    // Downloads and rating
    const stats = [];
    stats.push(`${server.downloads} downloads`);
    if (server.rating) {
      stats.push(`${server.rating}/5 ⭐`);
    }
    console.log(`   ${chalk.dim(stats.join(' • '))}`);
    console.log();
  }

  private displayServerDetails(server: ServerManifest, preferredClient?: ClientType): void {
    console.log(chalk.bold(`\n📦 ${server.name}\n`));

    // Basic info
    console.log(`${chalk.bold('ID:')} ${server.id}`);
    console.log(`${chalk.bold('Category:')} ${chalk.cyan(server.category)}`);
    console.log(
      `${chalk.bold('Publisher:')} ${server.publisher.name} ${server.publisher.verified ? chalk.green('✓ Verified Publisher') : ''}`,
    );

    if (server.version) {
      console.log(`${chalk.bold('Version:')} ${server.version}`);
    }

    if (server.license) {
      console.log(`${chalk.bold('License:')} ${server.license}`);
    }

    console.log();

    // Description
    if (server.description) {
      console.log(`${chalk.bold('Description:')}`);
      console.log(`${server.description}\n`);
    }

    // Capabilities
    const capabilities = [];
    if (server.capabilities.tools) capabilities.push(chalk.green('Tools'));
    if (server.capabilities.resources) capabilities.push(chalk.blue('Resources'));
    if (server.capabilities.prompts) capabilities.push(chalk.magenta('Prompts'));

    console.log(`${chalk.bold('Capabilities:')} ${capabilities.join(', ')}`);

    // Risk and security
    const riskColor =
      server.security.riskLevel === 'low'
        ? 'green'
        : server.security.riskLevel === 'medium'
          ? 'yellow'
          : 'red';
    console.log(
      `${chalk.bold('Risk Level:')} ${chalk[riskColor](server.security.riskLevel.toUpperCase())}`,
    );

    // Stats
    if (server.rating) {
      console.log(`${chalk.bold('Rating:')} ${server.rating}/5 ⭐`);
    }
    console.log(`${chalk.bold('Downloads:')} ${server.downloads.toLocaleString()}`);
    console.log();

    // Permissions
    if (server.permissions.length > 0) {
      console.log(`${chalk.bold('Permissions Required:')}`);
      for (const permission of server.permissions) {
        const isHighRisk = ['system:exec', 'network:admin', 'files:write-system'].includes(
          permission,
        );
        const color = isHighRisk ? 'red' : 'gray';
        console.log(
          `  • ${chalk[color](permission)} ${isHighRisk ? chalk.red('⚠️  High Risk') : ''}`,
        );
      }
      console.log();
    }

    // Installation commands
    console.log(`${chalk.bold('📋 Installation Commands:')}`);
    const commands = this.installGenerator.generateCommands(server);

    if (preferredClient) {
      const preferredCommand = commands.find((cmd) => cmd.client === preferredClient);
      if (preferredCommand) {
        console.log(`\n${chalk.cyan(preferredCommand.description)}:`);
        console.log(`${chalk.blue(preferredCommand.command)}\n`);
      }
    } else {
      // Show all available commands
      for (const command of commands.slice(0, 3)) {
        // Limit to top 3
        console.log(`\n${chalk.cyan(command.description)}:`);
        console.log(`${chalk.blue(command.command)}`);
      }

      if (commands.length > 3) {
        console.log(chalk.gray(`\n... and ${commands.length - 3} more installation options`));
      }
    }

    // Links
    console.log();
    if (server.repository) {
      console.log(`${chalk.bold('Repository:')} ${chalk.cyan(server.repository)}`);
    }
    if (server.homepage) {
      console.log(`${chalk.bold('Homepage:')} ${chalk.cyan(server.homepage)}`);
    }
  }
}
