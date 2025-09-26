import { describe, expect, it, vi } from 'vitest';
import { simulateToolExecution } from '../src/master-agent-loop/tool-orchestration-utils.js';
import type {
	ExecutionContext,
	ToolDefinition,
} from '../src/master-agent-loop/tool-orchestration-contracts.js';

describe('Tool orchestration metrics integrity', () => {
	it('should not depend on Math.random for execution telemetry', async () => {
		const tool: ToolDefinition = {
			id: 'tool-1',
			layer: 'primitive',
			operation: 'mock-operation',
			dependencies: [],
			parallelizable: false,
			cacheable: false,
			retryable: false,
			optimizable: false,
			parameters: {},
		};

		const context: ExecutionContext = {
			chainId: 'chain-1',
			executionId: 'exec-1',
			securityLevel: 'medium',
			startTime: new Date(),
			timeout: 1000,
			variables: {},
			telemetry: {},
			debugging: false,
		};

		const randomSpy = vi.spyOn(Math, 'random');

		await simulateToolExecution(tool, context);

		expect(randomSpy).not.toHaveBeenCalled();
	});
});
