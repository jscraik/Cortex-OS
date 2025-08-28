#!/usr/bin/env node

// Script to clean up duplicated content in DatabaseManager.ts

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Cleaning up duplicated content in DatabaseManager.ts...');

const databaseManagerPath = join(
  'apps',
  'cortex-os',
  'packages/agents/src/legacy-instructions/DatabaseManager.ts',
);
let content = readFileSync(databaseManagerPath, 'utf-8');

// Remove duplicated content after the updateAgent method
const updateAgentEnd = content.indexOf('  }    }');
if (updateAgentEnd !== -1) {
  const nextMethodStart = content.indexOf('async updateAgentStatus', updateAgentEnd);
  if (nextMethodStart !== -1) {
    // Remove the duplicated content between the updateAgent method end and the next method start
    content = content.substring(0, updateAgentEnd + 3) + content.substring(nextMethodStart);
  }
}

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ Cleaned up duplicated content in DatabaseManager.ts');
