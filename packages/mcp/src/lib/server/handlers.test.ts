import { describe, expect, it } from 'vitest';
import {
  createServer,
  addTool,
  addResource,
  addPrompt,
} from './index.js';
import {
  handleInitialize,
  handleToolsList,
  handleToolCall,
  handleResourcesList,
  handleResourceRead,
  handlePromptsList,
} from './handlers.js';

describe('server handlers', () => {
  const context = createServer({ name: 'test', version: '1.0.0' });

  addTool(context, { name: 'echo' }, (args: Record<string, unknown>) => args);
  addResource(context, { uri: 'res' }, () => ({ ok: true }));
  addPrompt(context, { name: 'p' }, () => 'prompt');

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
    expect(res.result).toEqual({ contents: [{ ok: true }] });
  });

  it('handlePromptsList', () => {
    const res = handlePromptsList('1', context);
    expect(res.result.prompts).toHaveLength(1);
  });
});
