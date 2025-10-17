import { createHash, randomUUID } from 'node:crypto';
import type {
        DeleteMemoryInput,
        DeleteMemoryResult,
        GetMemoryInput,
        GetMemoryResult,
        HealthStatus,
        MemoryProvider,
        SearchMemoryInput,
        SearchMemoryResult,
        StoreMemoryInput,
        StoreMemoryResult,
} from '../provider/MemoryProvider.js';
import type { MemoryCoreConfig } from '../types.js';

export interface LocalMemoryProviderOptions {
        /** Maximum number of records to retain in memory. */
        maxRecords?: number;
        maxLimit?: number;
}

interface MemoryRecord {
        id: string;
        text: string;
        tags: string[];
        meta: Record<string, unknown> & {
                labels?: string[];
                tenant?: string;
                sourceUri?: string;
                contentSha?: string;
        };
        createdAt: string;
        updatedAt: string;
        domain?: string;
        importance: number;
}

interface NormalisedConfig {
        maxRecords: number;
        defaultLimit: number;
        maxLimit: number;
        maxOffset: number;
        defaultThreshold: number;
        hybridWeight: number;
        queueConcurrency: number;
        embedDim: number;
        qdrant?: MemoryCoreConfig['qdrant'];
}

class TaskQueue {
        private running = 0;
        private readonly queue: Array<() => void> = [];

        constructor(private readonly concurrency: number) {}

        add<T>(task: () => Promise<T>): Promise<T> {
                return new Promise((resolve, reject) => {
                        const execute = () => {
                                this.running += 1;
                                Promise.resolve()
                                        .then(task)
                                        .then(resolve, reject)
                                        .finally(() => {
                                                this.running -= 1;
                                                this.dequeue();
                                        });
                        };

                        this.queue.push(execute);
                        this.dequeue();
                });
        }

        private dequeue() {
                if (this.running >= this.concurrency) {
                        return;
                }
                const next = this.queue.shift();
                if (next) {
                        next();
                }
        }
}

function normaliseTags(tags?: string[]): string[] {
        if (!Array.isArray(tags)) return [];
        return Array.from(
                new Set(
                        tags
                                .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
                                .filter((tag) => tag.length > 0),
                ),
        );
}

function normaliseLabels(labels?: unknown): string[] {
        if (!Array.isArray(labels)) return [];
        return Array.from(
                new Set(
                        (labels as unknown[])
                                .map((label) => (typeof label === 'string' ? label.trim() : ''))
                                .filter((label) => label.length > 0),
                ),
        );
}

function computeSha(text: string): string {
        return createHash('sha256').update(text, 'utf8').digest('hex');
}

function sanitiseContent(text: string): string {
        const patterns = [
                /sk-[0-9a-zA-Z_-]{8,}/g,
                /(api|access|secret)[-_ ]?(key|token)\s*[:=]\s*[^\s'"`]+/gi,
        ];
        return patterns.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), text);
}

type MetadataRecord = Record<string, unknown> & {
        labels?: string[];
        tenant?: string;
        sourceUri?: string;
        contentSha?: string;
};

function normaliseMetadata(
        meta?: Record<string, unknown>,
): MetadataRecord {
        if (!meta) return {} as MetadataRecord;
        const metadata = { ...(meta ?? {}) } as MetadataRecord;
        const labels = normaliseLabels(metadata.labels);
        if (labels.length > 0) {
                metadata.labels = labels;
        }
        if (typeof metadata.tenant === 'string') {
                metadata.tenant = metadata.tenant.trim();
        }
        if (typeof metadata.sourceUri === 'string') {
                metadata.sourceUri = metadata.sourceUri.trim();
        }
        return metadata;
}

function normaliseConfig(
        options: LocalMemoryProviderOptions | Partial<MemoryCoreConfig>,
): NormalisedConfig {
        const config = options as LocalMemoryProviderOptions & Partial<MemoryCoreConfig>;
        const maxLimit = Math.max(1, config.maxLimit ?? 100);
        const queueConcurrency = Math.max(1, Math.trunc(config.queueConcurrency ?? 0));
        const embedDimCandidate = config.qdrant?.embedDim ?? config.embedDim ?? 384;
        const embedDim = Math.min(Math.max(Math.trunc(embedDimCandidate), 1), 10_000);

        return {
                maxRecords: config.maxRecords ?? config.maxLimit ?? 1_000,
                defaultLimit: Math.max(1, config.defaultLimit ?? 10),
                maxLimit,
                maxOffset: Math.max(0, config.maxOffset ?? 1_000),
                defaultThreshold: Math.min(Math.max(config.defaultThreshold ?? 0.5, 0), 1),
                hybridWeight: config.hybridWeight ?? 0.5,
                queueConcurrency,
                embedDim,
                qdrant: config.qdrant,
        };
}

function hasSecurityFilters(input: SearchMemoryInput): boolean {
        const hasDomain = typeof input.domain === 'string' && input.domain.trim().length > 0;
        const hasTags = Array.isArray(input.tags) ? input.tags.length > 0 : Array.isArray(input.filterTags) && input.filterTags.length > 0;
        const labels = normaliseLabels([...(input.labels ?? []), ...(input.metadata?.labels ?? [])]);
        const tenant = extractTenant(input);
        return hasDomain || hasTags || labels.length > 0 || typeof tenant === 'string';
}

function extractTenant(input: SearchMemoryInput): string | undefined {
        const candidates = [input.tenant, input.metadata?.tenant];
        for (const candidate of candidates) {
                if (typeof candidate === 'string') {
                        const trimmed = candidate.trim();
                        if (trimmed.length > 0) {
                                return trimmed;
                        }
                }
        }
        return undefined;
}

function extractLabels(input: SearchMemoryInput): string[] {
        return normaliseLabels([...(input.labels ?? []), ...(input.metadata?.labels ?? [])]);
}

function isAdvancedSearchInput(input: SearchMemoryInput): boolean {
        return (
                input.search_type !== undefined ||
                input.limit !== undefined ||
                input.offset !== undefined ||
                typeof input.domain === 'string' ||
                Array.isArray(input.tags) ||
                Array.isArray(input.labels) ||
                (input.metadata !== undefined && Object.keys(input.metadata).length > 0) ||
                typeof input.tenant === 'string'
        );
}

export class LocalMemoryProvider implements MemoryProvider {
        private readonly records = new Map<string, MemoryRecord>();
        private readonly config: NormalisedConfig;
        private readonly maxRecords: number;
        readonly queue: TaskQueue;
        protected qdrant?: {
                upsert: (
                        collection: string,
                        payload: { points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> },
                ) => Promise<unknown>;
        };

        constructor(options: LocalMemoryProviderOptions | Partial<MemoryCoreConfig> = {}) {
                this.config = normaliseConfig(options);
                this.maxRecords = this.config.maxRecords;
                this.queue = new TaskQueue(this.config.queueConcurrency);
        }

        async store(input: StoreMemoryInput): Promise<StoreMemoryResult> {
                const now = new Date();
                const createdAt = now.toISOString();
                let content = '';
                if (typeof input.content === 'string') {
                        content = input.content;
                } else if (typeof input.text === 'string') {
                        content = input.text;
                }
                const tags = normaliseTags(input.tags ?? []);
                const metadata = normaliseMetadata(input.metadata ?? input.meta);
                const id = input.id ?? randomUUID();

                metadata.contentSha = computeSha(content);
                const labels = normaliseLabels(metadata.labels);
                if (labels.length > 0) {
                        metadata.labels = labels;
                }

                const record: MemoryRecord = {
                        id,
                        text: content,
                        tags,
                        meta: metadata,
                        createdAt,
                        updatedAt: createdAt,
                        domain: typeof input.domain === 'string' ? input.domain : undefined,
                        importance: typeof input.importance === 'number' ? input.importance : 0,
                };

                this.pruneIfNeeded();
                this.records.set(id, record);

                let vectorIndexed = false;
                if (this.shouldIndexVectors()) {
                        try {
                                vectorIndexed = await this.queue.add(() => this.indexRecord(record, sanitiseContent(content)));
                        } catch (error) {
                                vectorIndexed = false;
                        }
                }

                return { id, createdAt, vectorIndexed };
        }

        async search(input: SearchMemoryInput): Promise<SearchMemoryResult> {
                const start = Date.now();

                if (isAdvancedSearchInput(input)) {
                        if (!hasSecurityFilters(input)) {
                                throw new Error('Tenant, domain, tags, or labels must be provided for search');
                        }

                        if ((input.search_type ?? 'semantic') === 'keyword') {
                                const limit = this.clampLimit(input.limit);
                                const offset = this.clampOffset(input.offset);
                                const threshold = this.clampThreshold(input.score_threshold);
                                const hits = await this.searchWithFts(input, limit, offset, threshold);
                                return { hits, tookMs: Date.now() - start };
                        }

                        const hits = this.performInMemorySearch(input.query, {
                                tags: normaliseTags(input.tags ?? input.filterTags),
                                domain: input.domain,
                                tenant: extractTenant(input),
                                labels: extractLabels(input),
                                limit: this.clampLimit(input.limit ?? input.topK),
                                offset: this.clampOffset(input.offset),
                        });
                        return { hits, tookMs: Date.now() - start };
                }

                const hits = this.performInMemorySearch(input.query, {
                        tags: normaliseTags(input.filterTags),
                        limit: this.clampLimit(input.topK),
                        offset: 0,
                });
                return { hits, tookMs: Date.now() - start };
        }

        async get(input: GetMemoryInput): Promise<GetMemoryResult> {
                const record = this.records.get(input.id);
                if (!record) {
                        throw new Error(`Memory ${input.id} not found`);
                }

                return {
                        id: record.id,
                        text: record.text,
                        tags: [...record.tags],
                        meta: { ...record.meta },
                };
        }

        async remove(input: DeleteMemoryInput): Promise<DeleteMemoryResult> {
                const deleted = this.records.delete(input.id);
                return { id: input.id, deleted };
        }

        async health(): Promise<HealthStatus> {
                return { brand: 'brAInwav', ok: true };
        }

        protected async isQdrantHealthy(): Promise<boolean> {
                return false;
        }

        protected async generateEmbedding(text: string): Promise<number[]> {
                const dim = this.config.embedDim;
                if (dim < 1 || dim > 10_000) {
                        throw new Error('brAInwav embedding dimension must be between 1 and 10000');
                }

                const maxTextLength = 10_000;
                const embedding = new Array(dim).fill(0);
                const length = Math.min(text.length, maxTextLength);
                for (let i = 0; i < length; i += 1) {
                        const charCode = text.charCodeAt(i);
                        const index = i % dim;
                        embedding[index] += charCode;
                }

                // Scale embedding values by dividing by 255
                for (let i = 0; i < dim; i += 1) {
                        embedding[i] /= 255;
                }
                const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
                if (norm === 0) {
                        return embedding;
                }

                return embedding.map((val) => val / norm);
        }

        protected async searchWithFts(
                input: SearchMemoryInput,
                limit: number,
                offset: number,
                threshold: number,
        ): Promise<SearchMemoryResult['hits']> {
                const hits = this.performInMemorySearch(input.query, {
                        tags: normaliseTags(input.tags ?? input.filterTags),
                        domain: input.domain,
                        tenant: extractTenant(input),
                        labels: extractLabels(input),
                        limit,
                        offset,
                });
                return hits.map((hit) => ({ ...hit, score: Math.max(hit.score, threshold) }));
        }

        private async indexRecord(record: MemoryRecord, sanitisedContent: string): Promise<boolean> {
                if (!this.shouldIndexVectors() || !this.config.qdrant || !this.qdrant) {
                        return false;
                }
                if (!(await this.isQdrantHealthy())) {
                        return false;
                }

                const embedding = await this.generateEmbedding(sanitisedContent);
                const labels = normaliseLabels(record.meta.labels);
                const tenant = typeof record.meta.tenant === 'string' ? record.meta.tenant : undefined;
                const sourceUri = typeof record.meta.sourceUri === 'string' ? record.meta.sourceUri : undefined;

                await this.qdrant.upsert(this.config.qdrant.collection, {
                        points: [
                                {
                                        id: record.id,
                                        vector: embedding,
                                        payload: {
                                                id: record.id,
                                                domain: record.domain,
                                                tags: record.tags,
                                                labels,
                                                tenant,
                                                sourceUri,
                                                contentSha: record.meta.contentSha,
                                                createdAt: Date.parse(record.createdAt),
                                                updatedAt: Date.parse(record.updatedAt),
                                                importance: record.importance,
                                        },
                                },
                        ],
                });

                return true;
        }

        private performInMemorySearch(
                query: string,
                options: {
                        tags?: string[];
                        domain?: string;
                        tenant?: string;
                        labels?: string[];
                        limit: number;
                        offset?: number;
                },
        ): SearchMemoryResult['hits'] {
                const normalizedQuery = query.trim().toLowerCase();
                const offset = Math.max(0, options.offset ?? 0);
                const limit = Math.max(1, options.limit);
                const requestedLabels = options.labels?.map((label) => label.toLowerCase()) ?? [];
                const requestedTenant = options.tenant?.toLowerCase();
                const requestedDomain = options.domain?.toLowerCase();

                const results: SearchMemoryResult['hits'] = [];
                for (const record of this.records.values()) {
                        if (requestedDomain && record.domain?.toLowerCase() !== requestedDomain) {
                                continue;
                        }

                        const recordTenant = typeof record.meta.tenant === 'string' ? record.meta.tenant.toLowerCase() : undefined;
                        if (requestedTenant && recordTenant !== requestedTenant) {
                                continue;
                        }

                        if (requestedLabels.length > 0) {
                                const recordLabels = Array.isArray(record.meta.labels)
                                        ? (record.meta.labels as string[]).map((label) => label.toLowerCase())
                                        : [];
                                const hasAllLabels = requestedLabels.every((label) => recordLabels.includes(label));
                                if (!hasAllLabels) {
                                        continue;
                                }
                        }

                        if (options.tags && options.tags.length > 0) {
                                const hasTag = options.tags.some((tag) => record.tags.includes(tag));
                                if (!hasTag) {
                                        continue;
                                }
                        }

                        if (normalizedQuery.length > 0 && !record.text.toLowerCase().includes(normalizedQuery)) {
                                continue;
                        }

                        results.push({
                                id: record.id,
                                text: record.text,
                                score: normalizedQuery.length === 0 ? 0.5 : 1,
                                source: 'local',
                        });
                }

                return results.slice(offset, offset + limit);
        }

        private pruneIfNeeded(): void {
                if (this.records.size < this.maxRecords) {
                        return;
                }

                let oldestKey: string | undefined;
                let oldestDate: string | undefined;
                for (const [key, rec] of this.records.entries()) {
                        if (!oldestDate || rec.createdAt < oldestDate) {
                                oldestDate = rec.createdAt;
                                oldestKey = key;
                        }
                }

                if (oldestKey) {
                        this.records.delete(oldestKey);
                }
        }

        private shouldIndexVectors(): boolean {
                return Boolean(this.config.qdrant && this.qdrant);
        }

        private clampLimit(value?: number): number {
                if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
                        return this.config.defaultLimit;
                }
                return Math.min(Math.trunc(value), this.config.maxLimit);
        }

        private clampOffset(value?: number): number {
                if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
                        return 0;
                }
                return Math.min(Math.trunc(value), this.config.maxOffset);
        }

        private clampThreshold(value?: number): number {
                if (typeof value !== 'number' || Number.isNaN(value)) {
                        return this.config.defaultThreshold;
                }
                return Math.min(Math.max(value, 0), 1);
        }
}
