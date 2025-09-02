import { z } from "zod";

export const ToolSchema = z.object({
	name: z.string(),
	description: z.string().default(""),
	input_schema: z.record(z.unknown()).optional(),
});

export const ServerInfoSchema = z.object({
	name: z.string(),
	transport: z.enum(["stdio", "sse", "streamableHttp"]),
	endpoint: z.string().optional(),
	command: z.string().optional(),
	args: z.array(z.string()).optional(),
	env: z.record(z.string()).optional(),
	// Optional headers for HTTP/SSE transports
	headers: z.record(z.string()).optional(),
});

export type ServerInfo = z.infer<typeof ServerInfoSchema>;
