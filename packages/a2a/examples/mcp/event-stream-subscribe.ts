import { createA2AMcpTools } from '../../src/mcp/tools.js';

async function main() {
	const tools = createA2AMcpTools();
	const tool = tools.find((t) => t.name === 'a2a_event_stream_subscribe');
	if (!tool) throw new Error('Tool not found');
	const res = await tool.handler({ includeCurrent: true });
	console.log('[event-stream-subscribe] snapshot:', res.raw || res.content[0].text);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
