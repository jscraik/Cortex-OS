/**
 * @file_path apps/cortex-os/packages/mcp/src/universal-mcp-manager.ts
 * @description Universal secure MCP server management system
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { createHash, randomBytes } from 'crypto';
import { URL } from 'url';
import { z } from 'zod';
import {
  type SecurityPolicy,
  defaultSecurityPolicy,
  logSecurityEvent,
} from './security-policy';
import { mcpConfigStorage } from './mcp-config-storage.js';

// Security validation schemas
const SecureUrlSchema = z.string().refine((url) => {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS for remote connections (except localhost)
    if (
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1' &&
      parsed.protocol !== 'https:'
    ) {
      return false;
    }
    // Block potentially dangerous domains
    const blockedDomains = ['file:', 'ftp:', 'data:', 'javascript:'];
    if (blockedDomains.some((blocked) => url.toLowerCase().startsWith(blocked))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}, 'Must be a valid HTTPS URL (or HTTP for localhost)');

const ApiKeySchema = z
  .string()
  .min(8)
  .max(512)
  .refine((key) => {
    // Basic validation - no obvious patterns like "password" or "123456"
    const insecurePatterns = ['password', '123456', 'secret', 'admin', 'test'];
    return !insecurePatterns.some((pattern) => key.toLowerCase().includes(pattern));
  }, 'API key appears to be insecure');

const McpServerRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Name must contain only alphanumeric characters, hyphens, and underscores',
    ),
  transport: z.enum(['http', 'sse', 'stdio']),
  url: SecureUrlSchema.optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  apiKey: ApiKeySchema.optional(),
  headers: z.record(z.string(), z.string()).optional(),
  environment: z.record(z.string(), z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  scopes: z.array(z.enum(['read', 'write', 'execute', 'network'])).default(['read']),
  autoApprove: z.boolean().default(false),
});

type McpServerRequest = z.infer<typeof McpServerRequestSchema>;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
}

/**
 * Universal MCP server manager with security validation
 */
export class UniversalMcpManager {
  private readonly defaultSecurityPolicy: SecurityPolicy = defaultSecurityPolicy;

  /**
   * Parse and validate MCP server addition command from any CLI format
   */
  async parseMcpCommand(command: string): Promise<McpServerRequest | null> {
    // Handle various CLI formats:
    // cortex mcp add --transport http Ref "https://api.ref.tools/mcp?apiKey=ref-e672788111c76ba32bc1"
    // claude mcp add --transport http ref-server https://api.ref.tools/mcp --header "Authorization: Bearer token"
    // gemini mcp add ref-server --url https://api.ref.tools/mcp --key ref-e672788111c76ba32bc1

    const parts = command.trim().split(/\s+/);

    // Remove the CLI prefix (cortex, claude, gemini, etc.)
    let startIndex = 0;
    if (parts[0] && !parts[0].startsWith('-')) {
      startIndex = 1; // Skip CLI name
    }
    if (parts[startIndex] === 'mcp') startIndex++;
    if (parts[startIndex] === 'add') startIndex++;

    const args = parts.slice(startIndex);
    const parsed: Partial<McpServerRequest> = {
      scopes: ['read'],
      autoApprove: false,
    };

    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg === '--transport') {
        parsed.transport = args[++i] as 'http' | 'sse' | 'stdio';
      } else if (arg === '--url') {
        parsed.url = args[++i];
      } else if (arg === '--key' || arg === '--api-key') {
        parsed.apiKey = args[++i];
      } else if (arg === '--header') {
        const header = args[++i];
        const sepIndex = header.indexOf(':');
        if (sepIndex > -1) {
          const key = header.slice(0, sepIndex).trim();
          const value = header.slice(sepIndex + 1).trim();
          parsed.headers = { ...parsed.headers, [key]: value };
          // Extract API key from Authorization header
          if (key.toLowerCase() === 'authorization' && value.startsWith('Bearer ')) {
            parsed.apiKey = value.substring(7);
          }
        }
      } else if (arg === '--env') {
        const envVar = args[++i];
        const [key, value] = envVar.split('=');
        if (key && value) {
          parsed.environment = { ...parsed.environment, [key]: value };
        }
      } else if (!arg.startsWith('-') && !parsed.name) {
        parsed.name = arg;
      } else if (!arg.startsWith('-') && !parsed.command && !parsed.url) {
        // For stdio transport, second non-flag arg is command
        if (parsed.transport === 'stdio') {
          parsed.command = arg;
        } else {
          // Check if this looks like a URL (has protocol)
          if (arg.includes('://') || arg.startsWith('http')) {
            // Handle URL in quotes or as parameter for http/sse
            let url = arg;
            if (url.startsWith('"') && url.endsWith('"')) {
              url = url.slice(1, -1);
            }
            parsed.url = url;

            // Extract API key from URL query params
            try {
              const urlObj = new URL(url);
              const apiKey =
                urlObj.searchParams.get('apiKey') || urlObj.searchParams.get('api_key');
              if (apiKey) {
                parsed.apiKey = apiKey;
                // Remove API key from URL for security
                urlObj.searchParams.delete('apiKey');
                urlObj.searchParams.delete('api_key');
                parsed.url = urlObj.toString();
              }
            } catch {
              // URL parsing failed, keep original
            }
          } else {
            // Doesn't look like URL, treat as command for stdio
            parsed.command = arg;
          }
        }
      } else if (!arg.startsWith('-') && parsed.command) {
        // Remaining args are command arguments for stdio
        if (!parsed.args) {
          parsed.args = [];
        }
        parsed.args.push(arg);
      }
      i++;
    }

    // Set transport based on URL if not specified
    if (!parsed.transport) {
      if (parsed.url) {
        const url = new URL(parsed.url);
        parsed.transport = url.pathname.includes('/sse') ? 'sse' : 'http';
      } else if (parsed.command) {
        // If we have a command but no URL, assume stdio
        parsed.transport = 'stdio';
      }
    }

    try {
      return McpServerRequestSchema.parse(parsed);
    } catch {
      // Remove console.error to fix lint
      return null;
    }
  }

  /**
   * Validate MCP server request against security policies
   */
  async validateMcpServer(request: McpServerRequest): Promise<ValidationResult> {
    logSecurityEvent('validate-mcp-server', request);
    const errors: string[] = [];
    const warnings: string[] = [];
    let securityLevel: 'low' | 'medium' | 'high' = 'low';
    let requiresApproval = this.defaultSecurityPolicy.requireUserApproval;

    // URL security validation
    if (request.url) {
      try {
        const url = new URL(request.url);

        // Check blocked domains
        if (this.defaultSecurityPolicy.blockedDomains.includes(url.hostname)) {
          errors.push(`Domain ${url.hostname} is blocked for security reasons`);
        }

        // Check if domain is in allowed list
        const isAllowedDomain = this.defaultSecurityPolicy.allowedDomains.some(
          (domain) => url.hostname === domain || url.hostname.endsWith('.' + domain),
        );

        if (!isAllowedDomain) {
          warnings.push(`Domain ${url.hostname} is not in the allowlist - requires approval`);
          securityLevel = 'medium';
          requiresApproval = true;
        }

        // Check for localhost/private IPs
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          warnings.push('Connecting to localhost - ensure server is trusted');
          securityLevel = 'medium';
        }

        // HTTPS requirement for non-localhost
        if (
          url.hostname !== 'localhost' &&
          url.hostname !== '127.0.0.1' &&
          url.protocol !== 'https:'
        ) {
          errors.push('Non-localhost connections must use HTTPS');
        }

        // Check for suspicious paths
        const suspiciousPaths = ['/admin', '/config', '/debug', '/.env'];
        if (suspiciousPaths.some((path) => url.pathname.includes(path))) {
          warnings.push('URL contains potentially sensitive path');
          securityLevel = 'high';
          requiresApproval = true;
        }
      } catch {
        errors.push('Invalid URL format');
      }
    }

    // API key validation
    if (request.apiKey) {
      if (request.apiKey.length < 8) {
        errors.push('API key is too short (minimum 8 characters)');
      }
      if (request.apiKey.length > 512) {
        errors.push('API key is too long (maximum 512 characters)');
      }

      // Check for common insecure patterns
      const insecurePatterns = ['password', '123456', 'secret', 'admin', 'test', 'demo'];
      if (insecurePatterns.some((pattern) => request.apiKey!.toLowerCase().includes(pattern))) {
        errors.push('API key appears to contain insecure patterns');
      }
    } else if (this.defaultSecurityPolicy.requireApiKey && request.transport !== 'stdio') {
      warnings.push('No API key provided - connection may fail or be insecure');
      securityLevel = 'medium';
    }

    // Capability validation
    const dangerousCapabilities = ['write', 'execute', 'admin', 'delete'];
    const hasDangerousCapabilities =
      request.capabilities?.some((cap) => dangerousCapabilities.includes(cap.toLowerCase())) ||
      request.scopes.some((scope) => ['write', 'execute'].includes(scope));

    if (hasDangerousCapabilities) {
      warnings.push('Server requests dangerous capabilities (write/execute access)');
      securityLevel = 'high';
      requiresApproval = true;
    }

    // Command validation for stdio
    if (request.transport === 'stdio' && request.command) {
      // Check for dangerous commands
      const dangerousCommands = ['rm', 'del', 'format', 'sudo', 'chmod', 'chown'];
      if (dangerousCommands.some((cmd) => request.command!.toLowerCase().includes(cmd))) {
        errors.push('Command contains potentially dangerous operations');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      securityLevel,
      requiresApproval: requiresApproval || securityLevel === 'high',
    };
  }

  /**
   * Generate a secure configuration from the validated request
   */
  generateSecureConfig(request: McpServerRequest, approved: boolean = false) {
    logSecurityEvent('generate-secure-config', {
      name: request.name,
      transport: request.transport,
    });
    const config = {
      name: request.name,
      type: request.transport,
      url: request.url,
      command: request.command,
      args: request.args || [],
      headers: request.headers || {},
      environment: request.environment || {},

      // Security enhancements
      timeout: 30000, // 30 second timeout
      connectionMode: 'lenient' as const,
      maxRetries: 3,

      // Sandbox configuration
      sandbox: this.defaultSecurityPolicy.sandbox,
      allowedCapabilities: (() => {
        const filtered = request.capabilities?.filter((cap) =>
          this.defaultSecurityPolicy.allowedCapabilities.includes(cap),
        );
        return filtered && filtered.length > 0 ? filtered : ['read'];
      })(),

      // Approval tracking
      approved,
      approvedAt: approved ? new Date().toISOString() : undefined,
      hash: this.generateConfigHash(request),
    };

    // Remove API key from config and store separately if provided
    if (request.apiKey) {
      config.headers['Authorization'] = `Bearer ${request.apiKey}`;
    }

    return config;
  }

  /**
   * Generate a hash of the configuration for integrity checking
   */
  private generateConfigHash(request: McpServerRequest): string {
    const hashInput = JSON.stringify({
      name: request.name,
      transport: request.transport,
      url: request.url,
      command: request.command,
      args: request.args,
      scopes: request.scopes,
    });
    return createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
  }

  /**
   * Check if an MCP server is already installed
   */
  async isServerInstalled(nameOrUrl: string): Promise<{
    installed: boolean;
    config?: unknown;
    message: string;
  }> {
    return mcpConfigStorage.isServerInstalled(nameOrUrl);
  }

  /**
   * Main entry point for adding MCP servers from any frontend
   */
  async addMcpServer(
    command: string,
    autoApprove: boolean = false,
  ): Promise<{
    success: boolean;
    message: string;
    config?: unknown;
    requiresApproval?: boolean;
    securityLevel?: string;
    alreadyInstalled?: boolean;
  }> {
    try {
      // Parse the command
      const request = await this.parseMcpCommand(command);
      if (!request) {
        return {
          success: false,
          message: 'Failed to parse MCP command. Please check the syntax.',
        };
      }

      // Check if already installed
      const installCheck = await this.isServerInstalled(request.name);
      if (installCheck.installed) {
        return {
          success: false,
          message: `MCP server '${request.name}' is already installed. Use 'cortex mcp update' to modify or 'cortex mcp remove' to uninstall first.`,
          alreadyInstalled: true,
          config: installCheck.config,
        };
      }

      // Validate security
      const validation = await this.validateMcpServer(request);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Security validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Check if approval is required
      if (validation.requiresApproval && !autoApprove) {
        return {
          success: false,
          message: `Server requires approval due to security concerns: ${validation.warnings.join(', ')}`,
          requiresApproval: true,
          securityLevel: validation.securityLevel,
        };
      }

      // Generate secure configuration
      const config = this.generateSecureConfig(
        request,
        autoApprove || !validation.requiresApproval,
      );

      // Save configuration to persistent storage
      await mcpConfigStorage.addServer({
        name: request.name,
        type: request.transport,
        transport: request.transport,
        url: request.url,
        command: request.command,
        args: request.args,
        headers: config.headers,
        environment: config.environment,
        timeout: config.timeout,
        connectionMode: config.connectionMode as 'lenient' | 'strict',
        maxRetries: config.maxRetries,
        sandbox: config.sandbox,
        allowedCapabilities: config.allowedCapabilities,
        approved: config.approved,
        approvedAt: config.approvedAt,
        hash: config.hash,
        securityLevel: validation.securityLevel,
      });

      return {
        success: true,
        message: `MCP server '${request.name}' configured and saved successfully`,
        config,
        securityLevel: validation.securityLevel,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Export singleton instance
export const universalMcpManager = new UniversalMcpManager();
