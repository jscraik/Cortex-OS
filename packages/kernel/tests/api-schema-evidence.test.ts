import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BuildNode } from '../src/nodes/build.js';
import { createInitialPRPState } from '../src/state.js';

describe('BuildNode API schema validation', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('records evidence when schema is missing', async () => {
		const accessSpy = vi.spyOn(fs.promises, 'access').mockRejectedValue(new Error('not found'));

		const blueprint = {
			title: 'API Test',
			description: 'Has API',
			requirements: ['REST API'],
		} as const;

		const state = createInitialPRPState(blueprint, { deterministic: true });
		const node = new BuildNode();
		const result = await node.execute(state);

		expect(accessSpy).toHaveBeenCalled();

		expect(result.gates.G2?.status).toBe('failed');
		const checkOutput = result.gates.G2?.automatedChecks[0]?.output || '';
		expect(checkOutput).toContain('blockers');

		const apiEvidence = result.evidence.find((e) => e.source === 'api_schema_validation');
		expect(apiEvidence).toBeDefined();

		const content = JSON.parse(apiEvidence?.content);
		expect(content.passed).toBe(false);
		expect(content.details.validation).toBe('missing');
	});
});
