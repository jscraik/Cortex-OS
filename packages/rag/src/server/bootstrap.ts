import { Qwen3Presets } from '../embed/qwen3.js';
import type { Store } from '../lib/index.js';
import { memoryStore } from '../store/memory.js';
import { PgVectorStore } from '../store/pgvector-store.js';
import {
    createEmbedderHealthCheck,
    createPgvectorHealthCheck,
    createRerankerHealthCheck,
} from './health-checks.js';
import { HealthProvider } from './health-provider.js';
import { createHealthServer } from './health-server.js';

export interface StartHealthOptions {
    host?: string;
    port?: number;
    pathBase?: string;
    // Provide existing instances or let defaults be created
    embedder?: { embed(queries: string[]): Promise<number[][]> };
    store?: Store | PgVectorStore;
    rerankerIsReady?: () => Promise<boolean> | boolean;
}

/**
 * Starts a health HTTP server with component checks wired in.
 * Defaults:
 * - Embedder: Qwen3Presets.development()
 * - Store: PgVectorStore if PG_URL/DATABASE_URL present, else in-memory store
 * - Reranker readiness: reports true unless provided
 */
export async function startRagHealthServer(opts: StartHealthOptions = {}) {
    const host = opts.host ?? '127.0.0.1';
    const port = opts.port ?? 8080;
    const pathBase = opts.pathBase;

    const embedder = opts.embedder ?? Qwen3Presets.development();
    let store: Store | PgVectorStore | undefined = opts.store;
    if (!store) {
        const hasPg = !!(process.env.PG_URL || process.env.DATABASE_URL);
        if (hasPg) {
            store = new PgVectorStore({});
            if (store && typeof (store as PgVectorStore).init === 'function')
                await (store as PgVectorStore).init();
        } else {
            store = memoryStore();
        }
    }

    const checks = async () => ({
        ...(await createEmbedderHealthCheck(embedder)()),
        ...(await createPgvectorHealthCheck(
            store as unknown as Store & {
                init?: () => Promise<void>;
                health?: () => Promise<{ ok: boolean }>;
            },
        )()),
        ...(await createRerankerHealthCheck({
            isReady: async () => (opts.rerankerIsReady ? await opts.rerankerIsReady() : true),
        })()),
    });

    const provider = new HealthProvider({ extraChecks: checks });
    const { server, listen, close } = createHealthServer(provider, { host, port, pathBase });
    const addr = await listen();
    return { server, address: addr, close };
}
