#!/usr/bin/env node

// Script to update deleteMemory method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating deleteMemory method to use SecureDatabaseWrapper...');

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

// Update the deleteMemory method
const deleteMemoryPattern =
  /async deleteMemory\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.db\s*\.\s*prepare\("DELETE FROM memory WHERE key = \? AND namespace = \?"\)\s*\.\s*run\(key, namespace\);\s*}/s;
const deleteMemoryReplacement = `async deleteMemory(key: string, namespace: string): Promise<void> {
    // Validate input data
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided to deleteMemory');
    }
    
    if (!namespace || typeof namespace !== 'string') {
      throw new Error('Invalid namespace provided to deleteMemory');
    }
    
    // Validate key and namespace formats
    if (!this.secureDb.validateInput(key, 'key')) {
      throw new Error('Invalid key format');
    }
    
    if (!this.secureDb.validateInput(namespace, 'namespace')) {
      throw new Error('Invalid namespace format');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun("DELETE FROM memory WHERE key = ? AND namespace = ?", key, namespace);
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }`;

content = content.replace(deleteMemoryPattern, deleteMemoryReplacement);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ deleteMemory method updated to use SecureDatabaseWrapper');
