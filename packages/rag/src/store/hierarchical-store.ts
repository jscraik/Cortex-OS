import type { Chunk, Store } from '../lib/index.js';

export interface HierarchicalQueryOptions {
  k?: number;
  expandContext?: boolean;
  maxLevels?: number; // 1 = parent, 2 = parent of parent, etc.
}

export interface HierarchicalStoreOptions {
  defaultExpandContext?: boolean;
  defaultMaxLevels?: number;
}

/**
 * Store wrapper that enriches query results with hierarchical context based on
 * level/parentId metadata learned at upsert time.
 *
 * Expected metadata fields on ingested chunks:
 * - level: 'document' | 'section' | 'paragraph'
 * - parentId?: string
 * - heading?: string (for sections)
 */
export class HierarchicalStore implements Store {
  private readonly base: Store;
  private readonly byId = new Map<string, Chunk>();
  private readonly defaults: { expand: boolean; maxLevels: number };

  constructor(base: Store, options?: HierarchicalStoreOptions) {
    this.base = base;
    this.defaults = {
      expand: options?.defaultExpandContext ?? false,
      maxLevels: Math.max(1, Math.min(options?.defaultMaxLevels ?? 2, 10)),
    };
  }

  async upsert(chunks: Chunk[]): Promise<void> {
    // Track in-memory map for context expansion
    for (const c of chunks) {
      this.byId.set(c.id, c);
    }
    await this.base.upsert(chunks);
  }

  // Optional hybrid passthrough when base supports queryWithText
  async queryWithText?(
    embedding: number[],
    queryText: string,
    k = 10,
  ): Promise<Array<Chunk & { score?: number }>> {
    const baseAny = this.base as unknown as {
      queryWithText?: (e: number[], q: string, k?: number) => Promise<Array<Chunk & { score?: number }>>;
    };
    if (typeof baseAny.queryWithText === 'function') {
      const results = await baseAny.queryWithText(embedding, queryText, k);
      if (!this.defaults.expand) return results;
      return results.map((r) => this.withContext(r, this.defaults.maxLevels));
    }
    // fallback to vector-only
    const results = await this.base.query(embedding, k);
    if (!this.defaults.expand) return results;
    return results.map((r) => this.withContext(r, this.defaults.maxLevels));
  }

  async query(embedding: number[], k?: number): Promise<Array<Chunk & { score?: number }>>;
  async query(
    embedding: number[],
    options?: HierarchicalQueryOptions,
  ): Promise<Array<Chunk & { score?: number }>>;
  async query(
    embedding: number[],
    kOrOptions?: number | HierarchicalQueryOptions,
  ): Promise<Array<Chunk & { score?: number }>> {
    const isNumber = typeof kOrOptions === 'number';
    const opts: HierarchicalQueryOptions = isNumber ? { k: kOrOptions } : (kOrOptions ?? {});
    const results = await this.base.query(embedding, opts.k ?? 10);

    const expand = isNumber ? this.defaults.expand : !!opts.expandContext;
    if (!expand) return results;

    // Attach hierarchical context derived from parent chain
    const maxLevels = Math.max(1, Math.min((isNumber ? this.defaults.maxLevels : opts.maxLevels) ?? 2, 10));
    return results.map((r) => this.withContext(r, maxLevels));
  }

  private withContext<T extends Chunk & { score?: number }>(row: T, maxLevels: number): T {
    const parts: string[] = [];
    const visited = new Set<string>();

    const safeText = (c?: Chunk | null) => (c?.text ?? '').toString();

    const meta = row.metadata ?? ({} as Record<string, unknown>);
    let currentId: string | undefined = typeof meta.parentId === 'string' ? meta.parentId : undefined;
    let levels = 0;

    while (currentId && levels < maxLevels) {
      if (visited.has(currentId)) break; // prevent cycles
      visited.add(currentId);

      const parent = this.byId.get(currentId);
      if (!parent) break;

      // Prefer headings for sections, otherwise use text
      const pmeta = parent.metadata ?? ({} as Record<string, unknown>);
      const heading = typeof pmeta.heading === 'string' ? pmeta.heading : undefined;
      if (heading && safeText(parent)) {
        parts.push(`# ${heading}\n${safeText(parent)}`);
      } else {
        parts.push(safeText(parent));
      }

      // ascend
      currentId = typeof pmeta.parentId === 'string' ? pmeta.parentId : undefined;
      levels++;
    }

    // Compose context string; attach under metadata.context (non-breaking)
    const context = parts.join('\n\n');
    const newMeta = { ...(row.metadata ?? {}), context } as Record<string, unknown>;
    return { ...row, metadata: newMeta } as T;
  }
}
