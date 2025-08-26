#!/usr/bin/env node

// Script to update createAgent method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating createAgent method to use SecureDatabaseWrapper...');

const databaseManagerPath = join('apps', 'cortex-os', 'packages/agents/src/legacy-instructions/DatabaseManager.ts');
let content = readFileSync(databaseManagerPath, 'utf-8');

// Update the createAgent method
content = content.replace(
  /async createAgent\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.statements\.get\("createAgent"\)\!\.run\(data\);\s*}/s,
  `async createAgent(data: any): Promise<void> {
    // Validate input data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data provided to createAgent');
    }
    
    // Validate required fields
    if (!data.id || !data.name) {
      throw new Error('Missing required fields in agent data');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun(
        "INSERT INTO agents (id, swarm_id, name, role, status, config, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        data.id, data.swarm_id, data.name, data.role, data.status, JSON.stringify(data.config), data.created_at
      );
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  }`
);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ createAgent method updated to use SecureDatabaseWrapper');