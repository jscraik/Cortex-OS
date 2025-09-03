import { z } from "zod";

export const ServerInfoSchema = z.object({
  name: z.string(),
  transport: z.enum(["stdio", "sse", "streamableHttp"]),
  // stdio
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  // http(s)
  endpoint: z.string().optional(),
  headers: z.record(z.string()).optional()
});

export type ServerInfo = z.infer<typeof ServerInfoSchema>;
