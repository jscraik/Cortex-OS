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

type ToolDef = { name: string; description?: string; inputSchema?: JsonSchema };
type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;
type Tool = { def: ToolDef; handler: ToolHandler };

type ResourceDef = { uri: string; name?: string };
type ResourceHandler = () => Promise<Record<string, unknown>> | Record<string, unknown>;
type Resource = { def: ResourceDef; handler: ResourceHandler };

type PromptDef = { name: string; description?: string };
type PromptHandler = () => Promise<unknown> | unknown;
type Prompt = { def: PromptDef; handler: PromptHandler };

export function parseRequest(req: McpRequest) {
  const reqSchema = z.object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number()]),
    method: z.string(),
    params: z.unknown().optional(),
  });
  return reqSchema.parse(req);
}

export function validateToolArgs(
  schema: JsonSchema | undefined,
  args: Record<string, unknown>,
) {
  if (!schema) return;
  const required = schema.required || [];
  for (const field of required) {
    if (!(field in args)) throw new Error(`Invalid input: ${field} is required`);
  }
  const props = schema.properties || {};
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

function mapDefinitions<T>(items: Map<string, { def: T }>): T[] {
  return Array.from(items.values()).map((t) => t.def);
}

function handleInitialize(
  parsed: ReturnType<typeof parseRequest>,
  options: { name: string; version: string },
  tools: Map<string, Tool>,
  resources: Map<string, Resource>,
  prompts: Map<string, Prompt>,
) {
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

async function handleToolsCall(
  parsed: ReturnType<typeof parseRequest>,
  tools: Map<string, Tool>,
) {
  try {
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

async function handleResourcesRead(
  parsed: ReturnType<typeof parseRequest>,
  resources: Map<string, Resource>,
) {
  try {
    const { uri } = z.object({ uri: z.string() }).parse(parsed.params);
    const resource = resources.get(uri);
    if (!resource) {
      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        error: { code: -32601, message: 'Resource not found' },
      };
    }
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

function makeAddTool(tools: Map<string, Tool>) {
  return (def: ToolDef, handler: ToolHandler) => {
    z.object({ name: z.string().min(1) }).parse(def);
    tools.set(def.name, { def, handler });
  };
}

function makeAddResource(resources: Map<string, Resource>) {
  return (def: ResourceDef, handler: ResourceHandler) => {
    z.object({ uri: z.string().min(1) }).parse(def);
    resources.set(def.uri, { def, handler });
  };
}

function makeAddPrompt(prompts: Map<string, Prompt>) {
  return (def: PromptDef, handler: PromptHandler) => {
    z.object({ name: z.string().min(1) }).parse(def);
    prompts.set(def.name, { def, handler });
  };
}

async function processRequest(
  options: { name: string; version: string },
  tools: Map<string, Tool>,
  resources: Map<string, Resource>,
  prompts: Map<string, Prompt>,
  req: McpRequest,
) {
  const parsed = parseRequest(req);
  switch (parsed.method) {
    case 'initialize':
      return handleInitialize(parsed, options, tools, resources, prompts);
    case 'tools/list':
      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        result: { tools: mapDefinitions(tools) },
      };
    case 'tools/call':
      return handleToolsCall(parsed, tools);
    case 'resources/list':
      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        result: { resources: mapDefinitions(resources) },
      };
    case 'resources/read':
      return handleResourcesRead(parsed, resources);
    case 'prompts/list':
      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        result: { prompts: mapDefinitions(prompts) },
      };
    default:
      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        error: { code: -32603, message: 'Method not supported' },
      };
  }
}

export function createMcpServer(options: { name: string; version: string }) {
  serverOptionsSchema.parse(options);

  const tools = new Map<string, Tool>();
  const resources = new Map<string, Resource>();
  const prompts = new Map<string, Prompt>();

  return {
    addTool: makeAddTool(tools),
    addResource: makeAddResource(resources),
    addPrompt: makeAddPrompt(prompts),
    handleRequest: (req: McpRequest) =>
      processRequest(options, tools, resources, prompts, req),

  };
}
