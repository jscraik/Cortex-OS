#!/usr/bin/env tsx

// Clean documentation sync for Cortex-OS with pure dry-run support
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type SanitizationReport, sanitizeMdxContent } from './src/sanitize-mdx.js';

// Paths/utilities
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WEBSITE_DIR = (process.env.DOCS_WEBSITE_DIR as string) || __dirname;
const ROOT_DIR = (process.env.DOCS_ROOT_DIR as string) || dirname(WEBSITE_DIR);
const DOCS_DIR = join(WEBSITE_DIR, 'docs');
const info = (...a: unknown[]): void => console.info('[sync-docs]', ...a);
const warn = (...a: unknown[]): void => console.warn('[sync-docs]', ...a);

// FS helpers
const ensureDir = async (p: string, opts?: { dryRun?: boolean }): Promise<void> => {
	if (opts?.dryRun) return;
	await fs.mkdir(p, { recursive: true });
};
const isMarkdown = (n: string): boolean => /\.(md|mdx)$/i.test(n);

// Reference link normalization
const REFERENCE_LINK_MAP: Record<string, string> = {
	'../../contributing.md': '/docs/references/contributing',
	'../../security.md': '/docs/references/security',
	'../../code_of_conduct.md': '/docs/references/code-of-conduct',
};
const normalizeReferenceLinks = (s: string): string =>
	s
		.replace(/\((\.\.\/\.\.\/[A-Z_]+\.MD)\)/gi, (m) => m.toLowerCase())
		.replace(
			/\((\.\.\/\.\.\/[a-z0-9_-]+\.md)\)/gi,
			(_m, p1) => `(${REFERENCE_LINK_MAP[String(p1)] ?? String(p1)})`,
		);

// Frontmatter helpers
const titleFromFilename = (filename: string, displayName: string): string =>
	filename === 'README.md'
		? displayName
		: filename
				.replace(/\.md$/, '')
				.replace(/-/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase());
const createFrontmatter = (filename: string, displayName: string): string =>
	`---\ntitle: ${titleFromFilename(filename, displayName)}\nsidebar_label: ${titleFromFilename(filename, displayName)}\n---\n\n`;

// Slug helpers
const hasSlugCollision = (fileNames: string[], dirBase: string): boolean =>
	fileNames.includes('README.md') && fileNames.includes(`${dirBase}.md`);
type SkipParams = {
	entryName: string;
	dirBase: string;
	existingTargetFiles: string[];
	// Accept extra fields used by tests without affecting logic
	fileNames?: string[];
	collision?: boolean;
};
const shouldSkipBaseFile = (p: SkipParams): boolean => {
	const { entryName, dirBase, existingTargetFiles } = p;
	if (entryName === `${dirBase}.md` && existingTargetFiles.includes('index.md')) return true;
	if (existingTargetFiles.includes('index.md')) {
		const stem = entryName.replace(/\.md$/, '').toLowerCase();
		if (stem === dirBase.toLowerCase()) return true;
	}
	return false;
};

// File processing
const processMarkdownFile = async (
	sourcePath: string,
	targetPath: string,
	filename: string,
	displayName: string,
	opts?: { dryRun?: boolean },
): Promise<{ report?: SanitizationReport }> => {
	let content = await fs.readFile(sourcePath, 'utf8');
	const before = content;
	content = sanitizeMdxContent(content);
	if (!content.startsWith('---')) content = createFrontmatter(filename, displayName) + content;
	content = normalizeReferenceLinks(content);
	if (!opts?.dryRun) await fs.writeFile(targetPath, content);
	const report: SanitizationReport = {
		fencesRepaired:
			(before.match(/``[^`]/g) || []).length - (content.match(/``[^`]/g) || []).length,
		genericsEscaped: (before.match(/\w+<[^>]+>/g) || []).filter((m) => !content.includes(m)).length,
		pseudoJsxEscaped: (before.match(/<[^>]*\/?>/g) || []).filter((m) => !content.includes(m))
			.length,
		htmlTagsEscaped: 0,
		spuriousFencesRepaired: 0,
		totalChanges: 0,
	};
	report.totalChanges = report.fencesRepaired + report.genericsEscaped + report.pseudoJsxEscaped;
	return { report };
};

// Single-file handler (used in tests)
const handleDocEntry = async (params: {
	entryName: string;
	sourceDocsDir: string;
	targetDir: string;
	displayName: string;
	collision: boolean;
	dirBase: string;
	fileNames: string[];
	existingTargetFiles: string[];
	dryRun?: boolean;
}): Promise<boolean> => {
	const {
		entryName,
		sourceDocsDir,
		targetDir,
		displayName,
		collision,
		dirBase,
		fileNames,
		existingTargetFiles,
		dryRun,
	} = params;
	if (!isMarkdown(entryName)) return false;
	if (collision && entryName === `${dirBase}.md` && fileNames.includes('README.md')) return false;
	if (shouldSkipBaseFile({ entryName, dirBase, existingTargetFiles })) {
		if (!dryRun) await fs.unlink(join(targetDir, entryName)).catch(() => {});
		return false;
	}
	const sourcePath = join(sourceDocsDir, entryName);
	const targetPath = join(targetDir, entryName);
	await processMarkdownFile(sourcePath, targetPath, entryName, displayName, { dryRun });
	return true;
};

// Results
export type SyncResult = {
	success: boolean;
	packageName: string;
	fileCount: number;
	error?: string;
	report?: SanitizationReport;
};

// Internal helpers to keep complexity low
type ProcessFilesParams = {
	files: string[];
	sourceDir: string;
	targetDir: string;
	dirBase: string;
	displayName: string;
	existingTargetFiles: string[];
	dryRun?: boolean;
};
const aggregateReports = (
	aggregate: SanitizationReport | undefined,
	report?: SanitizationReport,
): SanitizationReport | undefined => {
	if (!report) return aggregate;
	if (!aggregate) return { ...report };
	aggregate.fencesRepaired += report.fencesRepaired;
	aggregate.genericsEscaped += report.genericsEscaped;
	aggregate.pseudoJsxEscaped += report.pseudoJsxEscaped;
	aggregate.totalChanges += report.totalChanges;
	return aggregate;
};
const processPackageFiles = async (
	p: ProcessFilesParams,
): Promise<{ count: number; aggregate?: SanitizationReport }> => {
	const { files, sourceDir, targetDir, dirBase, displayName, existingTargetFiles, dryRun } = p;
	const collision = hasSlugCollision(files, dirBase);
	let count = 0;
	let aggregate: SanitizationReport | undefined;
	for (const name of files) {
		if (collision && name === `${dirBase}.md` && files.includes('README.md')) {
			warn(`Skip ${name} (collision with README.md)`);
			continue;
		}
		if (shouldSkipBaseFile({ entryName: name, dirBase, existingTargetFiles })) {
			if (!dryRun) await fs.unlink(join(targetDir, name)).catch(() => {});
			continue;
		}
		const { report } = await processMarkdownFile(
			join(sourceDir, name),
			join(targetDir, name),
			name,
			displayName,
			{ dryRun },
		);
		count++;
		aggregate = aggregateReports(aggregate, report);
	}
	return { count, aggregate };
};

// Package/app sync
const syncPackageDocs = async (
	category: string,
	packageName: string,
	displayName: string,
	opts?: { dryRun?: boolean },
): Promise<SyncResult> => {
	const sourceDir = join(ROOT_DIR, category, packageName, 'docs');
	const targetDir = join(DOCS_DIR, category, packageName);
	const dirBase = packageName;
	try {
		await fs.access(sourceDir);
	} catch {
		return {
			success: false,
			packageName,
			fileCount: 0,
			error: `No docs for ${category}/${packageName}`,
		};
	}
	await ensureDir(targetDir, { dryRun: opts?.dryRun });
	const existingTargetFiles = await fs.readdir(targetDir).catch(() => [] as string[]);
	const entries = await fs.readdir(sourceDir, { withFileTypes: true });
	const files = entries.filter((e) => e.isFile() && isMarkdown(e.name)).map((e) => e.name);
	const { count, aggregate } = await processPackageFiles({
		files,
		sourceDir,
		targetDir,
		dirBase,
		displayName,
		existingTargetFiles,
		dryRun: opts?.dryRun,
	});
	return { success: true, packageName, fileCount: count, report: aggregate };
};

// Cortex docs sync
const syncCortexDocs = async (opts?: { dryRun?: boolean }): Promise<SyncResult> => {
	const sourceDir = join(ROOT_DIR, '.cortex', 'docs');
	const targetDir = join(DOCS_DIR, 'cortex');
	try {
		await fs.access(sourceDir);
	} catch {
		return { success: false, packageName: 'cortex', fileCount: 0, error: 'No cortex docs' };
	}
	await ensureDir(targetDir, { dryRun: opts?.dryRun });
	const entries = await fs.readdir(sourceDir, { withFileTypes: true });
	const files = entries.filter((e) => e.isFile() && isMarkdown(e.name)).map((e) => e.name);
	let count = 0;
	let aggregate: SanitizationReport | undefined;
	for (const name of files) {
		const { report } = await processMarkdownFile(
			join(sourceDir, name),
			join(targetDir, name),
			name,
			'Cortex Platform',
			{ dryRun: opts?.dryRun },
		);
		count++;
		aggregate = aggregateReports(aggregate, report);
	}
	return { success: true, packageName: 'cortex', fileCount: count, report: aggregate };
};

// Sidebar generation reflecting folder structure (autogenerated)
const writeSidebar = async (opts?: { dryRun?: boolean }): Promise<void> => {
	const content = `import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';\n\nconst sidebars: SidebarsConfig = {\n  tutorialSidebar: [{ type: 'autogenerated', dirName: '.' }],\n};\n\nexport default sidebars;\n`;
	if (!opts?.dryRun) await fs.writeFile(join(WEBSITE_DIR, 'sidebars.ts'), content);
};

// Orchestrator
export const DOCS_STRUCTURE: Record<string, Record<string, string>> = {
	apps: {
		'cortex-os': 'Core Runtime',
		'cortex-py': 'Python Integration',
		'cortex-webui': 'Web Interface',
		'cortex-marketplace': 'Marketplace',
	},
	packages: {
		a2a: 'A2A Event Bus',
		orchestration: 'Orchestration',
		memories: 'Memories',
		rag: 'RAG',
	},
	'.cortex': { platform: 'Cortex Platform' },
};

export const syncAllDocs = async (opts?: { dryRun?: boolean }): Promise<void> => {
	info('🚀 Start docs sync');
	await Promise.all([
		ensureDir(join(DOCS_DIR, 'apps'), { dryRun: opts?.dryRun }),
		ensureDir(join(DOCS_DIR, 'packages'), { dryRun: opts?.dryRun }),
		ensureDir(join(DOCS_DIR, 'cortex'), { dryRun: opts?.dryRun }),
	]);
	const results: SyncResult[] = [];
	for (const [category, pkgs] of Object.entries(DOCS_STRUCTURE)) {
		if (category === '.cortex') {
			results.push(await syncCortexDocs({ dryRun: opts?.dryRun }));
			continue;
		}
		for (const [pkg, display] of Object.entries(pkgs)) {
			results.push(await syncPackageDocs(category, pkg, display, { dryRun: opts?.dryRun }));
		}
	}
	await writeSidebar({ dryRun: opts?.dryRun });
	const ok = results.filter((r) => r.success);
	const total = ok.reduce((n, r) => n + r.fileCount, 0);
	info(`✅ Synced ${ok.length} groups (${total} files)`);
};

// CLI
const parseArgs = (): { dryRun: boolean } => ({
	dryRun: process.argv.slice(2).some((x) => x === '--check' || x === '--dry-run'),
});
if (import.meta.url === `file://${__filename}`) {
	const opts = parseArgs();
	if (opts.dryRun) info('🔍 Dry-run mode');
	syncAllDocs({ dryRun: opts.dryRun }).catch((e) => {
		console.error('❌ Sync failed:', e);
		process.exit(1);
	});
}

// Named exports only
export {
	createFrontmatter,
	handleDocEntry,
	hasSlugCollision,
	normalizeReferenceLinks,
	sanitizeMdxContent,
	shouldSkipBaseFile,
};
