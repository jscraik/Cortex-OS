// In-memory database adapter for better-auth
// This provides a simple adapter that works without native dependencies

interface MemoryRecord {
  [key: string]: any;
}

interface MemoryTable {
  [id: string]: MemoryRecord;
}

interface MemoryDatabase {
  [tableName: string]: MemoryTable;
}

// Simple in-memory database
const memoryDb: MemoryDatabase = {};

export class MemoryAdapter {
  private db: MemoryDatabase;

  constructor() {
    this.db = memoryDb;
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    // Very simple SQL parser for basic operations
    // This is a minimal implementation for testing purposes
    const normalizedSql = sql.toLowerCase().trim();

    if (normalizedSql.startsWith('select')) {
      const matches = normalizedSql.match(/from\s+(\w+)/);
      if (matches) {
        const tableName = matches[1];
        const table = this.db[tableName] || {};
        return Object.values(table);
      }
    } else if (normalizedSql.startsWith('insert')) {
      const matches = normalizedSql.match(/into\s+(\w+)/);
      if (matches) {
        const tableName = matches[1];
        if (!this.db[tableName]) {
          this.db[tableName] = {};
        }
        // Extract values from params
        if (params.length > 0) {
          const id = params[0];
          this.db[tableName][id] = { id, ...params[1] };
        }
        return [{ id: params[0] }];
      }
    } else if (normalizedSql.startsWith('update')) {
      const matches = normalizedSql.match(/update\s+(\w+)/);
      if (matches) {
        const tableName = matches[1];
        const table = this.db[tableName] || {};
        // Update record with first param as id
        const id = params[params.length - 1];
        if (table[id]) {
          table[id] = { ...table[id], ...params[0] };
          return [table[id]];
        }
        return [];
      }
    } else if (normalizedSql.startsWith('delete')) {
      const matches = normalizedSql.match(/from\s+(\w+)/);
      if (matches) {
        const tableName = matches[1];
        const table = this.db[tableName] || {};
        // Delete record with first param as id
        const id = params[0];
        if (table[id]) {
          const deleted = table[id];
          delete table[id];
          return [deleted];
        }
        return [];
      }
    }

    return [];
  }

  async exec(sql: string): Promise<void> {
    // Execute DDL statements
    const normalizedSql = sql.toLowerCase().trim();

    if (normalizedSql.startsWith('create table')) {
      const matches = normalizedSql.match(/create table if not exists\s+(\w+)/);
      if (matches) {
        const tableName = matches[1];
        if (!this.db[tableName]) {
          this.db[tableName] = {};
        }
      }
    } else if (normalizedSql.startsWith('create index')) {
      // Ignore indexes for in-memory adapter
      return;
    } else if (normalizedSql.startsWith('pragma')) {
      // Ignore pragma statements
      return;
    }
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const results = await this.query(sql, params);
    return results[0] || null;
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return await this.query(sql, params);
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const normalizedSql = sql.toLowerCase().trim();

    if (normalizedSql.startsWith('insert')) {
      await this.query(sql, params);
      return { lastID: Date.now(), changes: 1 };
    } else if (normalizedSql.startsWith('update')) {
      const results = await this.query(sql, params);
      return { lastID: 0, changes: results.length };
    } else if (normalizedSql.startsWith('delete')) {
      const results = await this.query(sql, params);
      return { lastID: 0, changes: results.length };
    }

    return { lastID: 0, changes: 0 };
  }
}

// Create a singleton instance
export const memoryAdapter = new MemoryAdapter();