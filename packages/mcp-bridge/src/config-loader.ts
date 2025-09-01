import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';

export const ToolSchema = z.object({
  id: z.string(),
  server: z.string(),
  scopes: z.array(z.string()),
  meta: z.record(z.unknown()).default({}),
});
export type Tool = z.infer<typeof ToolSchema>;

export const McpConfigSchema = z.object({
  $source: z.string().optional(),
  version: z.string(),
  registry: z.record(z.unknown()).optional(),
  tools: z.array(ToolSchema),
  security: z.record(z.unknown()).optional(),
  audit: z.record(z.unknown()).optional(),
});
export type McpConfig = z.infer<typeof McpConfigSchema>;

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function mergeMcpConfigs(configs: McpConfig[]): McpConfig {
  if (configs.length === 0) {
    throw new Error('No MCP configs provided to mergeMcpConfigs');
  }
  const base: McpConfig = configs[0];
  const tools: Tool[] = [];
  const seen = new Set<string>();

  for (const cfg of configs) {
    for (const tool of cfg.tools) {
      if (seen.has(tool.id)) {
        throw new Error(`Duplicate MCP tool id: ${tool.id}`);
      }
      seen.add(tool.id);
      tools.push(tool);
    }
  }

  return { ...base, tools };
}

export async function loadMcpConfigs(files: string[]): Promise<McpConfig> {
  const configs: McpConfig[] = [];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf-8');
    const json = JSON.parse(raw);
    json.$source = path.basename(file);
    configs.push(McpConfigSchema.parse(json));
  }
  return mergeMcpConfigs(configs);
}
