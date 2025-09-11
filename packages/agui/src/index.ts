import type { EventEmitter } from 'node:events';
import { createAGUIClient } from '@ag-ui/core';

export function createAGUIAdapter(emitter: EventEmitter) {
	const agui = createAGUIClient({ transport: 'sse' });

	emitter.on('agent:response', (payload) => {
		agui.emit('agent_message', payload);
	});

	return agui;
}
