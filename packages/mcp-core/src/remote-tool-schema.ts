/**
 * Remote Tool Schema Validation (GREEN Phase Implementation)
 *
 * Phase A.1: Schema Validation for Wikidata Semantic Layer Integration
 * Task: tasks/wikidata-semantic-layer-integration
 *
 * This module provides Zod schemas for validating remote MCP tools (e.g., Wikidata SPARQL)
 * that are registered in the static remoteTools manifest.
 *
 * All error messages include brAInwav branding for observability and governance compliance.
 *
 * @see tasks/wikidata-semantic-layer-integration/tdd-plan.md - Phase A.1
 * @see .cortex/rules/RULES_OF_AI.md - brAInwav production standards
 * @see .cortex/rules/CODESTYLE.md - Coding conventions
 */

import { z } from 'zod';

/**
 * Validation helper for URL format
 * Accepts HTTPS endpoints and HTTP for localhost only (development)
 */
const urlValidation = z
	.string()
	.min(1, 'brAInwav: Endpoint URL cannot be empty')
	.refine(
		(url) => {
			try {
				const parsed = new URL(url);
				// Production: require HTTPS
				// Development: allow HTTP for localhost/127.0.0.1
				if (parsed.protocol === 'https:') return true;
				if (
					parsed.protocol === 'http:' &&
					(parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
				) {
					return true;
				}
				return false;
			} catch {
				return false;
			}
		},
		{
			message: 'brAInwav: Endpoint must be a valid HTTPS URL (or HTTP for localhost)',
		},
	);

/**
 * Validation helper for tool name format
 * Enforces snake_case naming convention
 */
const toolNameValidation = z
	.string()
	.min(1, 'brAInwav: Tool name cannot be empty')
	.regex(
		/^[a-z][a-z0-9_]*$/,
		'brAInwav: Tool name must be snake_case (lowercase letters, numbers, underscores)',
	);

/**
 * Validation helper for Zod schema instances
 * Ensures inputSchema and outputSchema are actual Zod schemas
 */
const zodSchemaValidation = z.custom<z.ZodSchema>(
	(val) => {
		// Check if it's a Zod schema by verifying it has parse/safeParse methods
		return (
			val &&
			typeof val === 'object' &&
			'parse' in val &&
			typeof val.parse === 'function' &&
			'safeParse' in val &&
			typeof val.safeParse === 'function'
		);
	},
	{
		message: 'brAInwav: Must be a valid Zod schema (z.object, z.string, etc.)',
	},
);

/**
 * Remote Tool Schema
 *
 * Defines the structure for remote MCP tools that will be registered
 * in the static remoteTools manifest.
 *
 * Required fields:
 * - name: snake_case identifier
 * - endpoint: HTTPS URL (or HTTP for localhost)
 * - description: Human-readable description (should include brAInwav branding)
 * - inputSchema: Zod schema for validating tool inputs
 * - outputSchema: Zod schema for validating tool outputs
 *
 * Optional fields:
 * - timeout: Request timeout in milliseconds
 * - headers: Custom HTTP headers for the request
 */
export const RemoteToolSchema = z
	.object({
		name: toolNameValidation,
		endpoint: urlValidation,
		description: z.string().min(10, 'brAInwav: Description must be at least 10 characters'),
		inputSchema: zodSchemaValidation,
		outputSchema: zodSchemaValidation,
		timeout: z.number().int().positive().optional().describe('Request timeout in milliseconds'),
		headers: z.record(z.string()).optional().describe('Custom HTTP headers'),
	})
	.strict(); // Reject unknown properties for governance

/**
 * Type inference for RemoteTool
 */
export type RemoteTool = z.infer<typeof RemoteToolSchema>;

/**
 * Remote Tool Manifest Schema
 *
 * Validates the complete manifest containing multiple remote tools.
 * Enforces:
 * - Non-empty remoteTools array
 * - Unique tool names (no duplicates)
 * - All tools conform to RemoteToolSchema
 */
export const RemoteToolManifestSchema = z
	.object({
		remoteTools: z
			.array(RemoteToolSchema)
			.min(1, 'brAInwav: remoteTools array must contain at least one tool'),
	})
	.refine(
		(manifest) => {
			// Check for duplicate tool names
			const names = manifest.remoteTools.map((tool) => tool.name);
			const uniqueNames = new Set(names);
			return names.length === uniqueNames.size;
		},
		{
			message: 'brAInwav: Tool names must be unique (duplicate detected)',
		},
	);

/**
 * Type inference for RemoteToolManifest
 */
export type RemoteToolManifest = z.infer<typeof RemoteToolManifestSchema>;

/**
 * Validation result type for better error handling
 */
export type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; error: { message: string; details?: unknown } };

/**
 * Validate a remote tool manifest
 *
 * @param manifest - The manifest object to validate
 * @returns ValidationResult with success/error and data/error details
 *
 * @example
 * ```typescript
 * const result = validateRemoteToolManifest({
 *   remoteTools: [
 *     {
 *       name: 'wikidata_sparql_query',
 *       endpoint: 'https://query.wikidata.org/sparql',
 *       description: 'brAInwav Wikidata SPARQL query interface',
 *       inputSchema: z.object({ query: z.string() }),
 *       outputSchema: z.object({ results: z.array(z.unknown()) })
 *     }
 *   ]
 * });
 *
 * if (result.success) {
 *   console.log('Valid manifest:', result.data);
 * } else {
 *   console.error('brAInwav validation error:', result.error.message);
 * }
 * ```
 */
export async function validateRemoteToolManifest(
	manifest: unknown,
): Promise<ValidationResult<RemoteToolManifest>> {
	const result = RemoteToolManifestSchema.safeParse(manifest);

	if (result.success) {
		return { success: true, data: result.data };
	}

	// Format error message with brAInwav branding
	const errorMessage = `brAInwav Remote Tool Manifest Validation Failed: ${result.error.message}`;

	return {
		success: false,
		error: {
			message: errorMessage,
			details: result.error.format(),
		},
	};
}

/**
 * Synchronous version of validateRemoteToolManifest
 * Useful for testing and non-async contexts
 */
export function validateRemoteToolManifestSync(
	manifest: unknown,
): ValidationResult<RemoteToolManifest> {
	const result = RemoteToolManifestSchema.safeParse(manifest);

	if (result.success) {
		return { success: true, data: result.data };
	}

	const errorMessage = `brAInwav Remote Tool Manifest Validation Failed: ${result.error.message}`;

	return {
		success: false,
		error: {
			message: errorMessage,
			details: result.error.format(),
		},
	};
}

/**
 * Validate a single remote tool
 *
 * @param tool - The tool object to validate
 * @returns ValidationResult with success/error and data/error details
 */
export function validateRemoteTool(tool: unknown): ValidationResult<RemoteTool> {
	const result = RemoteToolSchema.safeParse(tool);

	if (result.success) {
		return { success: true, data: result.data };
	}

	const errorMessage = `brAInwav Remote Tool Validation Failed: ${result.error.message}`;

	return {
		success: false,
		error: {
			message: errorMessage,
			details: result.error.format(),
		},
	};
}

/**
 * Export schemas and types for external use
 */
export default {
	RemoteToolSchema,
	RemoteToolManifestSchema,
	validateRemoteToolManifest,
	validateRemoteToolManifestSync,
	validateRemoteTool,
};
