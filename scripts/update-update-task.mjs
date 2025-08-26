#!/usr/bin/env node

// Script to update updateTask method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating updateTask method to use SecureDatabaseWrapper...');

const databaseManagerPath = join('apps', 'cortex-os', 'packages/agents/src/legacy-instructions/DatabaseManager.ts');
let content = readFileSync(databaseManagerPath, 'utf-8');

// Update the updateTask method
const updateTaskPattern = /async updateTask\([^}]*?SecureDatabaseWrapper for this operation[^}]*?stmt\.run\(\.\.\.values\);\s*}/s;
const updateTaskReplacement = `async updateTask(id: string, updates: any): Promise<void> {
    // Validate input data
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid id provided to updateTask');
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid updates provided to updateTask');
    }
    
    // Build set clauses and values
    const setClauses: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      // Prevent raw SQL injection
      if (value && typeof value === "object" && (value as any)._raw) {
        throw new Error('Raw SQL injection detected');
      }
      
      setClauses.push(key + " = ?");
      values.push(value);
    }
    
    // Validate that we have something to update
    if (setClauses.length === 0) {
      throw new Error('No updates provided');
    }
    
    values.push(id);
    
    // Use SecureDatabaseWrapper to execute the operation
    try {
      const query = "UPDATE tasks SET " + setClauses.join(", ") + " WHERE id = ?";
      this.secureDb.secureRun(query, ...values);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }`;

content = content.replace(updateTaskPattern, updateTaskReplacement);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ updateTask method updated to use SecureDatabaseWrapper');