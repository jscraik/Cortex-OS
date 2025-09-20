// Core system tools
export * from './bash-tool.js';
export * from './echo-tool.js';
export * from './edit-tool.js';
// File discovery and search tools
export * from './glob-tool.js';
export * from './grep-tool.js';
export * from './multiedit-tool.js';
export * from './notebook-edit-tool.js';
// Notebook tools
export * from './notebook-read-tool.js';
// File operation tools
export * from './read-tool.js';
// Task management tools
export * from './task-tool.js';
export * from './todo-write-tool.js';
// Web access tools
export * from './web-fetch-tool.js';
export * from './web-search-tool.js';
export * from './write-tool.js';

// Tool registry utilities
import { type McpTool, ToolRegistry } from '../tools.js';
import { bashTool } from './bash-tool.js';
import { echoTool } from './echo-tool.js';
import { editTool } from './edit-tool.js';
import { globTool } from './glob-tool.js';
import { grepTool } from './grep-tool.js';
import { multiEditTool } from './multiedit-tool.js';
import { notebookEditTool } from './notebook-edit-tool.js';
import { notebookReadTool } from './notebook-read-tool.js';
import { readTool } from './read-tool.js';
import { taskTool } from './task-tool.js';
import { todoWriteTool } from './todo-write-tool.js';
import { webFetchTool } from './web-fetch-tool.js';
import { webSearchTool } from './web-search-tool.js';
import { writeTool } from './write-tool.js';

/**
 * All available MCP tools organized by category
 */
export const toolCategories = {
	system: {
		bash: bashTool,
		echo: echoTool,
	},
	files: {
		read: readTool,
		write: writeTool,
		edit: editTool,
		multiEdit: multiEditTool,
	},
	search: {
		glob: globTool,
		grep: grepTool,
	},
	notebook: {
		notebookRead: notebookReadTool,
		notebookEdit: notebookEditTool,
	},
	web: {
		webFetch: webFetchTool,
		webSearch: webSearchTool,
	},
	tasks: {
		task: taskTool,
		todoWrite: todoWriteTool,
	},
} as const;

/**
 * All available MCP tools as a flat array
 */
export const allTools: ReadonlyArray<McpTool<any, any>> = [
	// System tools
	bashTool,
	echoTool,

	// File operation tools
	readTool,
	writeTool,
	editTool,
	multiEditTool,

	// File discovery and search tools
	globTool,
	grepTool,

	// Notebook tools
	notebookReadTool,
	notebookEditTool,

	// Web access tools
	webFetchTool,
	webSearchTool,

	// Task management tools
	taskTool,
	todoWriteTool,
];

/**
 * Tools that require permissions (marked as "Yes" in the original request)
 */
export const permissionRequiredTools: ReadonlyArray<McpTool<any, any>> = [
	bashTool, // Shell execution
	writeTool, // File creation/overwriting
	editTool, // File modification
	multiEditTool, // Multi-file modification
	notebookEditTool, // Notebook modification
	webFetchTool, // HTTP requests
	webSearchTool, // Web access
];

/**
 * Tools that don't require permissions (marked as "No" in the original request)
 */
export const noPermissionTools: ReadonlyArray<McpTool<any, any>> = [
	readTool, // File reading
	globTool, // Pattern matching
	grepTool, // Content search
	notebookReadTool, // Notebook reading
	taskTool, // Sub-agent tasks
	todoWriteTool, // Task list management
	echoTool, // Echo utility
];

/**
 * Create a new tool registry with all tools registered
 */
export function createToolRegistry(): ToolRegistry {
	const registry = new ToolRegistry();

	for (const tool of allTools) {
		registry.register(tool as McpTool<unknown, unknown>);
	}

	return registry;
}

/**
 * Create a tool registry with only permission-free tools
 */
export function createRestrictedToolRegistry(): ToolRegistry {
	const registry = new ToolRegistry();

	for (const tool of noPermissionTools) {
		registry.register(tool as McpTool<unknown, unknown>);
	}

	return registry;
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: keyof typeof toolCategories) {
	return Object.values(toolCategories[category]);
}

/**
 * Get tool by name
 */
export function getToolByName(name: string) {
	return allTools.find((tool) => tool.name === name);
}
