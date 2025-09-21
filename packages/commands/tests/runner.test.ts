import { describe, expect, it } from 'vitest';
import { renderTemplate } from '../src/runner.js';

describe('renderTemplate', () => {
	it('substitutes arguments', async () => {
		const tpl = 'Commit: $ARGUMENTS / $1';
		const out = await renderTemplate(tpl, ['fix: bug'], { cwd: process.cwd() });
		expect(out).toContain('fix: bug');
	});

	it('expands bash snippets when allowed', async () => {
		const tpl = 'Status: !`git status`';
		const out = await renderTemplate(
			tpl,
			[],
			{
				cwd: process.cwd(),
				runBashSafe: async (cmd) => ({ stdout: `OK:${cmd}`, stderr: '', code: 0 }),
			},
			['Bash(git status:*)'],
		);
		expect(out).toContain('OK:git status');
	});

	it('denies bash when not allowed', async () => {
		const tpl = 'Status: !`git status`';
		const out = await renderTemplate(tpl, [], { cwd: process.cwd() }, []);
		expect(out).toContain('<bash-denied:git status>');
	});

	it('includes files when allowed', async () => {
		const tpl = 'File: @README.md';
		const out = await renderTemplate(tpl, [], {
			cwd: process.cwd(),
			readFileCapped: async () => 'CONTENT',
			fileAllowlist: ['**/README.md'],
		});
		expect(out).toContain('CONTENT');
	});
});
