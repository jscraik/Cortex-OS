#!/usr/bin/env node

// Script to update updateAgent method to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating updateAgent method to use SecureDatabaseWrapper...');

const databaseManagerPath = join(
  'apps',
  'cortex-os',
  'packages/agents/src/legacy-instructions/DatabaseManager.ts',
);
let content = readFileSync(databaseManagerPath, 'utf-8');

// Find the exact updateAgent method and replace it
const methodStart = content.indexOf('async updateAgent(...) {');
if (methodStart !== -1) {
  // Find the end of the method
  let methodEnd = content.indexOf('  }\n', methodStart);
  if (methodEnd !== -1) {
    methodEnd += 4; // Include the closing brace and newline

    // Extract the method content
    const methodContent = content.substring(methodStart, methodEnd);

    // Create the new method content
    const newMethodContent = `async updateAgent(id: string, updates: any): Promise<void> {
    // Validate input data
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid id provided to updateAgent');
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid updates provided to updateAgent');
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
      const query = "UPDATE agents SET " + setClauses.join(", ") + " WHERE id = ?";
      this.secureDb.secureRun(query, ...values);
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  }`;

    // Replace the old method with the new one
    content = content.substring(0, methodStart) + newMethodContent + content.substring(methodEnd);

    // Write the updated content back to the file
    writeFileSync(databaseManagerPath, content);

    console.log('✅ updateAgent method updated to use SecureDatabaseWrapper');
  } else {
    console.log('❌ Could not find end of updateAgent method');
  }
} else {
  console.log('❌ Could not find updateAgent method');
}
