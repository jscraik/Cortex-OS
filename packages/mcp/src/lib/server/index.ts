import { z } from 'zod';
import type { McpRequest, McpResponse } from '../types.js';
import {
  validateServerOptions,
  validateRequest,
  validateToolArgs,
  type JsonSchema,
} from '../server-utils.js';
import type {
  ServerContext,
  ToolDef,
  ToolHandler,
  ResourceDef,
  ResourceHandler,
  PromptDef,
  PromptHandler,
} from './types.js';
import {
  handleInitialize,
  handleToolsList,
  handleToolCall,
  handleResourcesList,
  handleResourceRead,
  handlePromptsList,
} from './handlers.js';

export class McpServer {
  private context: ServerContext;
  public isInitialized = false;

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
    return handleRequest(this.context, req);
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
    options,
    tools: new Map(),
    resources: new Map(),
    prompts: new Map(),
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

export async function handleRequest(ctx: ServerContext, req: McpRequest) {
  const parsed = validateRequest(req);
  switch (parsed.method) {
    case 'initialize':
      return handleInitialize(parsed.id, parsed.params, ctx);
    case 'tools/list':
      return handleToolsList(parsed.id, ctx);
    case 'tools/call':
      return handleToolCall(parsed.id, parsed.params, ctx);
    case 'resources/list':
      return handleResourcesList(parsed.id, ctx);
    case 'resources/read':
      return handleResourceRead(parsed.id, parsed.params, ctx);
    case 'prompts/list':
      return handlePromptsList(parsed.id, ctx);
    default:
      return {
        jsonrpc: '2.0' as const,
        id: parsed.id,
        error: { code: -32603, message: 'Method not supported' },
      } as const;
  }
}
