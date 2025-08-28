#!/usr/bin/env node

// Script to fix formatting issues in DatabaseManager.ts

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Fixing formatting issues in DatabaseManager.ts...');

const databaseManagerPath = join(
  'apps',
  'cortex-os',
  'packages/agents/src/legacy-instructions/DatabaseManager.ts',
);
let content = readFileSync(databaseManagerPath, 'utf-8');

// Fix the formatting issue where methods are concatenated
content = content.replace(/\}async updateAgentStatus/, '\n\n  async updateAgentStatus');

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ Fixed formatting issues in DatabaseManager.ts');
