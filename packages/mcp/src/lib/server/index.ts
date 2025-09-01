import { z } from 'zod';
import {
  type JsonSchema,
  validateRequest,
  validateServerOptions,
  validateToolArgs,
} from '../server-utils.js';
import type { McpRequest, McpResponse } from '../types.js';
import {
  handleInitialize,
  handlePromptGet,
  handlePromptsList,
  handleResourceRead,
  handleResourcesList,
  handleToolCall,
  handleToolsList,
} from './mcp-handlers.js';
import type {
  PromptDef,
  PromptHandler,
  ResourceDef,
  ResourceHandler,
  ServerContext,
  ToolDef,
  ToolHandler,
} from './types.js';

export class McpServer {
  private context: ServerContext;
  private _initialized = false;

  constructor(config: { name: string; version: string }) {
    this.context = createServer(config);
  }

  addTool(def: ToolDef, handler: ToolHandler): void {
    addTool(this.context, def, handler);
  }

  addResource(def: ResourceDef, handler: ResourceHandler): void {
    addResource(this.context, def, handler);
  }

  addPrompt(def: PromptDef, handler: PromptHandler): void {
    addPrompt(this.context, def, handler);
  }

  async handleRequest(req: McpRequest): Promise<McpResponse> {
    // Intercept initialize to set initialized flag
    const res = (await handleRequest(this.context, req)) as McpResponse;
    if ((res as any)?.result && (req as any)?.method === 'initialize') {
      this._initialized = true;
    }
    return res;
  }

  isInitialized(): boolean {
    return this._initialized;
  }
}

export {
  handleInitialize,
  handleToolsList,
  handleToolCall,
  handleResourcesList,
  handleResourceRead,
  handlePromptsList,
  validateToolArgs,
  type JsonSchema,
};

export function createServer(config: { name: string; version: string }): ServerContext {
  const options = validateServerOptions(config);
  return {
    options: { name: options.name, version: options.version },
    tools: new Map(),
    resources: new Map(),
    prompts: new Map(),
    subscriptions: new Map(),
    templates: new Map(),
  };
}

export function addTool(ctx: ServerContext, def: ToolDef, handler: ToolHandler): void {
  z.object({ name: z.string().min(1) }).parse(def);
  ctx.tools.set(def.name, { def, handler });
}

export function addResource(ctx: ServerContext, def: ResourceDef, handler: ResourceHandler): void {
  z.object({ uri: z.string().min(1) }).parse(def);
  ctx.resources.set(def.uri, { def, handler });
}

export function addPrompt(ctx: ServerContext, def: PromptDef, handler: PromptHandler): void {
  z.object({ name: z.string().min(1) }).parse(def);
  ctx.prompts.set(def.name, { def, handler });
}

export async function handleRequest(arg1: any, arg2: any) {
  // Backward-compatible signature: accept either (ctx, req) or (req, ctx)
  let ctx: ServerContext;
  let req: McpRequest;
  if (arg1 && typeof arg1 === 'object' && 'jsonrpc' in arg1) {
    req = arg1 as McpRequest;
    ctx = arg2 as ServerContext;
  } else {
    ctx = arg1 as ServerContext;
    req = arg2 as McpRequest;
  }

  // If request is missing or malformed at top-level, respond with JSON-RPC invalid request
  if (!req || typeof req !== 'object') {
    return {
      jsonrpc: '2.0' as const,
      id: null,
      error: { code: -32600, message: 'Invalid request' },
    } as const;
  }

  let parsed;
  try {
    parsed = validateRequest(req);
  } catch {
    return {
      jsonrpc: '2.0' as const,
      id: null,
      error: { code: -32600, message: 'Invalid request' },
    } as const;
  }
  switch (parsed.method) {
    case 'initialize':
      return handleInitialize(parsed.id, parsed.params, ctx);
    case 'tools/list':
      return handleToolsList(parsed.id, {}, ctx);
    case 'tools/call':
      return handleToolCall(parsed.id, parsed.params, ctx);
    case 'resources/list':
      return handleResourcesList(parsed.id, {}, ctx);
    case 'resources/read':
      return handleResourceRead(parsed.id, parsed.params, ctx);
    case 'prompts/list':
      return handlePromptsList(parsed.id, {}, ctx);
    case 'prompts/get':
      return handlePromptGet(parsed.id, parsed.params, ctx);
    default:
      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        error: { code: -32603, message: 'Method not supported' },
      } as const;
  }
}

// Compatibility wrapper expected by legacy tests
export function createMcpServer(config: { name: string; version: string }) {
  return new McpServer(config);
}
