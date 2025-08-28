#!/usr/bin/env node

// Script to automatically update remaining database methods to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating remaining database methods to use SecureDatabaseWrapper...');

const databaseManagerPath = join(
  'apps',
  'cortex-os',
  'packages/agents/src/legacy-instructions/DatabaseManager.ts',
);
let content = readFileSync(databaseManagerPath, 'utf-8');

// Define patterns for methods that need to be updated
const methodPatterns = [
  {
    name: 'updateAgentStatus',
    pattern:
      /async updateAgentStatus\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.db\s*\.\s*prepare\("UPDATE agents SET status = \? WHERE id = \?"\)\s*\.\s*run\(status, id\);\s*}/s,
    replacement: `async updateAgentStatus(id: string, status: string): Promise<void> {
    // Validate input data
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid id provided to updateAgentStatus');
    }
    
    if (!status || typeof status !== 'string') {
      throw new Error('Invalid status provided to updateAgentStatus');
    }
    
    // Validate id and status formats
    if (!this.secureDb.validateInput(id, 'id')) {
      throw new Error('Invalid id format');
    }
    
    if (!this.secureDb.validateInput(status, 'status')) {
      throw new Error('Invalid status format');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun("UPDATE agents SET status = ? WHERE id = ?", status, id);
    } catch (error) {
      console.error('Error updating agent status:', error);
      throw error;
    }
  }`,
  },
  {
    name: 'createTask',
    pattern:
      /async createTask\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.statements\.get\("createTask"\)\!\.run\(\{[^}]*?\}\);\s*}/s,
    replacement: `async createTask(data: any): Promise<void> {
    // Validate input data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data provided to createTask');
    }
    
    // Validate required fields
    if (!data.id || !data.swarm_id) {
      throw new Error('Missing required fields in task data');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun(
        "INSERT INTO tasks (id, swarm_id, name, description, priority, status, config, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        data.id, data.swarm_id, data.name, data.description, data.priority, data.status, JSON.stringify(data.config), data.created_at
      );
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }`,
  },
  {
    name: 'updateTaskStatus',
    pattern:
      /async updateTaskStatus\([^}]*?SecureDatabaseWrapper for this operation[^}]*?this\.statements\.get\("updateTaskStatus"\)\!\.run\(status, id\);\s*}/s,
    replacement: `async updateTaskStatus(id: string, status: string): Promise<void> {
    // Validate input data
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid id provided to updateTaskStatus');
    }
    
    if (!status || typeof status !== 'string') {
      throw new Error('Invalid status provided to updateTaskStatus');
    }
    
    // Validate id and status formats
    if (!this.secureDb.validateInput(id, 'id')) {
      throw new Error('Invalid id format');
    }
    
    if (!this.secureDb.validateInput(status, 'status')) {
      throw new Error('Invalid status format');
    }
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      this.secureDb.secureRun("UPDATE tasks SET status = ? WHERE id = ?", status, id);
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }`,
  },
];

// Apply all the replacements
let updatedMethods = 0;
for (const { name, pattern, replacement } of methodPatterns) {
  if (pattern.test(content)) {
    content = content.replace(pattern, replacement);
    console.log(`✅ Updated ${name} method to use SecureDatabaseWrapper`);
    updatedMethods++;
  } else {
    console.log(`⚠️  Could not find ${name} method to update`);
  }
}

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log(`✅ Updated ${updatedMethods} methods to use SecureDatabaseWrapper`);
