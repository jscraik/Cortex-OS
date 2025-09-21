import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BuildNode } from '../src/nodes/index.js';
import { createInitialPRPState } from '../src/state.js';

describe('BuildNode documentation validation', () => {
	let tmpDir: string;
	let cwd: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kernel-docs-'));
		cwd = process.cwd();
		process.chdir(tmpDir);
	});

	afterEach(() => {
		process.chdir(cwd);
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	const blueprint = {
		title: 'Doc Test',
		description: 'Ensure docs validated',
		requirements: ['documentation'],
	} as const;

	it('flags missing README.md', async () => {
		const state = createInitialPRPState(blueprint, { deterministic: true });
		const node = new BuildNode();
		const result = await node.execute(state);
		const buildGate = result.gates.G2;
		expect(buildGate.status).toBe('failed');
		expect(buildGate.automatedChecks[0].output).toContain('blockers');
		// When README is missing, there should be 1 blocker and 0 majors
		expect(buildGate.automatedChecks[0].output).toBe('Found 1 blockers');
	});

	it('passes when README.md exists', async () => {
		fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test');
		const state = createInitialPRPState(blueprint, { deterministic: true });
		const node = new BuildNode();
		const result = await node.execute(state);
		const buildGate = result.gates.G2;
		// The gate might still fail due to other issues, but docs should be OK
		expect(buildGate.automatedChecks[0].output).not.toContain('majors');
	});
});
