const { describe, it, expect } = require('vitest');
const { mkdtemp, writeFile, rm, readdir, mkdir } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { syncAllDocs } = require('../sync-docs');

describe('docs sync dry-run integration (js)', () => {
	it('skips writes in dry-run and respects base-file skip (rag)', async () => {
		const tmp = await mkdtemp(join(tmpdir(), 'sync-docs-'));
		try {
			const websiteDir = tmp; // pretend this is website root
			const docsDir = join(websiteDir, 'docs', 'packages', 'rag');
			await mkdir(docsDir, { recursive: true });
			await writeFile(join(docsDir, 'index.md'), '# Existing Index');

			const rootDir = join(tmp, 'root');
			const sourceDir = join(rootDir, 'packages', 'rag', 'docs');
			await mkdir(sourceDir, { recursive: true });
			// Create both rag.md and README.md to trigger collision rules
			await writeFile(join(sourceDir, 'rag.md'), '# Rag base');
			await writeFile(join(sourceDir, 'README.md'), '# Readme');

			const origWebsite = process.env.DOCS_WEBSITE_DIR;
			const origRoot = process.env.DOCS_ROOT_DIR;
			try {
				process.env.DOCS_WEBSITE_DIR = websiteDir;
				process.env.DOCS_ROOT_DIR = rootDir;
				await syncAllDocs({ dryRun: true });
			} finally {
				process.env.DOCS_WEBSITE_DIR = origWebsite;
				process.env.DOCS_ROOT_DIR = origRoot;
			}

			const filesAtRoot = await readdir(websiteDir).catch(() => []);
			expect(filesAtRoot.includes('sidebars.ts')).toBe(false);

			const targetFiles = await readdir(docsDir);
			expect(targetFiles).toContain('index.md');
			// In dry-run, no new files should be written regardless
			expect(targetFiles).not.toContain('rag.md');
			expect(targetFiles).not.toContain('README.md');
		} finally {
			await rm(tmp, { recursive: true, force: true });
		}
	});
});
