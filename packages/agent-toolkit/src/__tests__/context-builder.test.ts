import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildChunkedContext } from '../semantics/ContextBuilder.js';
import { randomUUID } from 'node:crypto';

function makeTmpFile(content: string): string {
    const p = join(tmpdir(), `ctx-${Date.now()}-${randomUUID().slice(0, 8)}.txt`);
    writeFileSync(p, content, 'utf8');
    return p;
}

describe('ContextBuilder', () => {
    it('builds and prunes to token budget', async () => {
        const f = makeTmpFile('a'.repeat(1000));
        const ctx = await buildChunkedContext({
            files: [f],
            maxChunkChars: 200,
            overlap: 0,
            tokenize: (t) => Math.ceil(t.length / 10),
            tokenBudget: { maxTokens: 60, trimToTokens: 50 },
        });
        expect(ctx.totalTokens).toBeLessThanOrEqual(60);
        expect(ctx.chunks.length).toBeGreaterThan(0);
    });
});
