import { z } from 'zod';

// Central transport kind (extensible) used across MCP components.
// 'streamableHttp' retained for backward compatibility; prefer 'http' going forward.
export const TransportKindSchema = z.enum([
	'stdio',
	'http',
	'sse',
	'ws',
	'streamableHttp',
]);
export type TransportKind = z.infer<typeof TransportKindSchema>;

export const ServerInfoSchema = z.object({
	name: z.string(),
	transport: TransportKindSchema,
	// stdio
	command: z.string().optional(),
	args: z.array(z.string()).optional(),
	env: z.record(z.string()).optional(),
	// http(s)
	endpoint: z.string().optional(),
	headers: z.record(z.string()).optional(),
});

export type ServerInfo = z.infer<typeof ServerInfoSchema>;
