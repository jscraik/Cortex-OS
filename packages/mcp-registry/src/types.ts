import { z } from "zod";

export const TransportTypeSchema = z.enum(["stdio", "sse", "streamableHttp"]);

export const ServerManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  transports: z.record(z.unknown())
});

export const RegistryIndexSchema = z.object({
  updatedAt: z.string(),
  servers: z.array(ServerManifestSchema)
});

export type ServerManifest = z.infer<typeof ServerManifestSchema>;
export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;
