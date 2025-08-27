/**
 * @file MCP Marketplace Types
 * @description Core types for MCP marketplace following official SDK patterns
 */

import { z } from 'zod';

// MCP Protocol version support
export const MCP_VERSION = '2025-06-18';
export const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

/**
 * Transport types (Streamable HTTP is now primary, stdio for local)
 */
export const TransportConfigSchema = z.object({
  stdio: z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
  }).optional(),
  streamableHttp: z.object({
    url: z.string().url().refine(url => url.startsWith('https://'), {
      message: 'Remote MCP servers must use HTTPS',
    }),
    headers: z.record(z.string()).optional(),
    auth: z.object({
      type: z.enum(['none', 'bearer', 'oauth2']),
      clientId: z.string().optional(),
      scopes: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
}).refine(config => config.stdio || config.streamableHttp, {
  message: 'At least one transport must be configured',
});

/**
 * MCP Server capabilities
 */
export const CapabilitiesSchema = z.object({
  tools: z.boolean().default(false),
  resources: z.boolean().default(false), 
  prompts: z.boolean().default(false),
  logging: z.boolean().default(false),
  roots: z.boolean().default(false),
});

/**
 * Server manifest for marketplace
 */
export const ServerManifestSchema = z.object({
  // Basic metadata
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/).min(1).max(63),
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+/).optional(),
  description: z.string().min(10).max(500),
  
  // MCP metadata
  mcpVersion: z.string().default(MCP_VERSION),
  capabilities: CapabilitiesSchema,
  
  // Publisher info
  publisher: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    verified: z.boolean().default(false),
  }),
  
  // Repository and docs
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  license: z.enum(['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', 'Proprietary']),
  
  // Categorization
  category: z.enum([
    'development', 'productivity', 'data', 'communication', 
    'finance', 'media', 'security', 'ai-ml', 'integration', 'utility'
  ]),
  tags: z.array(z.string()).max(10).optional(),
  
  // Transport configuration
  transport: TransportConfigSchema,
  
  // Client installation commands
  install: z.object({
    claude: z.string(),        // claude mcp add ...
    json: z.record(z.any()),   // Direct JSON config
    cline: z.string().optional(),
    cursor: z.string().optional(),
    continue: z.string().optional(),
  }),
  
  // Security
  permissions: z.array(z.string()),
  security: z.object({
    riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
    sigstore: z.string().url().optional(),
    sbom: z.string().url().optional(),
  }),
  
  // Marketplace metadata
  featured: z.boolean().default(false),
  downloads: z.number().int().min(0).default(0),
  rating: z.number().min(0).max(5).optional(),
  updatedAt: z.string().datetime(),
});

export type ServerManifest = z.infer<typeof ServerManifestSchema>;
export type TransportConfig = z.infer<typeof TransportConfigSchema>;
export type Capabilities = z.infer<typeof CapabilitiesSchema>;

/**
 * Marketplace registry index
 */
export const RegistryIndexSchema = z.object({
  version: z.string().regex(/^2025-\d{2}-\d{2}$/),
  mcpVersion: z.string().default(MCP_VERSION),
  updatedAt: z.string().datetime(),
  serverCount: z.number().int().min(0),
  servers: z.array(ServerManifestSchema),
  categories: z.record(z.object({
    name: z.string(),
    description: z.string(),
    count: z.number().int().min(0),
  })),
  featured: z.array(z.string()),
  signing: z.object({
    publicKey: z.string(),
    algorithm: z.enum(['Ed25519']).default('Ed25519'),
  }),
});

export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;

/**
 * Search and filtering
 */
export const SearchRequestSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  capabilities: z.array(z.enum(['tools', 'resources', 'prompts'])).optional(),
  verified: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * Installation command generation
 */
export type ClientType = 'claude' | 'cline' | 'cursor' | 'continue' | 'json';

export interface InstallCommand {
  client: ClientType;
  command: string;
  description: string;
  transport: 'stdio' | 'streamableHttp';
}

/**
 * API responses
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    total?: number;
    offset?: number;
    limit?: number;
  };
}

/**
 * Server health status
 */
export interface ServerHealth {
  serverId: string;
  status: 'online' | 'offline' | 'degraded';
  lastCheck: string;
  responseTime?: number;
  capabilities?: Capabilities;
  error?: string;
}