import { z } from 'zod';
import type { McpRequest } from './types.js';
import {

  validateServerOptions,
  validateRequest,
  initializeParamsSchema,
  toolCallParamsSchema,
  resourceReadParamsSchema,
  validateToolArgs,
  type JsonSchema,
} from './server-utils.js';

type ParsedRequest = ReturnType<typeof validateRequest>;

export type ToolDef = { name: string; description?: string; inputSchema?: JsonSchema };
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;
export type ResourceDef = { uri: string; name?: string };
export type ResourceHandler = () => Promise<Record<string, unknown>> | Record<string, unknown>;
export type PromptDef = { name: string; description?: string };
export type PromptHandler = () => Promise<unknown> | unknown;

export function handleInitialize(
  parsed: ParsedRequest,
  options: { name: string; version: string },
  tools: Map<string, { def: ToolDef; handler: ToolHandler }>,
  resources: Map<string, { def: ResourceDef; handler: ResourceHandler }>,
  prompts: Map<string, { def: PromptDef; handler: PromptHandler }>
) {
  const params = initializeParamsSchema.parse(parsed.params);
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

export async function handleTools(
  parsed: ParsedRequest,
  tools: Map<string, { def: ToolDef; handler: ToolHandler }>
) {
  if (parsed.method === 'tools/list') {
    return {
      jsonrpc: '2.0' as const,
      id: parsed.id,
      result: { tools: Array.from(tools.values()).map((t) => t.def) },
    };
  }
  if (parsed.method === 'tools/call') {
    const { name, args } = toolCallParamsSchema.parse(parsed.params);
    const tool = tools.get(name);
    if (!tool) {
      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        error: { code: -32601, message: 'Tool not found' },
      };
    }
    try {
      validateToolArgs(tool.def.inputSchema, args);
      const result = await tool.handler(args);
      return { jsonrpc: '2.0' as const, id: parsed.id, result: { result } };
    } catch (error) {
      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  return handleUnsupported(parsed);
}

export async function handleResources(
  parsed: ParsedRequest,
  resources: Map<string, { def: ResourceDef; handler: ResourceHandler }>
) {
  if (parsed.method === 'resources/list') {
    return {
      jsonrpc: '2.0' as const,
      id: parsed.id,
      result: { resources: Array.from(resources.values()).map((r) => r.def) },
    };
  }
  if (parsed.method === 'resources/read') {
    const { uri } = resourceReadParamsSchema.parse(parsed.params);
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
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
  return handleUnsupported(parsed);
}

export function handlePrompts(
  parsed: ParsedRequest,
  prompts: Map<string, { def: PromptDef; handler: PromptHandler }>
) {
  if (parsed.method === 'prompts/list') {
    return {
      jsonrpc: '2.0' as const,
      id: parsed.id,
      result: { prompts: Array.from(prompts.values()).map((p) => p.def) },
    };
  }
  return handleUnsupported(parsed);
}


export function handleUnsupported(parsed: ParsedRequest) {
  return {
    jsonrpc: '2.0' as const,
    id: parsed.id,
    error: { code: -32603, message: 'Method not supported' },

  };
}

export function createMcpServer(options: { name: string; version: string }) {
  validateServerOptions(options);

  const tools = new Map<string, { def: ToolDef; handler: ToolHandler }>();
  const resources = new Map<string, { def: ResourceDef; handler: ResourceHandler }>();
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

      const parsed = validateRequest(req);

      if (parsed.method === 'initialize') {
        return handleInitialize(parsed, options, tools, resources, prompts);
      }
      if (parsed.method.startsWith('tools/')) {
        return handleTools(parsed, tools);
      }
      if (parsed.method.startsWith('resources/')) {
        return handleResources(parsed, resources);
      }
      if (parsed.method.startsWith('prompts/')) {
        return handlePrompts(parsed, prompts);
      }

      return handleUnsupported(parsed);

    },
  };
}
