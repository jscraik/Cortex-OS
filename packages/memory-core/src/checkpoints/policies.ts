import type Database from 'better-sqlite3';
import type { CheckpointConfig } from '../types.js';
import { MemoryProviderError } from '../types.js';

export interface CheckpointRuntimePolicy {
	readonly config: Required<CheckpointConfig>;
	enforceBranch(requested: number): void;
	prune(db: Database.Database): Promise<number>;
}

function resolveConfig(config?: CheckpointConfig): Required<CheckpointConfig> {
	return {
		maxRetained: config?.maxRetained ?? 20,
		ttlMs: config?.ttlMs ?? 1000 * 60 * 60 * 24,
		branchBudget: config?.branchBudget ?? 3,
		samplerLabel: config?.samplerLabel ?? 'checkpoint',
	} satisfies Required<CheckpointConfig>;
}

export function resolveCheckpointPolicy(config?: CheckpointConfig): CheckpointRuntimePolicy {
	const resolved = resolveConfig(config);

	return {
		config: resolved,
		enforceBranch(requested: number) {
			if (requested <= 0) {
				throw new MemoryProviderError('VALIDATION', 'Branch count must be greater than zero');
			}

			if (requested > resolved.branchBudget) {
				throw new MemoryProviderError(
					'VALIDATION',
					`Checkpoint branch budget exceeded (${requested} > ${resolved.branchBudget})`,
				);
			}
		},
		async prune(db: Database.Database) {
			const cutoff = new Date(Date.now() - resolved.ttlMs).toISOString();
			const deleteOld =
				db.prepare('DELETE FROM checkpoints WHERE created_at < ?').run(cutoff).changes ?? 0;

			const totalRow = db.prepare('SELECT COUNT(*) as count FROM checkpoints').get() as {
				count: number;
			};

			let removed = deleteOld;

			if (totalRow.count > resolved.maxRetained) {
				const overflow = totalRow.count - resolved.maxRetained;
				const ids = db
					.prepare('SELECT id FROM checkpoints ORDER BY created_at ASC LIMIT ?')
					.all(overflow) as Array<{ id: string }>;

				if (ids.length > 0) {
					const placeholders = ids.map(() => '?').join(',');
					removed +=
						db
							.prepare(`DELETE FROM checkpoints WHERE id IN (${placeholders})`)
							.run(...ids.map((entry) => entry.id)).changes ?? 0;
				}
			}

			return removed;
		},
	};
}
