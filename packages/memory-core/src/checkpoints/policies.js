import { MemoryProviderError } from '../types.js';
function resolveConfig(config) {
    return {
        maxRetained: config?.maxRetained ?? 20,
        ttlMs: config?.ttlMs ?? 1000 * 60 * 60 * 24,
        branchBudget: config?.branchBudget ?? 3,
        samplerLabel: config?.samplerLabel ?? 'checkpoint',
    };
}
export function resolveCheckpointPolicy(config) {
    const resolved = resolveConfig(config);
    return {
        config: resolved,
        enforceBranch(requested) {
            if (requested <= 0) {
                throw new MemoryProviderError('VALIDATION', 'Branch count must be greater than zero');
            }
            if (requested > resolved.branchBudget) {
                throw new MemoryProviderError('VALIDATION', `Checkpoint branch budget exceeded (${requested} > ${resolved.branchBudget})`);
            }
        },
        async prune(db) {
            const cutoff = new Date(Date.now() - resolved.ttlMs).toISOString();
            const deleteOld = db.prepare('DELETE FROM checkpoints WHERE created_at < ?').run(cutoff).changes ?? 0;
            const totalRow = db.prepare('SELECT COUNT(*) as count FROM checkpoints').get();
            let removed = deleteOld;
            if (totalRow.count > resolved.maxRetained) {
                const overflow = totalRow.count - resolved.maxRetained;
                const ids = db
                    .prepare('SELECT id FROM checkpoints ORDER BY created_at ASC LIMIT ?')
                    .all(overflow);
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
