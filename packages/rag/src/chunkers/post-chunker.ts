export interface PostChunkingOptions {
    enabled?: boolean;
    maxChars?: number; // merge chunks up to this size
    intentStrategy?: 'none' | 'stub';
}

export interface PostChunk {
    id: string;
    text: string;
    metadata?: Record<string, unknown>;
}

export const defaultPostChunkingOptions: Required<Omit<PostChunkingOptions, 'intentStrategy'>> & {
    intentStrategy: 'none' | 'stub';
} = {
    enabled: false,
    maxChars: 1200,
    intentStrategy: 'none',
};

function maybeClassifyIntent(_query: string, _chunks: PostChunk[], mode: 'none' | 'stub'): string {
    if (mode === 'stub') return 'generic';
    return 'none';
}

export function postChunk(
    chunks: PostChunk[],
    query: string,
    opts?: PostChunkingOptions,
): PostChunk[] {
    const cfg = { ...defaultPostChunkingOptions, ...(opts || {}) };
    if (!cfg.enabled || !chunks.length) return chunks;
    // Intent classification stub (future: route merge/windowing by intent)
    const intent = maybeClassifyIntent(query, chunks, cfg.intentStrategy);
    const out: PostChunk[] = [];
    let buf = '';
    let start = 0;
    for (let i = 0; i < chunks.length; i++) {
        const t = chunks[i].text;
        if (buf.length && buf.length + 1 + t.length > cfg.maxChars) {
            out.push({ id: `merge-${start}-${i - 1}`, text: buf, metadata: { intent } });
            buf = t;
            start = i;
        } else {
            buf = buf ? `${buf}\n${t}` : t;
        }
    }
    if (buf) out.push({ id: `merge-${start}-${chunks.length - 1}`, text: buf, metadata: { intent } });
    return out;
}
