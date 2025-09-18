import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SubagentLoader } from '../src/subagents/loader';

const tmp = async () =>
	await fsp.mkdtemp(path.join(os.tmpdir(), 'cortex-subagents-'));

describe('SubagentLoader', () => {
	let dir: string;

	beforeAll(async () => {
		dir = await tmp();
		const yaml = `
version: '1'
subagent:
  name: code-analysis
  description: Code analysis subagent
  scope: project
  allowed_tools: ["agent.*"]
  max_recursion: 2
`;
		const md = `---
name: docs
description: Documentation subagent
scope: project
allowed_tools:
  - write*
max_recursion: 1
---
Content here
`;

		await fsp.writeFile(
			path.join(dir, 'code-analysis.subagent.yaml'),
			yaml,
			'utf8',
		);
		await fsp.writeFile(path.join(dir, 'docs.subagent.md'), md, 'utf8');
	});

	afterAll(async () => {
		await fsp.rm(dir, { recursive: true, force: true });
	});

	it('loads YAML and Markdown subagent files', async () => {
		// Use the actual subagent directory we created
		const actualSubagentDir = path.join(__dirname, '..', 'subagents');
		const loader = new SubagentLoader({ searchPaths: [actualSubagentDir, dir] });
		const map = await loader.loadAll();
		expect(map.size).toBe(2);
		const code = map.get('code-analysis');
		const docs = map.get('docs');
		expect(code?.name).toBe('code-analysis');
		expect(docs?.name).toBe('docs');
	});
});
