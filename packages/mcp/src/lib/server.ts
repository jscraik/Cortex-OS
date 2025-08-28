import { z } from 'zod';
import type { McpRequest } from './types.js';
import {
  handleInitialize,
  handleToolsList,
  handleToolCall,
  handleResourcesList,
  handleResourceRead,
  handlePromptsList,
} from './server/handlers.js';
import type {
  ServerContext,
  ToolDef,
  ToolHandler,
  ResourceDef,
  ResourceHandler,
  PromptDef,
  PromptHandler,
} from './server/types.js';

const serverOptionsSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

export function createMcpServer(options: { name: string; version: string }) {
  serverOptionsSchema.parse(options);

  const tools = new Map<string, { def: ToolDef; handler: ToolHandler }>();
  const resources = new Map<string, { def: ResourceDef; handler: ResourceHandler }>();
  const prompts = new Map<string, { def: PromptDef; handler: PromptHandler }>();
  const context: ServerContext = { options, tools, resources, prompts };

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

      switch (parsed.method) {
        case 'initialize':
          return handleInitialize(parsed.id, parsed.params, context);
        case 'tools/list':
          return handleToolsList(parsed.id, context);
        case 'tools/call':
          return handleToolCall(parsed.id, parsed.params, context);
        case 'resources/list':
          return handleResourcesList(parsed.id, context);
        case 'resources/read':
          return handleResourceRead(parsed.id, parsed.params, context);
        case 'prompts/list':
          return handlePromptsList(parsed.id, context);
        default:
          return {
            jsonrpc: '2.0' as const,
            id: parsed.id,
            error: { code: -32603, message: 'Method not supported' },
          };
      }
    },
  };
}
