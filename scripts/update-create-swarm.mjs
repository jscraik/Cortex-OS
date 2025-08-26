#!/usr/bin/env node

// Script to update createSwarm method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating createSwarm method to use SecureDatabaseWrapper...');

const databaseManagerPath = join('apps', 'cortex-os', 'packages/agents/src/legacy-instructions/DatabaseManager.ts');
let content = readFileSync(databaseManagerPath, 'utf-8');

// Update the createSwarm method
content = content.replace(
  /async createSwarm\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.statements\.get\("createSwarm"\)\!\.run\(data\);\s*}/s,
  `async createSwarm(data: any): Promise<void> {
    // Validate input data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data provided to createSwarm');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun("INSERT INTO swarms (id, name, description, config, created_at) VALUES (?, ?, ?, ?, ?)", 
        data.id, data.name, data.description, JSON.stringify(data.config), data.created_at);
    } catch (error) {
      console.error('Error creating swarm:', error);
      throw error;
    }
  }`
);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ createSwarm method updated to use SecureDatabaseWrapper');