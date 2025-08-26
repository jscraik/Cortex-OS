#!/usr/bin/env node

// Script to precisely update updateTask method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Precisely updating updateTask method to use SecureDatabaseWrapper...');

const databaseManagerPath = join('apps', 'cortex-os', 'packages', 'agents', 'src', 'legacy-instructions', 'DatabaseManager.ts');
let content = readFileSync(databaseManagerPath, 'utf-8');

// Find the exact updateTask method and replace it
const methodStart = content.indexOf('async updateTask(...) {');
if (methodStart !== -1) {
  // Find the end of the method
  let methodEnd = content.indexOf('  }\n', methodStart);
  if (methodEnd !== -1) {
    methodEnd += 4; // Include the closing brace and newline
    
    // Create the new method content
    const newMethodContent = `async updateTask(id: string, updates: any): Promise<void> {
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
    
    // Replace the old method with the new one
    content = content.substring(0, methodStart) + newMethodContent + content.substring(methodEnd);
    
    // Write the updated content back to the file
    writeFileSync(databaseManagerPath, content);
    
    console.log('✅ updateTask method precisely updated to use SecureDatabaseWrapper');
  } else {
    console.log('❌ Could not find end of updateTask method');
  }
} else {
  console.log('❌ Could not find updateTask method');
}