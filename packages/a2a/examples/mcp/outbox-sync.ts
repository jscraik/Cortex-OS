import { createA2AMcpTools } from '../../src/mcp/tools.js';

async function main() {
	const tools = createA2AMcpTools();
	const tool = tools.find((t) => t.name === 'a2a_outbox_sync');
	if (!tool) throw new Error('Tool not found');
	const res = await tool.handler({ action: 'dlqStats' });
	console.log('[outbox-sync] result:', res.raw || res.content[0].text);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
