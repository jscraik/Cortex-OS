/**
 * Type definitions for MCP Server
 *
 * Central export point for all type definitions
 * including MCP 2025-06-18 protocol types and Ollama integration.
 */

/**
 * Re-export commonly used types for convenience
 */
export type {
	BlobResourceContent,
	OllamaChatRequest,
	OllamaChatResponse,
	OllamaConfig,
	// Ollama types
	OllamaMessage,
	OllamaStallConfig,
	OllamaStreamEvent,
	OllamaStreamGenerator,
	OllamaTool,
	OllamaToolCall,
	// MCP 2025-06-18 types
	PromptDefinition,
	PromptHandlerResult,
	ResourceContent,
	ResourceDefinition,
	ResourceProvider,
	StructuredContent,
	TextResourceContent,
} from './mcp-2025.js';
export * from './mcp-2025.js';
export type {
	OllamaChunk,
	OllamaMessageRole,
} from './ollama.js';
export * from './ollama.js';
