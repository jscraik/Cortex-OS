/*
 * Composite MCP Tool Usage Example
 *
 * Demonstrates a sequential interaction pattern:
 * 1. Queue a task/message
 * 2. Subscribe to current task snapshot (would be streaming in future)
 * 3. Run an outbox sync action (dlqStats) to illustrate maintenance operation
 *
 * Run with:
 *   pnpm ts-node packages/a2a/examples/mcp/composite-sequence.ts
 *
 * Optional spans:
 *   A2A_MCP_SPANS=1 pnpm ts-node packages/a2a/examples/mcp/composite-sequence.ts
 */

import type { A2AMcpTool } from '../../src/mcp/tools.js';
import { createA2AMcpTools } from '../../src/mcp/tools.js';

async function main() {
	const tools = createA2AMcpTools();
	const queueTool = tools.find((t) => t.name === 'a2a_queue_message') as
		| A2AMcpTool
		| undefined;
	const subscribeTool = tools.find(
		(t) => t.name === 'a2a_event_stream_subscribe',
	) as A2AMcpTool | undefined;
	const outboxTool = tools.find((t) => t.name === 'a2a_outbox_sync') as
		| A2AMcpTool
		| undefined;

	if (!queueTool || !subscribeTool || !outboxTool) {
		throw new Error('Required tools not found');
	}

	console.log('--- Step 1: Queue Message ---');
	const queueResult = await queueTool.handler({
		message: {
			role: 'user',
			parts: [{ text: 'Hello task queue (composite)!' }],
		},
	});
	console.log(queueResult.content[0].text);

	console.log('\n--- Step 2: Event Stream Subscribe (Snapshot) ---');
	const subResult = await subscribeTool.handler({ includeCurrent: true });
	console.log(subResult.content[0].text);

	console.log('\n--- Step 3: Outbox Sync (dlqStats) ---');
	const outboxResult = await outboxTool.handler({ action: 'dlqStats' });
	console.log(outboxResult.content[0].text);

	console.log('\nComposite sequence complete.');
}

main().catch((err) => {
	console.error('Composite example failed:', err);
	process.exit(1);
});
