/**
 * @file MCP Registry - Schema validation and manifest utilities
 * @description Provides validation, signing, and management for MCP server registry
 */

export * from './types.js';
export * from './validator.js';

// Re-export schemas for external use
export { default as registrySchema } from '../schemas/registry.schema.json' with { type: 'json' };
export { default as serverManifestSchema } from '../schemas/server-manifest.schema.json' with { type: 'json' };
