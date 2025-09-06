import { createAGUIClient } from '@ag-ui/core';
import { EventEmitter } from 'node:events';

export function createAGUIAdapter(emitter: EventEmitter) {
  const agui = createAGUIClient({ transport: 'sse' });

  emitter.on('agent:response', (payload) => {
    agui.emit('agent_message', payload);
  });

  return agui;
}
