import { z } from 'zod';
import type { McpRequest } from './types.js';

const serverOptionsSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

export function createMcpServer(options: { name: string; version: string }) {
  serverOptionsSchema.parse(options);

  type ToolDef = {
    name: string;
    description?: string;
    inputSchema?: any;
  };

  const tools = new Map<string, { def: ToolDef; handler: (args: any) => Promise<any> | any }>();

  return {
    addTool(def: ToolDef, handler: (args: any) => Promise<any> | any) {
      z.object({ name: z.string().min(1) }).parse(def);
      tools.set(def.name, { def, handler });
    },

    async handleRequest(req: McpRequest) {
      const reqSchema = z.object({
        jsonrpc: z.literal('2.0'),
        id: z.union([z.string(), z.number()]),
        method: z.string(),
        params: z.any().optional(),
      });
      reqSchema.parse(req);

      if (req.method === 'initialize') {
        return {
          jsonrpc: '2.0' as const,
          id: req.id,
          result: { capabilities: req.params?.capabilities ?? {} },
        };
      }

      if (req.method === 'tools/call') {
        const name = req.params?.name as string;
        const tool = tools.get(name);
        if (!tool) {
          return {
            jsonrpc: '2.0' as const,
            id: req.id,
            error: { code: -32601, message: 'Tool not found' },
          };
        }

        try {
          const args = (req.params as any)?.arguments ?? {};
          const schema = tool.def.inputSchema;
          if (schema) {
            const required: string[] = schema.required || [];
            const props: Record<string, any> = schema.properties || {};

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
              if (prop?.maxLength && typeof value === 'string' && value.length > prop.maxLength) {
                throw new Error('Input too long');
              }
            }
          }

          const result = await tool.handler(args);
          return { jsonrpc: '2.0' as const, id: req.id, result: { result } };
        } catch (error: any) {
          return {
            jsonrpc: '2.0' as const,
            id: req.id,
            error: { code: -32000, message: error.message },
          };
        }
      }

      return {
        jsonrpc: '2.0' as const,
        id: req.id,
        error: { code: -32601, message: 'Method not found' },
      };
    },
  };
}
