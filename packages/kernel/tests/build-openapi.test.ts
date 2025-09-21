import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BuildNode } from '../src/nodes/build.js';
import { createInitialPRPState } from '../src/state.js';

describe('BuildNode API schema validation', () => {
	let tmpDir: string;
	let cwd: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kernel-api-'));
		cwd = process.cwd();
		process.chdir(tmpDir);
	});

	afterEach(() => {
		process.chdir(cwd);
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	const blueprint = {
		title: 'API Test',
		description: 'Ensure API schema validated',
		requirements: ['API endpoint'],
	} as const;

	it('flags missing openapi.yaml', async () => {
		const state = createInitialPRPState(blueprint, { deterministic: true });
		const node = new BuildNode();
		const result = await node.execute(state);
		expect(result.gates.G2?.status).toBe('failed');
		const checkOutput = result.gates.G2?.automatedChecks[0]?.output || '';
		expect(checkOutput).toContain('blockers');
	});

	it('passes when openapi.yaml exists', async () => {
		fs.writeFileSync(
			path.join(tmpDir, 'openapi.yaml'),
			'openapi: 3.0.0\ninfo:\n  title: API\n  version: 1.0.0',
		);
		const state = createInitialPRPState(blueprint, { deterministic: true });
		const node = new BuildNode();
		const result = await node.execute(state);
		// When openapi.yaml exists, there should be fewer blockers
		const checkOutput = result.gates.G2?.automatedChecks[0]?.output || '';
		expect(checkOutput).not.toContain('2 blockers');
	});
});
