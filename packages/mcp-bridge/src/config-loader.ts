import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const ToolSchema = z.object({
  id: z.string().min(1),
  server: z.string().min(1),
  scopes: z.array(z.string()).default([]),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const McpConfigSchema = z.object({
  $source: z.string().min(1),
  version: z.string().default("1"),
  tools: z.array(ToolSchema).default([]),
  registry: z.record(z.string(), z.string()).optional(),
});

export type McpConfig = z.infer<typeof McpConfigSchema>;
export type Tool = z.infer<typeof ToolSchema>;

export type MergeReportEntry =
  | { id: string; action: "add"; from: string }
  | {
      id: string;
      action: "override";
      from: string;
      over: string;
      winner_source?: string;
      loser_source?: string;
      diff?: Record<string, unknown>;
    };

export async function loadMcpConfigs(
  files: string[],
  opts?: { allowOverride?: boolean; overrideIds?: string[] },
) {
  const loaded: McpConfig[] = [];
  for (const f of files) {
    const p = path.resolve(process.cwd(), f);
    const txt = await fs.readFile(p, "utf8");
    const parsed = McpConfigSchema.parse({ ...JSON.parse(txt), $source: p });
    loaded.push(parsed);
  }
  return mergeMcpConfigs(loaded, opts);
}

export function hashString(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
}

export function mergeMcpConfigs(
  list: McpConfig[],
  opts: { allowOverride?: boolean; overrideIds?: string[] } = {},
) {
  const byId = new Map<string, { tool: Tool; source: string }>();
  const registry: Record<string, string> = {};
  const report: MergeReportEntry[] = [];
  for (const cfg of list) {
    Object.assign(registry, cfg.registry ?? {});
    for (const t of cfg.tools) {
      const prev = byId.get(t.id);
      if (!prev) {
        byId.set(t.id, { tool: t, source: cfg.$source });
        report.push({ id: t.id, action: "add", from: cfg.$source });
      } else {
        const allowed =
          opts.allowOverride || (opts.overrideIds ?? []).includes(t.id);
        if (!allowed) {
          const msg = `Duplicate MCP tool id "${t.id}" from ${cfg.$source} conflicts with ${prev.source}. Use --mcp-allow-override or --mcp-override=${t.id}.`;
          throw new Error(msg);
        }
        const merged = mergeTool(prev.tool, t);
        byId.set(t.id, { tool: merged, source: cfg.$source });
        report.push({
          id: t.id,
          action: "override",
          from: cfg.$source,
          over: prev.source,
          winner_source: cfg.$source,
          loser_source: prev.source,
          // Optional diff could be added here; keeping simple for now
        });
      }
    }
  }
  return { tools: [...byId.values()].map((v) => v.tool), registry, report };
}

function mergeTool(a: Tool, b: Tool): Tool {
  const scopes = Array.from(
    new Set([...(a.scopes ?? []), ...(b.scopes ?? [])]),
  );
  return { ...a, ...b, scopes, meta: { ...(a.meta ?? {}), ...(b.meta ?? {}) } };
}
