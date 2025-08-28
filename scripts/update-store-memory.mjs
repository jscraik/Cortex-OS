#!/usr/bin/env node

// Script to update storeMemory method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating storeMemory method to use SecureDatabaseWrapper...');

const databaseManagerPath = join(
  'apps',
  'cortex-os',
  'packages/agents/src/legacy-instructions/DatabaseManager.ts',
);
let content = readFileSync(databaseManagerPath, 'utf-8');

// Update the storeMemory method
const storeMemoryPattern =
  /async storeMemory\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.statements\.get\("storeMemory"\)\!\.run\(data\);\s*}/s;
const storeMemoryReplacement = `async storeMemory(data: any): Promise<void> {
    // Validate input data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data provided to storeMemory');
    }
    
    // Validate required fields
    if (!data.key || !data.namespace) {
      throw new Error('Missing required fields in memory data');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun(
        "INSERT OR REPLACE INTO memory (key, namespace, value, ttl, created_at, last_accessed_at) VALUES (?, ?, ?, ?, ?, ?)",
        data.key, data.namespace, data.value, data.ttl, data.created_at, data.last_accessed_at
      );
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }`;

content = content.replace(storeMemoryPattern, storeMemoryReplacement);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ storeMemory method updated to use SecureDatabaseWrapper');
