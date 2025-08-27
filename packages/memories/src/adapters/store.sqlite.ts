import type { MemoryStore, TextQuery, VectorQuery } from "../ports/MemoryStore.js";
import type { Memory, MemoryId } from "../domain/types.js";
import { Database } from 'better-sqlite3';

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  const dotProduct = a.reduce((sum, _, i) => sum + a[i] * (b[i] || 0), 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

export class SQLiteStore implements MemoryStore {
  private db: any; // Using 'any' to avoid dependency on better-sqlite3 types
  
  constructor(path: string) {
    try {
      // Dynamically import better-sqlite3 to avoid hard dependency
      const sqlite3 = require('better-sqlite3');
      this.db = new sqlite3(path);
      
      // Create table if it doesn't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          text TEXT,
          vector TEXT, -- JSON array stored as text
          tags TEXT, -- JSON array stored as text
          ttl TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          provenance TEXT, -- JSON object stored as text
          policy TEXT, -- JSON object stored as text
          embeddingModel TEXT
        )
      `);
      
      // Create indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_kind ON memories(kind)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_embeddingModel ON memories(embeddingModel)');
    } catch (error) {
      console.warn('SQLite not available, using in-memory fallback');
      // Fallback to in-memory implementation if SQLite is not available
      this.db = null;
    }
  }

  async upsert(m: Memory): Promise<Memory> {
    if (!this.db) {
      throw new Error("SQLiteStore not available - no database connection");
    }
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories 
      (id, kind, text, vector, tags, ttl, createdAt, updatedAt, provenance, policy, embeddingModel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      m.id,
      m.kind,
      m.text || null,
      m.vector ? JSON.stringify(m.vector) : null,
      JSON.stringify(m.tags),
      m.ttl || null,
      m.createdAt,
      m.updatedAt,
      JSON.stringify(m.provenance),
      m.policy ? JSON.stringify(m.policy) : null,
      m.embeddingModel || null
    );
    
    return m;
  }

  async get(id: MemoryId): Promise<Memory | null> {
    if (!this.db) {
      throw new Error("SQLiteStore not available - no database connection");
    }
    
    const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id);
    
    if (!row) return null;
    
    return this.rowToMemory(row);
  }

  async delete(id: MemoryId): Promise<void> {
    if (!this.db) {
      throw new Error("SQLiteStore not available - no database connection");
    }
    
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    stmt.run(id);
  }

  async searchByText(q: TextQuery): Promise<Memory[]> {
    if (!this.db) {
      throw new Error("SQLiteStore not available - no database connection");
    }
    
    let sql = 'SELECT * FROM memories WHERE text IS NOT NULL';
    const params: any[] = [];
    
    if (q.text) {
      sql += ' AND LOWER(text) LIKE LOWER(?)';
      params.push(`%${q.text}%`);
    }
    
    if (q.filterTags && q.filterTags.length > 0) {
      // For simplicity, we'll do a basic tag filter
      // A more sophisticated implementation would parse the JSON tags
      sql += ' AND (';
      q.filterTags.forEach((tag, i) => {
        if (i > 0) sql += ' OR ';
        sql += 'tags LIKE ?';
        params.push(`%"${tag}"%`);
      });
      sql += ')';
    }
    
    sql += ' ORDER BY updatedAt DESC LIMIT ?';
    params.push(q.topK);
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    
    return rows.map((row: any) => this.rowToMemory(row));
  }

  async searchByVector(q: VectorQuery): Promise<Memory[]> {
    if (!this.db) {
      throw new Error("SQLiteStore not available - no database connection");
    }
    
    // SQLite doesn't have native vector search capabilities
    // We'll fetch candidates and perform similarity matching in memory
    let sql = 'SELECT * FROM memories WHERE vector IS NOT NULL';
    const params: any[] = [];
    
    if (q.filterTags && q.filterTags.length > 0) {
      sql += ' AND (';
      q.filterTags.forEach((tag, i) => {
        if (i > 0) sql += ' OR ';
        sql += 'tags LIKE ?';
        params.push(`%"${tag}"%`);
      });
      sql += ')';
    }
    
    sql += ' ORDER BY updatedAt DESC LIMIT ?';
    params.push(q.topK * 10); // Fetch more candidates for similarity matching
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    
    const candidates = rows.map((row: any) => this.rowToMemory(row))
      .filter(memory => memory.vector) as Memory[];
    
    // Perform similarity matching
    const scoredCandidates = candidates
      .map(memory => ({
        memory,
        score: cosineSimilarity(q.vector, memory.vector!)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, q.topK)
      .map(item => item.memory);
    
    return scoredCandidates;
  }

  async purgeExpired(nowISO: string): Promise<number> {
    if (!this.db) {
      throw new Error("SQLiteStore not available - no database connection");
    }
    
    const now = new Date(nowISO).getTime();
    let purgedCount = 0;
    
    // Get all memories with TTL
    const stmt = this.db.prepare('SELECT * FROM memories WHERE ttl IS NOT NULL');
    const rows = stmt.all();
    
    const expiredIds: string[] = [];
    
    for (const row of rows) {
      try {
        const memory = this.rowToMemory(row);
        if (memory.ttl) {
          const created = new Date(memory.createdAt).getTime();
          // Parse ISO duration (simplified version)
          const match = memory.ttl.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
          if (match) {
            const days = Number(match[1] || 0);
            const hours = Number(match[2] || 0);
            const minutes = Number(match[3] || 0);
            const seconds = Number(match[4] || 0);
            const ttlMs = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
            
            if (created + ttlMs <= now) {
              expiredIds.push(memory.id);
            }
          }
        }
      } catch (error) {
        // Ignore invalid TTL formats
        console.warn(`Invalid TTL format for memory ${row.id}: ${row.ttl}`);
      }
    }
    
    // Delete expired memories
    if (expiredIds.length > 0) {
      const placeholders = expiredIds.map(() => '?').join(',');
      const deleteStmt = this.db.prepare(`DELETE FROM memories WHERE id IN (${placeholders})`);
      const result = deleteStmt.run(...expiredIds);
      purgedCount = result.changes;
    }
    
    return purgedCount;
  }
  
  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      kind: row.kind,
      text: row.text ?? undefined,
      vector: row.vector ? JSON.parse(row.vector) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      ttl: row.ttl ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      provenance: row.provenance ? JSON.parse(row.provenance) : { source: 'unknown' },
      policy: row.policy ? JSON.parse(row.policy) : undefined,
      embeddingModel: row.embeddingModel ?? undefined,
    };
  }
}

