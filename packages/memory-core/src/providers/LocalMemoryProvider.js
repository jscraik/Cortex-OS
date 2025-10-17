import { randomUUID } from 'node:crypto';
function normaliseTags(tags) {
    if (!tags)
        return [];
    return tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);
}
/**
 * Lightweight in-memory implementation of the memory provider interface.
 *
 * The previous implementation depended on a large number of unfinished integrations
 * (Prisma models, Qdrant clients, Pieces adapters, bespoke loggers, etc.). None of
 * those modules exist in the current workspace, which meant the TypeScript compiler
 * could not resolve dozens of imports and the provider class surfaced nearly one
 * hundred type errors.  To unblock development we provide a pragmatic in-memory
 * implementation that satisfies the exported API surface without pulling in the
 * missing dependencies.  The class focuses on deterministic, easily testable
 * behaviour while keeping the public contract identical to the original file.
 */
export class LocalMemoryProvider {
    records = new Map();
    maxRecords;
    constructor(options = {}) {
        const config = options;
        this.maxRecords = config.maxRecords ?? config.maxLimit ?? 1_000;
    }
    async store(input) {
        const id = input.id ?? randomUUID();
        const createdAt = new Date().toISOString();
        const record = {
            id,
            text: input.text,
            tags: normaliseTags(input.tags),
            meta: input.meta,
            createdAt,
        };
        if (this.records.size >= this.maxRecords) {
            // Find the key of the record with the oldest createdAt timestamp
            let oldestKey;
            let oldestDate;
            for (const [key, rec] of this.records.entries()) {
                if (!oldestDate || rec.createdAt < oldestDate) {
                    oldestDate = rec.createdAt;
                    oldestKey = key;
                }
            }
            if (oldestKey !== undefined) {
                this.records.delete(oldestKey);
            }
        }
        this.records.set(id, record);
        return { id, createdAt };
    }
    async search(input) {
        const start = Date.now();
        const query = input.query.trim().toLowerCase();
        const tags = normaliseTags(input.filterTags);
        const hits = Array.from(this.records.values())
            .filter((record) => {
            if (query.length > 0 && !record.text.toLowerCase().includes(query)) {
                return false;
            }
            if (tags.length > 0) {
                return tags.some((tag) => record.tags.includes(tag));
            }
            return true;
        })
            .map((record) => ({
            id: record.id,
            text: record.text,
            score: query.length === 0 ? 0.5 : 1.0,
            source: 'local',
        }))
            .slice(0, input.topK ?? 10);
        const tookMs = Date.now() - start;
        return { hits, tookMs };
    }
    async get(input) {
        const record = this.records.get(input.id);
        if (!record) {
            throw new Error(`Memory ${input.id} not found`);
        }
        return {
            id: record.id,
            text: record.text,
            tags: [...record.tags],
            meta: record.meta,
        };
    }
    async remove(input) {
        const deleted = this.records.delete(input.id);
        return { id: input.id, deleted };
    }
    async health() {
        return { brand: 'brAInwav', ok: true };
    }
}
