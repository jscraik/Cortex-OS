/**
 * Mock database utilities for testing
 * Replaces sqlite3 dependencies with in-memory storage
 */

import { vi } from 'vitest';

// In-memory storage for tests
const testStorage = new Map<string, Map<string, Record<string, unknown>>>();

// Mock database operations
export const mockDbGet = vi.fn((sql: string, params: unknown[] = []) => {
  const tableName = extractTableName(sql);
  const table = testStorage.get(tableName) || new Map();
  
  // Simple mock logic for common queries
  if (sql.includes('WHERE email = ?')) {
    const email = params[0] as string;
    for (const [, record] of table) {
      if (record.email === email) {
        return Promise.resolve(record);
      }
    }
    return Promise.resolve(undefined);
  }
  
  // Return first record for simple SELECT queries
  const firstRecord = Array.from(table.values())[0];
  return Promise.resolve(firstRecord);
});

export const mockDbRun = vi.fn((sql: string, params: unknown[] = []) => {
  const tableName = extractTableName(sql);
  
  if (sql.includes('INSERT INTO')) {
    const table = testStorage.get(tableName) || new Map();
    const id = params[0] as string || `mock-id-${Date.now()}`;
    const record: Record<string, unknown> = {};
    
    // Mock record creation based on common patterns
    if (tableName === 'users') {
      [record.id, record.email, record.name, record.password, record.created_at, record.updated_at] = params;
    }
    
    table.set(id, record);
    testStorage.set(tableName, table);
    
    return Promise.resolve({ lastID: 1, changes: 1 });
  }
  
  return Promise.resolve({ lastID: 0, changes: 0 });
});

// Helper to extract table name from SQL
function extractTableName(sql: string): string {
  const match = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
  return match?.[1] || 'unknown';
}

// Clear test storage between tests
export const clearTestStorage = () => {
  testStorage.clear();
};

// Mock database initialization
export const mockInitializeDatabase = vi.fn(() => ({}));
export const mockGetDatabase = vi.fn(() => ({}));
export const mockCloseDatabase = vi.fn(() => {});