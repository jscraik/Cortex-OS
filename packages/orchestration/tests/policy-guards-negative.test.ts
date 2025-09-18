import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../src/langgraph/create-cerebrum-graph.js';

// Negative test: override persona path to a minimal YAML missing a11y/security

const BAD_YAML = `
name: test
policies:
  - id: p1
    description: "random: not relevant"
`;

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Policy guard enforcement (negative)', () => {
	it('fails when persona lacks required WCAG/security', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'persona-'));
		const fp = join(dir, 'bad.yaml');
		writeFileSync(fp, BAD_YAML, 'utf8');
		process.env.CORTEX_PERSONA_PATH = fp;
		const graph = createCerebrumGraph();
		await expect(graph.invoke({ input: 'x' })).rejects.toThrow(
			/Policy guard failed/,
		);
		delete process.env.CORTEX_PERSONA_PATH;
	});
});
