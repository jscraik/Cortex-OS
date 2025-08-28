#!/usr/bin/env node

// Script to update createCommunication method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating createCommunication method to use SecureDatabaseWrapper...');

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

// Update the createCommunication method
const createCommunicationPattern =
  /async createCommunication\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.statements\.get\("createCommunication"\)\!\.run\(data\);\s*}/s;
const createCommunicationReplacement = `async createCommunication(data: any): Promise<void> {
    // Validate input data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data provided to createCommunication');
    }
    
    // Validate required fields
    if (!data.from_agent_id || !data.to_agent_id || !data.message_type) {
      throw new Error('Missing required fields in communication data');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun(
        "INSERT INTO communications (from_agent_id, to_agent_id, swarm_id, message_type, content, priority, requires_response, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        data.from_agent_id, data.to_agent_id, data.swarm_id, data.message_type, data.content, data.priority, data.requires_response ? 1 : 0, data.timestamp
      );
    } catch (error) {
      console.error('Error creating communication:', error);
      throw error;
    }
  }`;

content = content.replace(createCommunicationPattern, createCommunicationReplacement);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ createCommunication method updated to use SecureDatabaseWrapper');
