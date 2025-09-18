import type { EventEmitter } from 'node:events';
import { createAGUIClient } from '@ag-ui/core';

export function createAGUIAdapter(emitter: EventEmitter) {
	const agui = createAGUIClient({ transport: 'sse' });

	emitter.on('agent:response', (payload) => {
		agui.emit('agent_message', payload);
	});

	return agui;
}

// Re-export AGUI events from shared contracts location
export * from '@cortex-os/contracts/agui';
// Legacy exports for backward compatibility (deprecated)
/** @deprecated Use imports from '@cortex-os/contracts/agui' instead */
export { createAguiEvent } from '@cortex-os/contracts/agui';
// MCP Integration
export { aguiMcpTools } from './mcp/tools.js';
