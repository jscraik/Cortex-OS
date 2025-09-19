import { describe, expect, it } from 'vitest';
import {
	AgentConfigurationSchema,
	AgentErrorSchema,
	AgentPoolSchema,
	AgentStateSchema,
	ExecutionResultSchema,
	MasterAgentLoopSchema,
	RecoveryActionSchema,
} from '../src/orchestration-no/master-agent-loop.js';

describe('contract: MasterAgentLoop', () => {
	it('exposes schemas for agent coordination and persistence', () => {
		const config = { name: 'test', maxConcurrency: 1 };
		const error = { code: 'E_FAIL', message: 'boom' };
		const result = { success: false };

		const parsedConfig = AgentConfigurationSchema.safeParse(config);
		const parsedPool = AgentPoolSchema.safeParse({
			agents: [{ id: 'a1', state: { status: 'idle' } }],
		});
		const parsedState = AgentStateSchema.safeParse({ status: 'idle' });
		const parsedError = AgentErrorSchema.safeParse(error);
		const parsedRecovery = RecoveryActionSchema.safeParse({ type: 'retry', reason: 'transient' });
		const parsedResult = ExecutionResultSchema.safeParse(result);
		expect(parsedConfig.success).toBe(true);
		expect(parsedPool.success).toBe(true);
		expect(parsedState.success).toBe(true);
		expect(parsedError.success).toBe(true);
		expect(parsedRecovery.success).toBe(true);
		expect(parsedResult.success).toBe(true);
		expect(MasterAgentLoopSchema).toBeDefined();
		expect(RecoveryActionSchema).toBeDefined();
	});
});
