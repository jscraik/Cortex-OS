import type Database from 'better-sqlite3';

export function ensureCheckpointSchema(db: Database.Database): void {
        db.exec(`
                CREATE TABLE IF NOT EXISTS checkpoints (
                        id TEXT PRIMARY KEY,
                        parent_id TEXT,
                        branch_id TEXT,
                        created_at TEXT NOT NULL,
                        score REAL,
                        labels TEXT,
                        size_bytes INTEGER,
                        digest TEXT NOT NULL,
                        state_json TEXT NOT NULL,
                        meta_json TEXT NOT NULL
                );
        `);

        db.exec(
                `CREATE INDEX IF NOT EXISTS idx_checkpoints_branch ON checkpoints(branch_id);`,
        );
        db.exec(
                `CREATE INDEX IF NOT EXISTS idx_checkpoints_created ON checkpoints(created_at);`,
        );
        db.exec(`CREATE INDEX IF NOT EXISTS idx_checkpoints_parent ON checkpoints(parent_id);`);
}
