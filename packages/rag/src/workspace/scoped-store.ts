import type { Chunk, Store } from '../lib/index.js';

export interface WorkspaceQuotaConfig {
	maxItems?: number; // maximum number of chunks per workspace
}

export interface ScopedStoreOptions {
	workspaceId: string;
	quota?: WorkspaceQuotaConfig;
	// Optional policy: disallow cross-workspace queries even if base returns them (safety net)
	enforceIsolation?: boolean; // default true
}

/**
 * ScopedStore wraps any Store and enforces workspace isolation via metadata tagging.
 * - Upserts stamp chunks with `metadata.workspaceId = <id>` (non-destructive merge)
 * - Query filters out results not matching the workspaceId
 * - Optional quota enforcement per workspace (max items)
 * - Optional deletion cascade via best-effort delete(ids) when base supports it
 */
export class ScopedStore implements Store {
	private readonly base: Store;
	private readonly ws: string;
	private readonly quota: Required<WorkspaceQuotaConfig>;
	private readonly isolation: boolean;

	constructor(base: Store, options: ScopedStoreOptions) {
		this.base = base;
		this.ws = options.workspaceId;
		this.quota = { maxItems: Math.max(0, options.quota?.maxItems ?? 0) };
		this.isolation = options.enforceIsolation ?? true;
	}

	async upsert(chunks: Chunk[]): Promise<void> {
		await this.enforceQuotaIfNeeded(chunks.length);
		const stamped = chunks.map((c) => this.stampWorkspace(c));
		await this.base.upsert(stamped);
	}

	async query(embedding: number[], k = 5): Promise<Array<Chunk & { score?: number }>> {
		const results = await this.base.query(embedding, k);
		if (!this.isolation) return results;
		return results.filter((r) => this.rowInWorkspace(r));
	}

	// Optional convenience that consumers can use to cascade delete
	async deleteAllInWorkspace(): Promise<void> {
		const deletable = this.base as unknown as { delete?: (ids: string[]) => Promise<void> };
		if (typeof deletable.delete !== 'function') return; // best-effort only

		// Fetch candidates by querying multiple random vectors is impractical here;
		// assume base store also supports an admin listing API. If not, this becomes a no-op.
		const lister = this.base as unknown as {
			listAll?: () => Promise<Array<Chunk & { embedding?: number[] }>>;
		};
		if (typeof lister.listAll !== 'function') return;

		const all = await lister.listAll();
		const ids = all.filter((c) => this.rowInWorkspace(c)).map((c) => c.id);
		if (ids.length > 0) await deletable.delete(ids);
	}

	private stampWorkspace(c: Chunk): Chunk {
		const meta = { ...(c.metadata ?? {}) } as Record<string, unknown>;
		meta.workspaceId = this.ws;
		return { ...c, metadata: meta };
	}

	private rowInWorkspace(c: Chunk): boolean {
		const ws = (c.metadata?.workspaceId as string | undefined) ?? undefined;
		return ws === this.ws;
	}

	private async enforceQuotaIfNeeded(incoming: number): Promise<void> {
		if (this.quota.maxItems <= 0) return;
		const tracker = this.base as unknown as {
			countByWorkspace?: (workspaceId: string) => Promise<number>;
		};
		if (typeof tracker.countByWorkspace !== 'function') return; // best-effort
		const current = await tracker.countByWorkspace(this.ws);
		if (current + incoming > this.quota.maxItems) {
			throw new Error(
				`Workspace quota exceeded: ${current + incoming} > ${this.quota.maxItems} (workspace=${this.ws})`,
			);
		}
	}
}

export function createScopedStore(base: Store, options: ScopedStoreOptions): Store {
	return new ScopedStore(base, options);
}
