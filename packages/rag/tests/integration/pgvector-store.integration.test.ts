import { beforeAll, describe, expect, it } from 'vitest';
import { PgVectorStore } from '../../src/store/pgvector-store.js';

const PG_USER = process.env.PG_USER ?? 'cortex';
const PG_PASSWORD = process.env.PG_PASSWORD ?? 'cortexpw';
const PG_PORT = process.env.PG_PORT ?? '5433';
const PG_URL =
    process.env.PG_URL ?? `postgres://${PG_USER}:${PG_PASSWORD}@127.0.0.1:${PG_PORT}/rag`;

type TChunk = { id: string; text: string; embedding: number[]; metadata: Record<string, unknown> };

// Only run when explicitly enabled to ensure optional deps (pg, pgvector DB) exist
const RUN = process.env.PGVECTOR_TESTS === '1';
const describeIf = RUN ? describe : describe.skip;

describeIf('PgVectorStore integration', () => {
    beforeAll(async () => {
        const store = new PgVectorStore({
            connectionString: PG_URL,
            dimension: 768,
            hybrid: { enabled: false },
        });
        await store.init();
    }, 30_000);

    it('upserts and queries by vector-only', async () => {
        const store = new PgVectorStore({
            connectionString: PG_URL,
            dimension: 768,
            hybrid: { enabled: false },
        });
        await store.init();
        const chunks: TChunk[] = [
            {
                id: 'a',
                text: 'alpha beta',
                embedding: Array.from({ length: 768 }, (_, i) => (i === 0 ? 0.9 : 0)),
                metadata: { t: 'a' },
            },
            {
                id: 'b',
                text: 'beta gamma',
                embedding: Array.from({ length: 768 }, (_, i) => (i === 0 ? 0.89 : 0)),
                metadata: { t: 'b' },
            },
        ];
        await store.upsert(chunks);
        const res = await store.query(chunks[0].embedding, 2);
        expect(res.length).toBeGreaterThan(0);
        expect(res[0].id).toBe('a');
    }, 30_000);

    it('hybrid query fuses vector and keyword signals', async () => {
        const store = new PgVectorStore({
            connectionString: PG_URL,
            dimension: 768,
            hybrid: { enabled: true, vectorWeight: 0.6, language: 'english' },
        });
        await store.init();
        const chunks: TChunk[] = [
            {
                id: 'c',
                text: 'delta epsilon keywordx',
                embedding: Array.from({ length: 768 }, () => 0),
                metadata: { k: true },
            },
            {
                id: 'd',
                text: 'zeta eta keywordx',
                embedding: Array.from({ length: 768 }, () => 0),
                metadata: { k: true },
            },
        ];
        await store.upsert(chunks);
        // With a keyword, hybrid should surface matching docs even with zero vector
        const res = await store.queryWithText(
            Array.from({ length: 768 }, () => 0),
            'keywordx',
            2,
        );
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBeGreaterThan(0);
        for (const r of res) {
            expect(r.text.includes('keywordx')).toBe(true);
        }
    }, 30_000);
});
