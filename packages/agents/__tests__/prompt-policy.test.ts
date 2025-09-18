import { promises as fsp } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPromptInstructions } from '../src/utils/promptPolicy';

describe('Prompt Policy Builder', () => {
	it('builds a 10-block prompt with mandatory sections', () => {
		const prompt = buildPromptInstructions({
			blocks: {
				task: 'Do X',
				tone: 'Direct',
				request: 'Please do X',
				deliberation: 'reasoning_effort=low',
				output: 'Return JSON',
				rules: ['One', 'Two'],
				examples: ['Example A', 'Example B'],
			},
		});

		// Basic tags and ordering
		const idx1 = prompt.indexOf('[[1] Task context]');
		const idx2 = prompt.indexOf('[[2] Tone context]');
		const idx4 = prompt.indexOf('[[4] Rules]');
		const idx5 = prompt.indexOf('[[5] Examples]');
		const idx7 = prompt.indexOf('[[7] Immediate request]');
		const idx8 = prompt.indexOf('[[8] Deliberation]');
		const idx9 = prompt.indexOf('[[9] Output formatting]');

		expect(idx1).toBeGreaterThanOrEqual(0);
		expect(idx2).toBeGreaterThan(idx1);
		expect(idx4).toBeGreaterThan(idx2);
		expect(idx5).toBeGreaterThan(idx4);
		expect(idx7).toBeGreaterThan(idx2);
		expect(idx8).toBeGreaterThan(idx7);
		expect(idx9).toBeGreaterThan(idx8);

		// Formatting checks
		expect(prompt).toContain('[[4] Rules]');
		expect(prompt).toContain('- One');
		expect(prompt).toContain('- Two');
		expect(prompt).toContain('[[5] Examples]');
		expect(prompt).toContain('Example A');
		expect(prompt).toContain('---');
		expect(prompt).toContain('Example B');
	});

	it('enforces mandatory blocks', () => {
		expect(() =>
			buildPromptInstructions({
				blocks: {
					task: 'Do X',
					tone: 'Direct',
					request: 'Please do X',
					deliberation: 'reasoning_effort=low',
				},
			}),
		).toThrowError();
	});

	it('loads a YAML pack from packs directory', async () => {
		const tmpDir = path.join(process.cwd(), '.cortex', 'library', 'packs');
		await fsp.mkdir(tmpDir, { recursive: true });
		const yaml = `task: Test Task
tone: Direct
request: Do it
deliberation: reasoning_effort=low
output: Plain
`;
		await fsp.writeFile(path.join(tmpDir, 'testpack.yaml'), yaml, 'utf8');

		const prompt = buildPromptInstructions({
			packName: 'testpack',
			baseDir: tmpDir,
		});
		expect(prompt.includes('[[1] Task context]')).toBe(true);
		expect(prompt.includes('Test Task')).toBe(true);
	});
});
