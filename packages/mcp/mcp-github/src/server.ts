#!/usr/bin/env node
/**
 * GitHub MCP Server for Cortex-OS
 *
 * Exposes GitHub operations as MCP (Model Context Protocol) tools
 * Integrates with A2A event bus for real-time updates
 *
 * Usage:
 *   cortex-mcp-github
 *   cortex-mcp-github --config /path/to/config.json
 *   cortex-mcp-github --repo owner/repo --token $GITHUB_TOKEN
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { GitHubAuth } from './auth/github-auth.js';
import { CONFIG_SCHEMA, type GitHubMCPConfig } from './config/schema.js';
import { A2AEventBridge } from './events/a2a-bridge.js';
import { GitHubMCPServer } from './github-mcp-server.js';
import { Logger } from './utils/logger.js';

// Command line argument parsing
const args = process.argv.slice(2);
const configPath = args.includes('--config')
  ? args[args.indexOf('--config') + 1]
  : process.env.CORTEX_GITHUB_MCP_CONFIG;

const repoArg = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : undefined;

const tokenArg = args.includes('--token') ? args[args.indexOf('--token') + 1] : undefined;

// Configuration loading
function loadConfig(): GitHubMCPConfig {
  let config: Partial<GitHubMCPConfig> = {};

  // Load from file if specified
  if (configPath) {
    try {
      const configFile = readFileSync(configPath, 'utf-8');
      config = JSON.parse(configFile);
    } catch (error) {
      Logger.warn(`Failed to load config from ${configPath}:`, error);
    }
  }

  // Override with environment variables
  const envConfig: Partial<GitHubMCPConfig> = {
    auth: {
      method: (process.env.CORTEX_GITHUB_AUTH_METHOD as any) || 'token',
      token: process.env.GITHUB_TOKEN || process.env.CORTEX_GITHUB_TOKEN,
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
      installationId: process.env.GITHUB_APP_INSTALLATION_ID,
    },
    defaultRepository: repoArg || process.env.CORTEX_GITHUB_REPO,
    server: {
      name: process.env.CORTEX_GITHUB_MCP_NAME || 'cortex-github',
      version: process.env.CORTEX_GITHUB_MCP_VERSION || '1.0.0',
      description: 'GitHub MCP Server for Cortex-OS',
    },
    features: {
      realTimeEvents: process.env.CORTEX_GITHUB_REAL_TIME !== 'false',
      webhookSupport: process.env.CORTEX_GITHUB_WEBHOOKS === 'true',
      rateLimitingEnabled: process.env.CORTEX_GITHUB_RATE_LIMIT !== 'false',
      caching: process.env.CORTEX_GITHUB_CACHE !== 'false',
    },
    a2a: {
      enabled: process.env.CORTEX_A2A_ENABLED !== 'false',
      eventBusUrl: process.env.CORTEX_A2A_EVENT_BUS_URL,
      publisherId: process.env.CORTEX_A2A_PUBLISHER_ID || 'github-mcp-server',
    },
    rateLimits: {
      requestsPerHour: parseInt(process.env.CORTEX_GITHUB_RATE_LIMIT_HOUR || '5000'),
      requestsPerMinute: parseInt(process.env.CORTEX_GITHUB_RATE_LIMIT_MIN || '100'),
      burstLimit: parseInt(process.env.CORTEX_GITHUB_RATE_BURST || '10'),
    },
  };

  // Merge configurations
  const mergedConfig = { ...config, ...envConfig };

  // Override with command line arguments
  if (tokenArg) {
    mergedConfig.auth = { method: 'token', token: tokenArg };
  }

  // Validate configuration
  try {
    return CONFIG_SCHEMA.parse(mergedConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      Logger.error('Configuration validation failed:');
      error.errors.forEach((err) => {
        Logger.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

async function main() {
  try {
    // Load and validate configuration
    const config = loadConfig();
    Logger.info('GitHub MCP Server starting...', {
      version: config.server.version,
      repository: config.defaultRepository,
      authMethod: config.auth.method,
    });

    // Initialize authentication
    const auth = new GitHubAuth(config.auth);
    await auth.initialize();

    // Initialize A2A event bridge if enabled
    let eventBridge: A2AEventBridge | undefined;
    if (config.a2a.enabled) {
      eventBridge = new A2AEventBridge(config.a2a);
      await eventBridge.connect();
    }

    // Initialize GitHub MCP server
    const githubServer = new GitHubMCPServer(config, auth, eventBridge);
    await githubServer.initialize();

    // Create MCP server
    const server = new Server(
      {
        name: config.server.name,
        version: config.server.version,
        description: config.server.description,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );

    // Register tool handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: await githubServer.listTools(),
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await githubServer.callTool(name, args);
    });

    // Handle graceful shutdown
    const cleanup = async () => {
      Logger.info('Shutting down GitHub MCP Server...');

      if (eventBridge) {
        await eventBridge.disconnect();
      }

      await githubServer.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    Logger.info('GitHub MCP Server running', {
      tools: (await githubServer.listTools()).length,
      repository: config.defaultRepository,
      a2aEnabled: config.a2a.enabled,
    });
  } catch (error) {
    Logger.error('Failed to start GitHub MCP Server:', error);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  });
}
