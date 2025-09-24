export type Chunk = {
  text: string;
  start: number; // inclusive char index
  end: number; // exclusive char index
};

export type ChunkOptions = {
  maxChunkChars?: number; // hard cap per chunk
  overlap?: number; // characters of backward overlap between consecutive chunks
  language?: 'js' | 'ts' | 'python' | 'go' | 'java' | 'csharp' | 'any';
  // Optional external boundary provider (e.g., Tree-sitter)
  boundaryProvider?: (source: string, language: NonNullable<ChunkOptions['language']>) => number[];
};

const DEFAULT_MAX = 2000;
const DEFAULT_OVERLAP = 120;

export const createSemanticChunker = () => ({
  chunkText,
});

export function chunkText(source: string, opts: ChunkOptions = {}): Chunk[] {
  if (!source || source.length === 0) return [];
  const max = Math.max(1, opts.maxChunkChars ?? DEFAULT_MAX);
  const overlap = Math.max(0, opts.overlap ?? DEFAULT_OVERLAP);
  const lang = (opts.language ?? 'any') as NonNullable<ChunkOptions['language']>;

  const fromHeuristics = findHeuristicBoundaries(source, lang);
  const fromProvider = collectProviderBoundaries(source, lang, opts.boundaryProvider);
  const boundaries = mergeBoundaries(fromHeuristics, fromProvider);
  const coarse =
    boundaries.length > 0 ? sliceByBoundaries(source, boundaries, max) : sliceBySize(source, max);
  return applyOverlap(source, coarse, overlap);
}

function findHeuristicBoundaries(
  source: string,
  lang: NonNullable<ChunkOptions['language']>,
): number[] {
  const lines = source.split(/\r?\n/);
  const idxs: number[] = [];
  let pos = 0;
  for (const line of lines) {
    if (isBoundary(line, lang)) idxs.push(pos);
    pos += line.length + 1; // include newline
  }
  // Always include start as a boundary to ensure first segment begins at 0
  if (idxs[0] !== 0) idxs.unshift(0);
  return uniqSorted(idxs);
}

function collectProviderBoundaries(
  source: string,
  lang: NonNullable<ChunkOptions['language']>,
  provider?: (s: string, l: NonNullable<ChunkOptions['language']>) => number[],
): number[] {
  try {
    if (!provider) return [];
    const out = provider(source, lang);
    return Array.isArray(out)
      ? out.filter((n) => Number.isFinite(n) && n >= 0 && n < source.length)
      : [];
  } catch {
    return [];
  }
}

function mergeBoundaries(a: number[], b: number[]): number[] {
  if (b.length === 0) return a;
  return uniqSorted([...a, ...b]);
}

function isBoundary(line: string, lang: NonNullable<ChunkOptions['language']>): boolean {
  const t = line.trim();
  if (t.length === 0) return false;
  return (
    isJsTsBoundary(t, lang) ||
    isPythonBoundary(t, lang) ||
    isGoBoundary(t, lang) ||
    isJavaBoundary(t, lang) ||
    isCSharpBoundary(t, lang)
  );
}

function isJsTsBoundary(t: string, lang: NonNullable<ChunkOptions['language']>): boolean {
  if (!(lang === 'js' || lang === 'ts' || lang === 'any')) return false;
  if (/^(export\s+)?(async\s+)?function\s+\w+\s*\(/.test(t)) return true;
  if (/^(export\s+)?(const|let|var)\s+\w+\s*=\s*\(/.test(t)) return true; // fn expr
  if (/^(export\s+)?class\s+\w+/.test(t)) return true;
  return false;
}

function isPythonBoundary(t: string, lang: NonNullable<ChunkOptions['language']>): boolean {
  if (!(lang === 'python' || lang === 'any')) return false;
  return /^(def|class)\s+\w+\s*\(/.test(t);
}

function isGoBoundary(t: string, lang: NonNullable<ChunkOptions['language']>): boolean {
  if (!(lang === 'go' || lang === 'any')) return false;
  if (/^func\s+\w+\s*\(/.test(t)) return true;
  if (/^type\s+\w+\s+struct\b/.test(t)) return true;
  return false;
}

function isJavaBoundary(t: string, lang: NonNullable<ChunkOptions['language']>): boolean {
  if (!(lang === 'java' || lang === 'any')) return false;
  if (/^(public|private|protected)?\s*(class|interface|enum)\s+\w+/.test(t)) return true;
  if (/^(public|private|protected)?\s*(static\s+)?[\w<>[\]]+\s+\w+\s*\(/.test(t)) return true;
  return false;
}

function isCSharpBoundary(t: string, lang: NonNullable<ChunkOptions['language']>): boolean {
  if (!(lang === 'csharp' || lang === 'any')) return false;
  if (/^(public|private|protected|internal)\s*(class|interface|enum|struct)\s+\w+/.test(t))
    return true;
  if (/^(public|private|protected|internal)\s*(static\s+)?[\w<>[\]]+\s+\w+\s*\(/.test(t))
    return true;
  return false;
}

function sliceByBoundaries(source: string, starts: number[], max: number): Chunk[] {
  const chunks: Chunk[] = [];
  const ends = [...starts.slice(1), source.length];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const e = ends[i];
    appendSized(chunks, source, s, e, max);
  }
  return chunks;
}

function sliceBySize(source: string, max: number): Chunk[] {
  const chunks: Chunk[] = [];
  let s = 0;
  while (s < source.length) {
    const e = Math.min(source.length, s + max);
    chunks.push({ text: source.slice(s, e), start: s, end: e });
    s = e;
  }
  return chunks;
}

function appendSized(out: Chunk[], source: string, s: number, e: number, max: number): void {
  const span = e - s;
  if (span <= max) {
    out.push({ text: source.slice(s, e), start: s, end: e });
    return;
  }
  // Internal split: try paragraph/blank-line boundaries first
  const mid = s + Math.floor(span / 2);
  const split = nearestSplit(source, s, e, mid) ?? s + max;
  const clamped = Math.min(Math.max(split, s + 1), e - 1);
  appendSized(out, source, s, clamped, max);
  appendSized(out, source, clamped, e, max);
}

function nearestSplit(source: string, s: number, e: number, hint: number): number | null {
  // Prefer double newline
  const before = source.lastIndexOf('\n\n', hint);
  if (before > s) return before + 2; // after the blank line
  const after = source.indexOf('\n\n', hint);
  if (after !== -1 && after < e) return after + 2;
  // Else single newline near hint
  const nlBefore = source.lastIndexOf('\n', hint);
  if (nlBefore > s) return nlBefore + 1;
  const nlAfter = source.indexOf('\n', hint);
  if (nlAfter !== -1 && nlAfter < e) return nlAfter + 1;
  return null;
}

function applyOverlap(source: string, chunks: Chunk[], overlap: number): Chunk[] {
  if (chunks.length <= 1 || overlap <= 0) return chunks;
  const overlapped: Chunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (i === 0) {
      overlapped.push(c);
      continue;
    }
    const start = Math.max(0, c.start - overlap);
    const text = source.slice(start, c.end);
    overlapped.push({ text, start, end: c.end });
  }
  return overlapped;
}

function uniqSorted(nums: number[]): number[] {
  const out: number[] = [];
  const sorted = [...nums].sort((a, b) => a - b);
  for (const n of sorted) if (out[out.length - 1] !== n) out.push(n);
  return out;
}
