/**
 * @file_path packages/mcp/src/types.ts
 * @description Type definitions for MCP plugin marketplace system
 * @maintainer @jamiescottcraik
 * @last_updated 2025-01-12
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { z } from 'zod';

// Plugin metadata schema
export const PluginMetadataSchema = z.object({
  name: z.string().min(1),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().default('MIT'),
  keywords: z.array(z.string()).default([]),
  category: z.enum([
    'development-tools',
    'ai-model-integrations',
    'project-management',
    'communication',
    'security-tools',
    'utilities',
  ]),
  dependencies: z.array(z.string()).default([]),
  cortexOsVersion: z.string(),
  mcpVersion: z.string().default('1.0.0'),
  capabilities: z.array(z.string()),
  permissions: z.array(z.string()).default([]),
  entrypoint: z.string(),
  signature: z.string().optional(),
  downloadUrl: z.string().url(),
  installSize: z.number().optional(),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  verified: z.boolean().default(false),
  // Extended properties for marketplace
  maintainerVerified: z.boolean().default(false).optional(),
  rating: z.number().min(0).max(5).default(0).optional(),
  downloads: z.number().min(0).default(0).optional(),
  documentation: z
    .object({
      readme: z.string().url().optional(),
      api: z.string().url().optional(),
      examples: z.string().url().optional(),
    })
    .optional(),
});

export type PluginMetadata = z.infer<typeof PluginMetadataSchema>;

// Plugin installation status
export const PluginStatusSchema = z.object({
  name: z.string(),
  version: z.string(),
  status: z.enum(['installed', 'installing', 'failed', 'updating']),
  installedAt: z.string().datetime(),
  path: z.string(),
  enabled: z.boolean().default(true),
  errors: z.array(z.string()).default([]),
});

export type PluginStatus = z.infer<typeof PluginStatusSchema>;

// Marketplace index structure
export const MarketplaceIndexSchema = z.object({
  version: z.string(),
  plugins: z.array(PluginMetadataSchema),
  categories: z.array(z.string()),
  lastUpdated: z.string().datetime(),
});

export type MarketplaceIndex = z.infer<typeof MarketplaceIndexSchema>;

// Plugin search/filter options
export const PluginSearchOptionsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  verified: z.boolean().optional(),
  maintainerVerified: z.boolean().optional(),
  minRating: z.number().min(0).max(5).optional(),
  minDownloads: z.number().min(0).optional(),
  limit: z.number().default(20),
  offset: z.number().default(0),
  sortBy: z.enum(['name', 'rating', 'downloads', 'updated']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PluginSearchOptions = z.infer<typeof PluginSearchOptionsSchema>;

// Plugin installation options
export const PluginInstallOptionsSchema = z.object({
  force: z.boolean().default(false),
  skipDependencies: z.boolean().default(false),
  version: z.string().optional(),
});

export type PluginInstallOptions = z.infer<typeof PluginInstallOptionsSchema>;

// Plugin validation result
export const PluginValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  securityScore: z.number().min(0).max(100),
  details: z.record(z.string(), z.any()).optional(),
});

export type PluginValidationResult = z.infer<typeof PluginValidationResultSchema>;

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
