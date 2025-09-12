/**
 * LEGACY: Deprecated marketplace command implementation retained temporarily for reference.
 * Not invoked by the CLI runtime. Scheduled for removal after parity confirmation.
 * Kept lint-clean with minimal targeted disables.
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
// Intentionally simplified; methods throw to guide users to new commands.
export class McpMarketplaceCommand {
	initialize(): void { /* legacy no-op */ }
	search(): never { throw new Error('Deprecated command: use "cortex mcp search"'); }
	show(): never { throw new Error('Deprecated command: use "cortex mcp show"'); }
	add(): never { throw new Error('Deprecated command: use "cortex mcp add"'); }
	remove(): never { throw new Error('Deprecated command: use "cortex mcp remove"'); }
	list(): never { throw new Error('Deprecated command: use "cortex mcp list"'); }
	bridge(): never { throw new Error('Deprecated command: use "cortex mcp bridge"'); }
}

// No default export to encourage named import if ever referenced again.
