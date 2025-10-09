/**
 * MCP 2025-06-18 Protocol Types
 *
 * Type definitions for the MCP 2025-06-18 specification
 * including Prompts, Resources, and structured content support.
 */

import { z } from 'zod';

/**
 * Prompt argument schema for validation
 */
export const PromptArgumentSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	required: z.boolean().default(false),
});

/**
 * Complete prompt definition
 */
export const PromptDefinitionSchema = z.object({
	name: z.string(),
	description: z.string(),
	arguments: z.array(PromptArgumentSchema).optional(),
});

/**
 * Structured content output format
 */
export const StructuredContentSchema = z.object({
	type: z.literal('structured'),
	data: z.any(),
	metadata: z.record(z.any()).optional(),
});

/**
 * Resource URI template definition
 */
export const ResourceDefinitionSchema = z.object({
	uriTemplate: z.string(),
	name: z.string(),
	description: z.string(),
	mimeType: z.string(),
});

/**
 * Resource content types
 */
export const TextResourceContentSchema = z.object({
	uri: z.string(),
	mimeType: z.literal('text/plain'),
	text: z.string(),
});

export const BlobResourceContentSchema = z.object({
	uri: z.string(),
	mimeType: z.string(),
	blob: z.string(), // base64 encoded
});

export const ResourceContentSchema = z.union([
	TextResourceContentSchema,
	BlobResourceContentSchema,
]);

/**
 * Prompt handler return type with structured content + text fallback
 */
export interface PromptHandlerResult {
	structuredContent: Record<string, any>;
	text: string;
}

/**
 * Resource provider function signature
 */
export interface ResourceProvider {
	read(uri: URL, signal?: AbortSignal): Promise<ResourceContentSchema>;
}

/**
 * Export type aliases for cleaner imports
 */
export type PromptArgument = z.infer<typeof PromptArgumentSchema>;
export type PromptDefinition = z.infer<typeof PromptDefinitionSchema>;
export type StructuredContent = z.infer<typeof StructuredContentSchema>;
export type ResourceDefinition = z.infer<typeof ResourceDefinitionSchema>;
export type TextResourceContent = z.infer<typeof TextResourceContentSchema>;
export type BlobResourceContent = z.infer<typeof BlobResourceContentSchema>;
export type ResourceContent = z.infer<typeof ResourceContentSchema>;
