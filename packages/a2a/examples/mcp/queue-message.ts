import { createA2AMcpTools } from '../../src/mcp/tools.js';

async function main() {
	const tools = createA2AMcpTools();
	const tool = tools.find((t) => t.name === 'a2a_queue_message');
	if (!tool) throw new Error('Tool not found');
	const res = await tool.handler({
		message: { role: 'user', parts: [{ text: 'Ping from example script' }] },
		context: [
			{ role: 'system', parts: [{ text: 'You are a demo processor' }] },
		],
	});
	console.log('[queue-message] raw:', res.raw || res.content[0].text);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
