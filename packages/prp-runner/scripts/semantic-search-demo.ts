/**
 * @file scripts/semantic-search-demo.ts
 * @description Tiny CLI to ingest a directory of .md files and run a semantic query using the in-memory EmbeddingAdapter.
 * Runs with: pnpm nx run @cortex-os/prp-runner:demo:semsearch -- --dir ./docs --query "your question" --topK 5
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { glob } from 'glob';
import { createEmbeddingAdapter } from '../src/embedding-adapter.js';

type CLIArgs = {
	dir: string;
	query: string;
	topK: number;
};

function parseArgs(argv: string[]): CLIArgs {
	const args: Record<string, string> = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--dir' || a === '-d') {
			const next = argv[i + 1];
			if (next) {
				args.dir = next;
			}
		} else if (a === '--query' || a === '-q') {
			const next = argv[i + 1];
			if (next) {
				args.query = next;
			}
		} else if (a === '--topK' || a === '-k') {
			const next = argv[i + 1];
			if (next) {
				args.topK = next;
			}
		}
	}

	const dir = args.dir || './docs';
	const query = args.query || 'What is this project about?';
	const topK = Number(args.topK || 5);

	return { dir, query, topK } as CLIArgs;
}

type DocMeta = Record<string, unknown>;
async function loadMarkdownFiles(
	rootDir: string,
): Promise<{ id: string; text: string; metadata: DocMeta }[]> {
	const absoluteRoot = path.resolve(process.cwd(), rootDir);
	const patterns = ['**/*.md', '**/*.mdx', 'README.md'];
	const ignore = ['**/node_modules/**', '**/.git/**', '**/dist/**'];
	const files = (
		await Promise.all(patterns.map((p) => glob(p, { cwd: absoluteRoot, absolute: true, ignore })))
	).flat();

	const uniques = Array.from(new Set(files));
	const docs: { id: string; text: string; metadata: DocMeta }[] = [];
	for (const f of uniques) {
		try {
			const content = await readFile(f, 'utf8');
			if (!content.trim()) continue;
			docs.push({
				id: path.relative(absoluteRoot, f) || path.basename(f),
				text: content,
				metadata: { path: f },
			});
		} catch {
			// best-effort; skip unreadable files
		}
	}
	return docs;
}

async function main() {
	const { dir, query, topK } = parseArgs(process.argv.slice(2));

	console.log(chalk.cyan('\n📚 Semantic Search Demo'));
	console.log(`- Root: ${chalk.gray(process.cwd())}`);
	console.log(`- Directory: ${chalk.yellow(dir)}\n`);

	const docs = await loadMarkdownFiles(dir);
	if (docs.length === 0) {
		console.log(chalk.yellow('No markdown files found. Try --dir ./docs or another path.'));
		process.exit(0);
	}

	const adapter = createEmbeddingAdapter('local');
	await adapter.addDocuments(
		docs.map((d) => d.text),
		docs.map((d) => d.metadata),
		docs.map((d) => d.id),
	);

	const stats = adapter.getStats();
	console.log(chalk.green(`Indexed ${stats.totalDocuments} documents (dims=${stats.dimensions}).`));

	console.log(chalk.cyan(`\n🔎 Query:`), chalk.white(`"${query}"`));
	const results = await adapter.similaritySearch({ text: query, topK });

	if (results.length === 0) {
		console.log(chalk.yellow('No results.'));
	} else {
		console.log(chalk.magenta(`\nTop ${results.length} results:`));
		results.forEach((r, i) => {
			const preview = r.text.replace(/\s+/g, ' ').slice(0, 140);
			console.log(
				chalk.bold(`${i + 1}.`),
				chalk.blue(r.id),
				chalk.gray(`(sim=${r.similarity.toFixed(3)})`),
				'\n   ',
				preview,
				preview.length >= 140 ? '…' : '',
				'\n',
			);
		});
	}

	console.log(chalk.gray('Done.'));
}

main().catch((err) => {
	console.error(chalk.red('Error in semantic-search-demo:'), err);
	process.exit(1);
});
