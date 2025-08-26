#!/usr/bin/env node

// Script to update setActiveSwarm method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating setActiveSwarm method to use SecureDatabaseWrapper...');

const databaseManagerPath = join('apps', 'cortex-os', 'packages/agents/src/legacy-instructions/DatabaseManager.ts');
let content = readFileSync(databaseManagerPath, 'utf-8');

// Update the setActiveSwarm method
content = content.replace(
  /async setActiveSwarm\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.statements\.get\("setActiveSwarm"\)\!\.run\(id\);\s*}/s,
  `async setActiveSwarm(id: string): Promise<void> {
    // Validate input id
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid id provided to setActiveSwarm');
    }
    
    // Validate id format
    if (!this.secureDb.validateInput(id, 'id')) {
      throw new Error('Invalid id format');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun("UPDATE swarm_state SET active_swarm_id = ?, updated_at = CURRENT_TIMESTAMP", id);
    } catch (error) {
      console.error('Error setting active swarm:', error);
      throw error;
    }
  }`
);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ setActiveSwarm method updated to use SecureDatabaseWrapper');