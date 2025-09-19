import { describe, expect, it } from 'vitest';
import {
	AgentMessageSchema,
	AgentNetworkSchema,
	BroadcastMessageSchema,
	SubscriptionRequestSchema,
	UnsubscribeFnSchema,
} from '../src/orchestration-no/agent-network.js';

describe('contract: AgentNetwork', () => {
	it('declares messaging schemas for direct and broadcast communications', () => {
		const msg = { from: 'a1', to: 'a2', kind: 'text', payload: { text: 'hi' } };
		const bcast = { from: 'a1', topic: 'updates', payload: { x: 1 } };
		const sub = { topic: 'updates', agentId: 'a2' };

		expect(AgentMessageSchema.safeParse(msg).success).toBe(true);
		expect(BroadcastMessageSchema.safeParse(bcast).success).toBe(true);
		expect(SubscriptionRequestSchema.safeParse(sub).success).toBe(true);
		expect(AgentNetworkSchema).toBeDefined();
		expect(UnsubscribeFnSchema).toBeDefined();
		expect(AgentMessageSchema).toBeDefined();
		expect(BroadcastMessageSchema).toBeDefined();
	});
});
