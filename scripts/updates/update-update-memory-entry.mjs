#!/usr/bin/env node

// Script to update updateMemoryEntry method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating updateMemoryEntry method to use SecureDatabaseWrapper...');

const databaseManagerPath = join(
  'apps',
  'cortex-os',
  'packages',
  'agents',
  'src',
  'legacy-instructions',
  'DatabaseManager.ts',
);
let content = readFileSync(databaseManagerPath, 'utf-8');

// Update the updateMemoryEntry method
const updateMemoryEntryPattern =
  /async updateMemoryEntry\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.db\s*\.\s*prepare\([^}]*?UPDATE memory[^}]*?SET value = \?, access_count = \?, last_accessed_at = \?[^}]*?run\([^)]*\);\s*}/s;
const updateMemoryEntryReplacement = `async updateMemoryEntry(entry: any): Promise<void> {
    // Validate input data
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid entry provided to updateMemoryEntry');
    }
    
    // Validate required fields
    if (!entry.key || !entry.namespace || !entry.value) {
      throw new Error('Missing required fields in memory entry');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun(
        "UPDATE memory SET value = ?, access_count = ?, last_accessed_at = ? WHERE key = ? AND namespace = ?",
        entry.value, entry.accessCount, entry.lastAccessedAt, entry.key, entry.namespace
      );
    } catch (error) {
      console.error('Error updating memory entry:', error);
      throw error;
    }
  }`;

content = content.replace(updateMemoryEntryPattern, updateMemoryEntryReplacement);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ updateMemoryEntry method updated to use SecureDatabaseWrapper');
