#!/usr/bin/env node

// Script to update DatabaseManager.ts to use SecureDatabaseWrapper

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating DatabaseManager.ts to use SecureDatabaseWrapper...');

const databaseManagerPath = join('apps', 'cortex-os', 'packages', 'agents', 'src', 'legacy-instructions', 'DatabaseManager.ts');
let content = readFileSync(databaseManagerPath, 'utf-8');

// Add import for SecureDatabaseWrapper
if (!content.includes('SecureDatabaseWrapper')) {
  content = content.replace(
    "import { Database } from 'better-sqlite3';",
    "import { Database } from 'better-sqlite3';
import { SecureDatabaseWrapper } from '@cortex-os/mvp-core/src/secure-db';"
  );
}

// Add SecureDatabaseWrapper as a property
if (!content.includes('private secureDb: SecureDatabaseWrapper;')) {
  content = content.replace(
    'private db: Database;',
    'private db: Database;
  private secureDb: SecureDatabaseWrapper;'
  );
}

// Update the constructor to initialize SecureDatabaseWrapper
content = content.replace(
  /constructor\(dbPath: string\) \{/,
  `constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.secureDb = new SecureDatabaseWrapper(this.db);`
);

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ DatabaseManager.ts has been updated to use SecureDatabaseWrapper');
console.log('⚠️  Please review the methods and update them to use secure operations');