#!/usr/bin/env node

// Script to add SecureDatabaseWrapper import to DatabaseManager.ts

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Adding SecureDatabaseWrapper import to DatabaseManager.ts...');

const databaseManagerPath = join('apps', 'cortex-os', 'packages', 'agents', 'src', 'legacy-instructions', 'DatabaseManager.ts');
let content = readFileSync(databaseManagerPath, 'utf-8');

// Add import for SecureDatabaseWrapper after the existing imports
if (!content.includes('SecureDatabaseWrapper')) {
  content = content.replace(
    'import { fileURLToPath } from "url";',
    'import { fileURLToPath } from "url";\nimport { SecureDatabaseWrapper } from "@cortex-os/mvp-core/src/secure-db";'
  );
}

// Add SecureDatabaseWrapper as a property
if (!content.includes('private secureDb: SecureDatabaseWrapper;')) {
  content = content.replace(
    'private db: any; // Database instance or in-memory fallback',
    'private db: any; // Database instance or in-memory fallback\n  private secureDb: SecureDatabaseWrapper;'
  );
}

// Update the constructor to initialize SecureDatabaseWrapper
content = content.replace(
  /private constructor\(\) \{[^}]*\}/,
  `private constructor() {
    super();
    this.statements = new Map();
  }`
);

// Update the initialize method to initialize SecureDatabaseWrapper
const initializePattern = /async initialize\(\): Promise<void> \{[^}]*\}/s;
if (initializePattern.test(content)) {
  content = content.replace(
    initializePattern,
    `async initialize(): Promise<void> {
    // Load SQLite wrapper functions
    await loadSQLiteWrapper();

    // Check if SQLite is available
    const sqliteAvailable = await isSQLiteAvailable();

    if (!sqliteAvailable) {
      console.warn(
        "SQLite not available, using in-memory storage for Hive Mind",
      );
      this.initializeInMemoryFallback();
      return;
    }

    try {
      // Ensure data directory exists
      const dataDir = path.join(process.cwd(), "data");
      await fs.mkdir(dataDir, { recursive: true });

      // Set database path
      this.dbPath = path.join(dataDir, "hive-mind.db");

      // Open database
      this.db = await createDatabase(this.dbPath);

      // Initialize SecureDatabaseWrapper
      this.secureDb = new SecureDatabaseWrapper(this.db);

      // Enable foreign keys
      this.db.pragma("foreign_keys = ON");

      // Load schema
      await this.loadSchema();

      // Prepare statements
      this.prepareStatements();

      this.emit("initialized");
    } catch (error) {
      console.error("Failed to initialize SQLite database:", error);
      console.warn("Falling back to in-memory storage");
      this.initializeInMemoryFallback();
    }
  }`
  );
}

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ SecureDatabaseWrapper import and initialization added to DatabaseManager.ts');