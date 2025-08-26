#!/usr/bin/env node

// Script to update updateMemoryAccess method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating updateMemoryAccess method to use SecureDatabaseWrapper...');

const databaseManagerPath = join('apps', 'cortex-os', 'packages', 'agents', 'src', 'legacy-instructions', 'DatabaseManager.ts');
let content = readFileSync(databaseManagerPath, 'utf-8');

// Update the updateMemoryAccess method
const updateMemoryAccessPattern = /async updateMemoryAccess\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.db\s*\.\s*prepare\([^}]*?UPDATE memory[^}]*?run\(key, namespace\);\s*}/s;
const updateMemoryAccessReplacement = `async updateMemoryAccess(key: string, namespace: string): Promise<void> {
    // Validate input data
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided to updateMemoryAccess');
    }
    
    if (!namespace || typeof namespace !== 'string') {
      throw new Error('Invalid namespace provided to updateMemoryAccess');
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
      this.secureDb.secureRun(
        "UPDATE memory SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP WHERE key = ? AND namespace = ?",
        key, namespace
      );
    } catch (error) {
      console.error('Error updating memory access:', error);
      throw error;
    }
  }`;

content = content.replace(updateMemoryAccessPattern, updateMemoryAccessReplacement);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ updateMemoryAccess method updated to use SecureDatabaseWrapper');