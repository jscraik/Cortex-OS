/**
 * @file MCP Registry - Schema validation and manifest utilities
 * @description Provides validation, signing, and management for MCP server registry
 */

export * from './validator.js';
export * from './types.js';

// Re-export schemas for external use
export { default as registrySchema } from '../schemas/registry.schema.json' assert { type: 'json' };
export { default as serverManifestSchema } from '../schemas/server-manifest.schema.json' assert { type: 'json' };
