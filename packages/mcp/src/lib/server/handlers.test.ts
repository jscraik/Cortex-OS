import { describe, expect, it } from 'vitest';
import {
  handleInitialize,
  handleToolsList,
  handleToolCall,
  handleResourcesList,
  handleResourceRead,
  handlePromptsList,
} from './handlers.js';
import type { ServerContext } from './types.js';

describe('server handlers', () => {
  const context: ServerContext = {
    options: { name: 'test', version: '1.0.0' },
    tools: new Map(),
    resources: new Map(),
    prompts: new Map(),
  };

  context.tools.set('echo', {
    def: { name: 'echo' },
    handler: (args: Record<string, unknown>) => args,
  });
  context.resources.set('res', {
    def: { uri: 'res' },
    handler: () => ({ ok: true }),
  });
  context.prompts.set('p', {
    def: { name: 'p' },
    handler: () => 'prompt',
  });

  it('handleInitialize', () => {
    const res = handleInitialize('1', undefined, context);
    expect(res.result.serverInfo.name).toBe('test');
    expect(res.result.capabilities.tools).toBe(true);
  });

  it('handleToolsList', () => {
    const res = handleToolsList('1', context);
    expect(res.result.tools).toHaveLength(1);
  });

  it('handleToolCall', async () => {
    const res = await handleToolCall('1', { name: 'echo', arguments: { msg: 'hi' } }, context);
    expect(res.result).toEqual({ result: { msg: 'hi' } });
  });

  it('handleResourcesList', () => {
    const res = handleResourcesList('1', context);
    expect(res.result.resources).toHaveLength(1);
  });

  it('handleResourceRead', async () => {
    const res = await handleResourceRead('1', { uri: 'res' }, context);
    expect(res.result).toEqual({ ok: true });
  });

  it('handlePromptsList', () => {
    const res = handlePromptsList('1', context);
    expect(res.result.prompts).toHaveLength(1);
  });
});
