// @ts-nocheck
/* eslint-disable */
/**
 * LEGACY: Deprecated marketplace command implementation retained temporarily for reference.
 * Not used by the CLI. Scheduled for removal after parity is confirmed.
 */
/**
 * @file MCP Marketplace Commands Implementation
 * @description Command implementations for MCP marketplace integration (TDD)
 */

// Deliberately avoid importing deprecated marketplace package; keep file self-contained and inert

/**
 * Marketplace command options
 */
// Option interfaces removed from legacy stub to avoid unused lint errors.

/**
 * Deprecated legacy marketplace command. Replaced by dedicated commands:
 * add/search/get/show/bridge. This stub remains temporarily for compatibility.
 */
export class McpMarketplaceCommand {
  async initialize(): Promise<void> {
    // no-op (legacy)
    return;
  }
  async search(): Promise<void> {
    throw new Error('Deprecated command: use "cortex mcp search"');
  }
  async show(): Promise<void> {
    throw new Error('Deprecated command: use "cortex mcp show"');
  }
  async add(): Promise<void> {
    throw new Error('Deprecated command: use "cortex mcp add"');
  }
  async remove(): Promise<void> {
    throw new Error('Deprecated command: use "cortex mcp remove"');
  }
  async list(): Promise<void> {
    throw new Error('Deprecated command: use "cortex mcp list"');
  }
  async bridge(): Promise<void> {
    throw new Error('Deprecated command: use "cortex mcp bridge"');
  }
}

export default McpMarketplaceCommand;
