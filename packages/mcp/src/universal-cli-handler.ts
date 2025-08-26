/**
 * @file_path apps/cortex-os/packages/mcp/src/universal-cli-handler.ts
 * @description Universal CLI handler for secure MCP server management
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { mcpConfigStorage } from './mcp-config-storage.js';
import { universalMcpManager } from './universal-mcp-manager.js';

interface CliResponse {
  success: boolean;
  message: string;
  data?: unknown;
  requiresConfirmation?: boolean;
  securityLevel?: string;
}

/**
 * Universal CLI handler that can process MCP commands from any frontend
 * Provides consistent security validation and user approval flows
 */
export class UniversalCliHandler {
  /**
   * Process an MCP command from any CLI frontend
   * Supports: cortex-cli, claude, gemini, vs-code, github copilot, etc.
   */
  async processMcpCommand(
    rawCommand: string,
    options: {
      frontend?: string;
      autoApprove?: boolean;
      interactive?: boolean;
    } = {},
  ): Promise<CliResponse> {
    const { frontend = 'unknown', autoApprove = false, interactive = true } = options;

    // Normalize the command
    const normalizedCommand = this.normalizeCommand(rawCommand, frontend);

    try {
      // Parse and validate through universal manager
      const result = await universalMcpManager.addMcpServer(normalizedCommand, autoApprove);

      if (!result.success) {
        // Handle already installed case
        if (result.alreadyInstalled) {
          return {
            success: false,
            message: `🔍 ${result.message}

📋 Installation Status: ALREADY INSTALLED
${this.getFrontendInstructions(frontend)}

💡 Available actions:
• 'cortex mcp update ${result.config && typeof result.config === 'object' && 'name' in result.config ? (result.config as { name: string }).name : 'server-name'}' - Update server configuration
• 'cortex mcp remove ${result.config && typeof result.config === 'object' && 'name' in result.config ? (result.config as { name: string }).name : 'server-name'}' - Uninstall server
• 'cortex mcp status ${result.config && typeof result.config === 'object' && 'name' in result.config ? (result.config as { name: string }).name : 'server-name'}' - Check server health`,
            data: result.config,
          };
        }

        // If approval is required and we're in interactive mode, provide guidance
        if (result.requiresApproval && interactive) {
          return {
            success: false,
            message: this.formatApprovalMessage(result.message, result.securityLevel),
            requiresConfirmation: true,
            securityLevel: result.securityLevel,
          };
        }

        return {
          success: false,
          message: result.message,
        };
      }

      return {
        success: true,
        message: this.formatSuccessMessage(result.message, frontend),
        data: result.config,
        securityLevel: result.securityLevel,
      };
    } catch (error) {
      return {
        success: false,
        message: `CLI Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Normalize commands from different CLI frontends to a standard format
   */
  private normalizeCommand(rawCommand: string, frontend: string): string {
    let normalized = rawCommand.trim();

    // Handle different CLI patterns
    switch (frontend) {
      case 'claude':
        // claude mcp add --transport http server-name url
        break;
      case 'gemini':
        // gemini mcp add server-name --url url --key apikey
        normalized = normalized.replace(/--key\s+/, '--api-key ');
        break;
      case 'vs-code':
        // Handle VS Code command palette format
        if (!normalized.includes('mcp add')) {
          normalized = `mcp add ${normalized}`;
        }
        break;
      case 'github-copilot':
        // Handle @workspace commands
        normalized = normalized.replace(/^@workspace\s+/, '');
        break;
      case 'cortex-cli':
        // Already in expected format
        break;
      default:
        // Auto-detect format and normalize
        if (!normalized.includes('mcp')) {
          normalized = `mcp add ${normalized}`;
        }
    }

    return normalized;
  }

  /**
   * Format approval message with security guidance
   */
  private formatApprovalMessage(message: string, securityLevel?: string): string {
    const levelInfo = this.getSecurityLevelInfo(securityLevel);

    return `🔒 Security Review Required (${levelInfo.level})

${message}

${levelInfo.guidance}

To proceed with approval, run the same command with --approve flag.`;
  }

  /**
   * Format success message with frontend-specific instructions
   */
  private formatSuccessMessage(message: string, frontend: string): string {
    const instructions = this.getFrontendInstructions(frontend);

    return `✅ ${message}

${instructions}`;
  }

  /**
   * Get security level information and guidance
   */
  private getSecurityLevelInfo(level?: string): { level: string; guidance: string } {
    switch (level) {
      case 'high':
        return {
          level: 'HIGH RISK',
          guidance: `⚠️  This server requests dangerous capabilities or connects to untrusted domains.
• Review the server's documentation and source code
• Ensure you trust the server provider
• Consider using read-only permissions first`,
        };
      case 'medium':
        return {
          level: 'MEDIUM RISK',
          guidance: `⚡ This server has elevated permissions or connects to external services.
• Verify the server's authenticity
• Review what data the server can access
• Monitor server activity after connection`,
        };
      default:
        return {
          level: 'LOW RISK',
          guidance: `✅ This server appears safe but still requires approval.
• Basic security validations passed
• Limited capabilities requested`,
        };
    }
  }

  /**
   * Get frontend-specific next step instructions
   */
  private getFrontendInstructions(frontend: string): string {
    switch (frontend) {
      case 'claude':
        return `The server is now available in Claude Desktop. You can:
• Use /mcp to manage server connections
• Access server tools through the chat interface
• View server status in the MCP panel`;

      case 'vs-code':
        return `The server is configured for VS Code. Next steps:
• Restart VS Code to load the new server
• Check the MCP extension for connection status
• Access server capabilities through the command palette`;

      case 'github-copilot':
        return `The server is configured for GitHub Copilot. Next steps:
• Server tools will be available in Copilot chat
• Use @workspace to access server capabilities
• Check GitHub Copilot settings for server status`;

      case 'cortex-cli':
        return `The server is configured in Cortex OS. Next steps:
• Use 'cortex mcp list' to see all servers
• Access server tools through cortex commands
• Monitor server health with 'cortex mcp status'`;

      default:
        return `The server is configured and ready to use. Check your client's documentation for usage instructions.`;
    }
  }

  /**
   * Handle approval workflow for servers requiring confirmation
   */
  async approveServer(
    rawCommand: string,
    options: {
      frontend?: string;
      force?: boolean;
    } = {},
  ): Promise<CliResponse> {
    const { frontend = 'unknown', force = false } = options;

    if (!force) {
      return {
        success: false,
        message: 'Server approval requires explicit confirmation. Use --force flag to proceed.',
      };
    }

    // Process with auto-approval
    return this.processMcpCommand(rawCommand, {
      frontend,
      autoApprove: true,
      interactive: false,
    });
  }

  /**
   * Check if an MCP server is already installed
   */
  async checkServerInstallation(nameOrUrl: string): Promise<CliResponse> {
    try {
      const installCheck = await mcpConfigStorage.isServerInstalled(nameOrUrl);

      if (installCheck.installed) {
        return {
          success: true,
          message: `✅ MCP server '${nameOrUrl}' is installed and configured.`,
          data: installCheck.config,
        };
      } else {
        return {
          success: true,
          message: `❌ MCP server '${nameOrUrl}' is not currently installed.`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error checking installation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * List configured MCP servers with their security status
   */
  async listServers(): Promise<CliResponse> {
    try {
      const result = await mcpConfigStorage.listServers();

      if (result.servers.length === 0) {
        return {
          success: true,
          message:
            '📭 No MCP servers currently installed.\n\n💡 Add a server with: cortex mcp add [name] [command/url]',
          data: result,
        };
      }

      const serverList = result.servers
        .map((server) => {
          const status = server.disabled ? '🔇 DISABLED' : '✅ ACTIVE';
          const security =
            server.securityLevel === 'high'
              ? '🔴'
              : server.securityLevel === 'medium'
                ? '🟡'
                : '🟢';
          return `  • ${server.name} (${server.transport}) ${status} ${security}`;
        })
        .join('\n');

      const summary = `📊 Summary: ${result.metadata.total} total, ${result.metadata.active} active, ${result.metadata.disabled} disabled
🔒 Security: ${result.metadata.securitySummary.low} low, ${result.metadata.securitySummary.medium} medium, ${result.metadata.securitySummary.high} high risk`;

      return {
        success: true,
        message: `🚀 MCP Servers Installed:\n\n${serverList}\n\n${summary}`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list servers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Remove an MCP server
   */
  async removeServer(serverName: string): Promise<CliResponse> {
    if (!serverName || serverName.trim() === '') {
      return {
        success: false,
        message: 'Server name is required for removal.',
      };
    }

    try {
      // Check if server exists first
      const installCheck = await mcpConfigStorage.isServerInstalled(serverName);
      if (!installCheck.installed) {
        return {
          success: false,
          message: `❌ MCP server '${serverName}' is not installed.`,
        };
      }

      // Remove the server
      const removed = await mcpConfigStorage.removeServer(serverName);

      if (removed) {
        return {
          success: true,
          message: `✅ MCP server '${serverName}' removed successfully.`,
        };
      } else {
        return {
          success: false,
          message: `❌ Failed to remove MCP server '${serverName}'.`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error removing server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get server status and health information
   */
  async getServerStatus(serverName?: string): Promise<CliResponse> {
    try {
      if (serverName) {
        // Get status for specific server
        const server = await mcpConfigStorage.getServerStatus(serverName);

        if (!server) {
          return {
            success: false,
            message: `❌ MCP server '${serverName}' not found.`,
          };
        }

        const status = server.disabled ? '🔇 DISABLED' : '✅ ACTIVE';
        const security =
          server.securityLevel === 'high'
            ? '🔴 HIGH RISK'
            : server.securityLevel === 'medium'
              ? '🟡 MEDIUM RISK'
              : '🟢 LOW RISK';

        const details = `📋 Server Details:
• Name: ${server.name}
• Transport: ${server.transport}
• Status: ${status}
• Security Level: ${security}
• Installed: ${server.installedAt ? new Date(server.installedAt).toLocaleDateString() : 'Unknown'}
• Hash: ${server.hash || 'N/A'}`;

        return {
          success: true,
          message: details,
          data: server,
        };
      } else {
        // Get status for all servers
        return this.listServers(); // Reuse the list functionality
      }
    } catch (error) {
      return {
        success: false,
        message: `Error getting server status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const universalCliHandler = new UniversalCliHandler();
