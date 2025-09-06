import { EventEmitter } from 'node:events';
import { vi, expect, test } from 'vitest';
import { createAGUIAdapter } from '../src/index.js';

vi.mock('@ag-ui/core', () => {
  const client = new EventEmitter();
  (client as any).stream = vi.fn();
  return {
    createAGUIClient: vi.fn(() => client),
  };
});

test('forwards agent:response events to ag-ui agent_message', () => {
  const emitter = new EventEmitter();
  const agui: any = createAGUIAdapter(emitter);
  const payload = { content: 'hi' };
  const spy = vi.spyOn(agui, 'emit');

  emitter.emit('agent:response', payload);

  expect(spy).toHaveBeenCalledWith('agent_message', payload);
});
