/**
 * @fileoverview Main entry point for the Cortex OS MCP package
 *
 * This package provides Model Context Protocol (MCP) functionality for Cortex OS,
 * including server components, connectors, and capabilities.
 */

export * from './capabilities/prompts.js';
export * from './capabilities/resources.js';
// Export capabilities (if they have exports)
export * from './capabilities/tools.js';
// Export connectors
export * from './connectors/index.js';
// Export errors
export * from './errors.js';
// Export main server functionality
export * from './server.js';
