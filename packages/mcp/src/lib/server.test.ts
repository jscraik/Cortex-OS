import { describe, it, expect } from 'vitest';
import {
  handleInitialize,
  handleTools,
  handleResources,
  handlePrompts,
  handleUnsupported,
} from './server.js';
import { validateRequest } from './server-utils.js';

describe('server handlers', () => {
  const options = { name: 'test', version: '1.0' };
  const tools = new Map();
  const resources = new Map();
  const prompts = new Map();

  tools.set('echo', { def: { name: 'echo' }, handler: (a: any) => a });
  resources.set('res://1', { def: { uri: 'res://1' }, handler: () => ({ ok: true }) });
  prompts.set('p', { def: { name: 'p' }, handler: () => 'prompt' });

  it('handleInitialize reports capabilities', () => {
    const parsed = validateRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    const res = handleInitialize(parsed, options, tools, resources, prompts);
    expect(res.result?.capabilities).toEqual({ tools: true, resources: true, prompts: true });
  });

  it('handleTools lists and calls tools', async () => {
    const listRes = await handleTools(
      validateRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      tools,
    );
    expect(listRes.result?.tools?.[0].name).toBe('echo');
    const callRes = await handleTools(
      validateRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'echo', arguments: { msg: 'hi' } },
      }),
      tools,
    );
    expect(callRes.result?.result).toEqual({ msg: 'hi' });
  });

  it('handleResources lists and reads resources', async () => {
    const listRes = await handleResources(
      validateRequest({ jsonrpc: '2.0', id: 1, method: 'resources/list' }),
      resources,
    );
    expect(listRes.result?.resources?.[0].uri).toBe('res://1');
    const readRes = await handleResources(
      validateRequest({ jsonrpc: '2.0', id: 2, method: 'resources/read', params: { uri: 'res://1' } }),
      resources,
    );
    expect(readRes.result).toEqual({ ok: true });
  });

  it('handlePrompts lists prompts', () => {
    const res = handlePrompts(
      validateRequest({ jsonrpc: '2.0', id: 1, method: 'prompts/list' }),
      prompts,
    );
    expect(res.result?.prompts?.[0].name).toBe('p');
  });

  it('handleUnsupported returns error', () => {
    const res = handleUnsupported(
      validateRequest({ jsonrpc: '2.0', id: 1, method: 'nope' }),
    );
    expect(res.error?.message).toBe('Method not supported');
  });
});
