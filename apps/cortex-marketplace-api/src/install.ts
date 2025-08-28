/**
 * @file Installation Command Generator
 * @description Generates client-specific installation commands for MCP servers
 */

import type { ServerManifest, InstallCommand, ClientType } from './types.js';

/**
 * Generate installation commands for different MCP clients
 */
export class InstallCommandGenerator {
  /**
   * Generate all available install commands for a server
   */
  generateCommands(server: ServerManifest): InstallCommand[] {
    const commands: InstallCommand[] = [];

    const claude = this.generateClaudeCommand(server);
    if (claude) commands.push(claude);

    // JSON configuration
    commands.push(this.generateJsonCommand(server));

    return commands;
  }

  /**
   * Generate specific command for a client
   */
  generateCommand(server: ServerManifest, client: ClientType): InstallCommand | null {
    switch (client) {
      case 'claude':
        return this.generateClaudeCommand(server);
      case 'json':
        return this.generateJsonCommand(server);
      default:
        return null;
    }
  }

  /**
   * Generate Claude Code specific command
   */
  private generateClaudeCommand(server: ServerManifest): InstallCommand | null {
    if (!server.transport.streamableHttp) return null;
    return {
      client: 'claude',
      command: this.buildClaudeHttpCommand(server),
      description: 'Claude Code with remote server (Streamable HTTP)',
    };
  }

  /**
   * Build Claude Code command for streamable HTTP transport
   */
  private buildClaudeHttpCommand(server: ServerManifest): string {
    if (!server.transport.streamableHttp) {
      throw new Error('Server does not support Streamable HTTP transport');
    }

    const config = server.transport.streamableHttp;
    let command = `claude mcp add --transport streamableHttp ${server.id} ${config.url}`;

    // Add headers if specified
    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        command += ` --header "${key}: ${value}"`;
      }
    }

    // Add auth configuration
    if (config.auth && config.auth.type !== 'none') {
      switch (config.auth.type) {
        case 'bearer':
          command += ' --header "Authorization: Bearer <YOUR_TOKEN>"';
          break;
        case 'oauth2':
          if (config.auth.clientId) {
            command += ` --oauth2-client-id ${config.auth.clientId}`;
          }
          if (config.auth.scopes) {
            command += ` --oauth2-scopes "${config.auth.scopes.join(' ')}"`;
          }
          break;
      }
    }

    return command;
  }

  /**
   * Generate JSON configuration
   */
  private generateJsonCommand(server: ServerManifest): InstallCommand {
    type MCPServersConfig = {
      mcpServers: {
        [id: string]: {
          serverUrl: string;
          headers: Record<string, string>;
        };
      };
    };
    const config: MCPServersConfig = {
      mcpServers: {
        [server.id]: {
          serverUrl: server.transport.streamableHttp.url,
          headers: server.transport.streamableHttp.headers || {},
        },
      },
    };

    return {
      client: 'json',
      command: JSON.stringify(config, null, 2),
      description: 'JSON configuration for direct config file usage',
    };
  }

  /**
   * Generate installation instructions with context
   */
  generateInstructions(server: ServerManifest, client: ClientType): string {
    const command = this.generateCommand(server, client);
    if (!command) {
      return `Installation not available for ${client}`;
    }

    let instructions = `## Install ${server.name} for ${client}\n\n`;

    // Add description and capabilities
    instructions += `${server.description}\n\n`;
    instructions += `**Capabilities:** ${this.formatCapabilities(server)}\n`;
    instructions += `**Risk Level:** ${server.security.riskLevel}\n`;
    instructions += `**Publisher:** ${server.publisher.name}${server.publisher.verified ? ' ✓' : ''}\n\n`;

    // Add installation command
    instructions += `### Installation Command\n\n`;
    instructions += `\`\`\`bash\n${command.command}\n\`\`\`\n\n`;

    // Add setup instructions
    if (
      server.transport.streamableHttp.auth?.type &&
      server.transport.streamableHttp.auth.type !== 'none'
    ) {
      instructions += `### Authentication Setup\n\n`;
      instructions += `This server requires authentication. `;

      if (server.transport.streamableHttp.auth.type === 'bearer') {
        instructions += `Replace \`<YOUR_TOKEN>\` with your API token.\n\n`;
      } else if (server.transport.streamableHttp.auth.type === 'oauth2') {
        instructions += `OAuth2 flow will be initiated during first connection.\n\n`;
      }
    }

    // Add permissions warning
    if (server.permissions.length > 0) {
      instructions += `### Permissions Required\n\n`;
      for (const permission of server.permissions) {
        instructions += `- \`${permission}\`\n`;
      }
      instructions += `\n`;
    }

    return instructions;
  }

  /**
   * Format capabilities for display
   */
  private formatCapabilities(server: ServerManifest): string {
    const caps = [];
    if (server.capabilities.tools) caps.push('Tools');
    if (server.capabilities.resources) caps.push('Resources');
    if (server.capabilities.prompts) caps.push('Prompts');
    return caps.join(', ') || 'None';
  }
}
