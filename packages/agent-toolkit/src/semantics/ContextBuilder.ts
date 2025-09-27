import { readFile } from 'node:fs/promises';
import { createTokenBudget, type TokenBudget, type TokenizedItem } from '../session/TokenBudget.js';
import { type Chunk, type ChunkOptions, chunkText } from './SemanticChunker.js';
import { createTreeSitterProvider } from './TreeSitterBoundary.js';

export type BuildContextOptions = {
	files: string[];
	language?: ChunkOptions['language'];
	maxChunkChars?: number;
	overlap?: number;
	tokenBudget?: { maxTokens: number; trimToTokens?: number };
	tokenize?: (text: string) => number; // returns token count
	useTreeSitter?: boolean; // feature flag
};

export type ChunkedContext = {
	chunks: Array<Chunk & { tokens: number; file: string }>;
	totalTokens: number;
};

const defaultTokenize = (text: string): number => Math.ceil(text.length / 4); // rough heuristic

export async function buildChunkedContext(opts: BuildContextOptions): Promise<ChunkedContext> {
	const tokenize = opts.tokenize ?? defaultTokenize;
	const boundaryProvider = await resolveBoundaryProvider(opts.useTreeSitter);
	const chunks: Array<Chunk & { tokens: number; file: string }> = [];
	for (const file of opts.files) {
		const content = await safeRead(file);
		const cs = chunkText(content, {
			language: opts.language ?? inferLanguage(file),
			maxChunkChars: opts.maxChunkChars ?? 2000,
			overlap: opts.overlap ?? 120,
			boundaryProvider,
		});
		for (const c of cs) chunks.push({ ...c, tokens: tokenize(c.text), file });
	}
	const totalTokens = sumTokens(chunks);
	if (!opts.tokenBudget) return { chunks, totalTokens };
	return pruneToBudget(chunks, opts.tokenBudget);
}

async function resolveBoundaryProvider(useTs?: boolean): Promise<ChunkOptions['boundaryProvider']> {
	if (!useTs) return undefined;
	const provider = await createTreeSitterProvider();
	if (!provider) return undefined;
	return (source, language) => provider.findBoundaries(source, language).map((b) => b.start);
}

async function safeRead(path: string): Promise<string> {
	try {
		return await readFile(path, 'utf8');
	} catch {
		return '';
	}
}

function inferLanguage(file: string): ChunkOptions['language'] {
	if (
		file.endsWith('.ts') ||
		file.endsWith('.tsx') ||
		file.endsWith('.js') ||
		file.endsWith('.jsx')
	)
		return 'ts';
	if (file.endsWith('.py')) return 'python';
	if (file.endsWith('.go')) return 'go';
	if (file.endsWith('.java')) return 'java';
	if (file.endsWith('.cs') || file.endsWith('.csx')) return 'csharp';
	return 'any';
}

function sumTokens(chunks: Array<{ tokens: number }>): number {
	let t = 0;
	for (const c of chunks) t += c.tokens;
	return t;
}

function pruneToBudget(
	chunks: Array<Chunk & { tokens: number; file: string }>,
	budgetCfg: { maxTokens: number; trimToTokens?: number },
): ChunkedContext {
	const budget: TokenBudget = createTokenBudget(budgetCfg);
	const items: TokenizedItem[] = chunks.map((c, i) => ({
		id: `${c.file}:${c.start}-${c.end}:${i}`,
		tokens: c.tokens,
		createdAt: i,
	}));
	if (!budget.needsPrune(items)) return { chunks, totalTokens: budget.getTotalTokens(items) };
	const prunedItems = budget.prune(items);
	const keep = new Set(prunedItems.map((it) => it.id));
	const prunedChunks = chunks.filter((c, i) => keep.has(`${c.file}:${c.start}-${c.end}:${i}`));
	return { chunks: prunedChunks, totalTokens: sumTokens(prunedChunks) };
}
