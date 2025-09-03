import { z } from "zod";

// Minimal local copies of schemas used by RAG entrypoint to avoid cross-package path mapping
// Expand as needed to match @cortex-os/contracts shapes.

export const AgentConfigSchema = z.object({
  maxTokens: z.number().int().positive().default(512),
  timeoutMs: z.number().int().positive().default(30000),
});

export const RAGQuerySchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive().default(5),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type RAGQuery = z.infer<typeof RAGQuerySchema>;
