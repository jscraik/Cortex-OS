import { z } from 'zod';

export const ToolCapabilitySchema = z.enum([
	'visualization',
	'monitoring',
	'reporting',
	'file-system',
	'process',
	'network',
	'atomic-io',
	'compute',
]);

export const ToolManifestSchema = z.object({
	name: z.string().min(1),
	level: z.enum(['dashboard', 'execution', 'primitive']),
	description: z.string().optional(),
	capabilities: z.array(ToolCapabilitySchema).default([]),
});
export type ToolManifest = z.infer<typeof ToolManifestSchema>;

export const ToolInvokeRequestSchema = z.object({
	tool: z.string().min(1),
	params: z.record(z.unknown()).optional(),
});

export const ToolResultSchema = z.object({
	ok: z.boolean(),
	type: z.string().min(1),
	data: z.unknown(),
	error: z.string().optional(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

export const ToolLayerSchema = z.object({});
