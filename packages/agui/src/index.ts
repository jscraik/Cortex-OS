import type { EventEmitter } from 'node:events';
import { createAGUIClient } from '@ag-ui/core';

export function createAGUIAdapter(emitter: EventEmitter) {
	const agui = createAGUIClient({ transport: 'sse' });

	emitter.on('agent:response', (payload) => {
		agui.emit('agent_message', payload);
	});

	return agui;
}

// A2A Events
export {
	type AiRecommendationEvent,
	createAguiEvent,
	type UiComponentRenderedEvent,
	type UiStateChangedEvent,
	type UserInteractionEvent,
} from './events/agui-events.js';
// MCP Integration
export { aguiMcpTools } from './mcp/tools.js';
