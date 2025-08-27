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

    // Claude Code commands
    commands.push(...this.generateClaudeCommands(server));
    
    // JSON configuration
    commands.push(this.generateJsonCommand(server));
    
    // Other client commands
    if (server.install.cline) {
      commands.push({
        client: 'cline',
        command: server.install.cline,
        description: 'Install in Cline VS Code extension',
        transport: server.transport.stdio ? 'stdio' : 'streamableHttp',
      });
    }

    if (server.install.cursor) {
      commands.push({
        client: 'cursor',
        command: server.install.cursor,
        description: 'Install in Cursor IDE',
        transport: server.transport.stdio ? 'stdio' : 'streamableHttp',
      });
    }

    if (server.install.continue) {
      commands.push({
        client: 'continue',
        command: server.install.continue,
        description: 'Install in Continue VS Code extension',
        transport: server.transport.stdio ? 'stdio' : 'streamableHttp',
      });
    }

    return commands;
  }

  /**
   * Generate specific command for a client and transport
   */
  generateCommand(
    server: ServerManifest, 
    client: ClientType, 
    transport?: 'stdio' | 'streamableHttp'
  ): InstallCommand | null {
    switch (client) {
      case 'claude':
        return this.generateClaudeCommand(server, transport);
      case 'json':
        return this.generateJsonCommand(server);
      case 'cline':
        return server.install.cline ? {
          client: 'cline',
          command: server.install.cline,
          description: 'Install in Cline',
          transport: transport || (server.transport.stdio ? 'stdio' : 'streamableHttp'),
        } : null;
      case 'cursor':
      case 'continue':
        return server.install[client] ? {
          client,
          command: server.install[client]!,
          description: `Install in ${client}`,
          transport: transport || (server.transport.stdio ? 'stdio' : 'streamableHttp'),
        } : null;
      default:
        return null;
    }
  }

  /**
   * Generate Claude Code specific commands
   */
  private generateClaudeCommands(server: ServerManifest): InstallCommand[] {
    const commands: InstallCommand[] = [];

    // Streamable HTTP transport (preferred)
    if (server.transport.streamableHttp) {
      commands.push({
        client: 'claude',
        command: this.buildClaudeHttpCommand(server),
        description: 'Claude Code with remote server (Streamable HTTP)',
        transport: 'streamableHttp',
      });
    }

    // Stdio transport (local)
    if (server.transport.stdio) {
      commands.push({
        client: 'claude',
        command: this.buildClaudeStdioCommand(server),
        description: 'Claude Code with local server (stdio)',
        transport: 'stdio',
      });
    }

    return commands;
  }

  /**
   * Generate Claude Code command for specific transport
   */
  private generateClaudeCommand(
    server: ServerManifest, 
    transport?: 'stdio' | 'streamableHttp'
  ): InstallCommand | null {
    if (transport === 'streamableHttp' && server.transport.streamableHttp) {
      return {
        client: 'claude',
        command: this.buildClaudeHttpCommand(server),
        description: 'Claude Code with remote server',
        transport: 'streamableHttp',
      };
    }
    
    if (transport === 'stdio' && server.transport.stdio) {
      return {
        client: 'claude',
        command: this.buildClaudeStdioCommand(server),
        description: 'Claude Code with local server',
        transport: 'stdio',
      };
    }

    // Default to preferred transport
    if (server.transport.streamableHttp) {
      return {
        client: 'claude',
        command: this.buildClaudeHttpCommand(server),
        description: 'Claude Code (recommended)',
        transport: 'streamableHttp',
      };
    }

    if (server.transport.stdio) {
      return {
        client: 'claude',
        command: this.buildClaudeStdioCommand(server),
        description: 'Claude Code (local)',
        transport: 'stdio',
      };
    }

    return null;
  }

  /**
   * Build Claude Code command for Streamable HTTP transport
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
   * Build Claude Code command for stdio transport
   */
  private buildClaudeStdioCommand(server: ServerManifest): string {
    if (!server.transport.stdio) {
      throw new Error('Server does not support stdio transport');
    }

    const config = server.transport.stdio;
    let command = `claude mcp add ${server.id}`;

    // Add the stdio command
    command += ` -- ${config.command}`;
    
    if (config.args) {
      command += ` ${config.args.join(' ')}`;
    }

    return command;
  }

  /**
   * Generate JSON configuration
   */
  private generateJsonCommand(server: ServerManifest): InstallCommand {
    const config: any = {
      mcpServers: {
        [server.id]: {}
      }
    };

    if (server.transport.streamableHttp) {
      config.mcpServers[server.id] = {
        serverUrl: server.transport.streamableHttp.url,
        headers: server.transport.streamableHttp.headers || {},
      };
    } else if (server.transport.stdio) {
      config.mcpServers[server.id] = {
        command: server.transport.stdio.command,
        args: server.transport.stdio.args || [],
        env: server.transport.stdio.env || {},
      };
    }

    return {
      client: 'json',
      command: JSON.stringify(config, null, 2),
      description: 'JSON configuration for direct config file usage',
      transport: server.transport.streamableHttp ? 'streamableHttp' : 'stdio',
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
    if (command.transport === 'streamableHttp' && server.transport.streamableHttp?.auth?.type !== 'none') {
      instructions += `### Authentication Setup\n\n`;
      instructions += `This server requires authentication. `;
      
      if (server.transport.streamableHttp?.auth?.type === 'bearer') {
        instructions += `Replace \`<YOUR_TOKEN>\` with your API token.\n\n`;
      } else if (server.transport.streamableHttp?.auth?.type === 'oauth2') {
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