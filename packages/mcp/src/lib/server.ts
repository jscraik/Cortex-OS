import { z } from 'zod';
import type { McpRequest } from './types.js';

const serverOptionsSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

type JsonSchema = {
  required?: string[];
  properties?: Record<string, { type?: string; maxLength?: number }>;
};

export function createMcpServer(options: { name: string; version: string }) {
  serverOptionsSchema.parse(options);

  type ToolDef = {
    name: string;
    description?: string;
    inputSchema?: JsonSchema;
  };
  type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;
  const tools = new Map<string, { def: ToolDef; handler: ToolHandler }>();

  type ResourceDef = { uri: string; name?: string };
  type ResourceHandler = () =>
    | Promise<Record<string, unknown>>
    | Record<string, unknown>;
  const resources = new Map<string, { def: ResourceDef; handler: ResourceHandler }>();

  type PromptDef = { name: string; description?: string };
  type PromptHandler = () => Promise<unknown> | unknown;
  const prompts = new Map<string, { def: PromptDef; handler: PromptHandler }>();

  return {
    addTool(def: ToolDef, handler: ToolHandler) {
      z.object({ name: z.string().min(1) }).parse(def);
      tools.set(def.name, { def, handler });
    },

    addResource(def: ResourceDef, handler: ResourceHandler) {
      z.object({ uri: z.string().min(1) }).parse(def);
      resources.set(def.uri, { def, handler });
    },

    addPrompt(def: PromptDef, handler: PromptHandler) {
      z.object({ name: z.string().min(1) }).parse(def);
      prompts.set(def.name, { def, handler });
    },

    async handleRequest(req: McpRequest) {
      const reqSchema = z.object({
        jsonrpc: z.literal('2.0'),
        id: z.union([z.string(), z.number()]),
        method: z.string(),
        params: z.unknown().optional(),
      });
      const parsed = reqSchema.parse(req);

      if (parsed.method === 'initialize') {
        const params = z
          .object({
            protocolVersion: z.string().optional(),
            capabilities: z.record(z.unknown()).optional(),
          })
          .optional()
          .parse(parsed.params);

        return {
          jsonrpc: '2.0' as const,
          id: parsed.id,
          result: {
            protocolVersion: params?.protocolVersion,
            capabilities: {
              tools: tools.size > 0,
              resources: resources.size > 0,
              prompts: prompts.size > 0,
            },
            serverInfo: { name: options.name, version: options.version },
          },
        };
      }

      if (parsed.method === 'tools/list') {
        return {
          jsonrpc: '2.0' as const,
          id: parsed.id,
          result: { tools: Array.from(tools.values()).map((t) => t.def) },
        };
      }

      if (parsed.method === 'tools/call') {
        const { name, args } = z
          .object({
            name: z.string(),
            arguments: z.record(z.unknown()).optional(),
          })
          .transform((o) => ({ name: o.name, args: o.arguments ?? {} }))
          .parse(parsed.params);

        const tool = tools.get(name);
        if (!tool) {
          return {
            jsonrpc: '2.0' as const,
            id: parsed.id,
            error: { code: -32601, message: 'Tool not found' },
          };
        }

        try {
          const schema = tool.def.inputSchema;
          if (schema) {
            const required = schema.required || [];
            const props = schema.properties || {};

            for (const field of required) {
              if (!(field in args)) {
                throw new Error(`Invalid input: ${field} is required`);
              }
            }

            for (const [key, value] of Object.entries(args)) {
              const prop = props[key];
              if (prop?.type === 'string' && typeof value !== 'string') {
                throw new Error(`Invalid input: ${key} must be string`);
              }
              if (
                prop?.maxLength &&
                typeof value === 'string' &&
                value.length > prop.maxLength
              ) {
                throw new Error('Input too long');
              }
            }
          }

          const result = await tool.handler(args);
          return { jsonrpc: '2.0' as const, id: parsed.id, result: { result } };
        } catch (error) {
          return {
            jsonrpc: '2.0' as const,
            id: parsed.id,
            error: {
              code: -32000,
              message:
                error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      }

      if (parsed.method === 'resources/list') {
        return {
          jsonrpc: '2.0' as const,
          id: parsed.id,
          result: { resources: Array.from(resources.values()).map((r) => r.def) },
        };
      }

      if (parsed.method === 'resources/read') {
        const { uri } = z.object({ uri: z.string() }).parse(parsed.params);
        const resource = resources.get(uri);
        if (!resource) {
          return {
            jsonrpc: '2.0' as const,
            id: parsed.id,
            error: { code: -32601, message: 'Resource not found' },
          };
        }

        try {
          const readResult = await resource.handler();
          return { jsonrpc: '2.0' as const, id: parsed.id, result: readResult };
        } catch (error) {
          return {
            jsonrpc: '2.0' as const,
            id: parsed.id,
            error: {
              code: -32000,
              message:
                error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      }

      if (parsed.method === 'prompts/list') {
        return {
          jsonrpc: '2.0' as const,
          id: parsed.id,
          result: { prompts: Array.from(prompts.values()).map((p) => p.def) },
        };
      }

      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        error: { code: -32601, message: `Unknown method: ${parsed.method}` },
      };
    },
  };
}

