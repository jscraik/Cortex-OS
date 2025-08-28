#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

// Idempotent updater: replace the entire Neo4j class with a
// SecureNeo4j-backed implementation using a separate template file.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const neo4jPath = join('packages', 'memories', 'src', 'adapters', 'neo4j.ts');
const templatePath = join('scripts', 'neo4j-secure-class.ts');
const secureClass = readFileSync(templatePath, 'utf-8');

function log(msg) {
  console.log(`[update-neo4j] ${msg}`);
}

function tryUpdate() {
  let content = readFileSync(neo4jPath, 'utf-8');

  // If already using SecureNeo4j delegation, do nothing
  const alreadySecure =
    content.includes('new SecureNeo4j(') &&
    content.includes('this.secureNeo4j') &&
    content.includes('return await this.secureNeo4j.neighborhood') &&
    content.includes('await this.secureNeo4j.upsertNode') &&
    content.includes('await this.secureNeo4j.upsertRel');

  if (alreadySecure) {
    log('neo4j.ts already delegates to SecureNeo4j. No changes needed.');
    return false;
  }

  // Ensure SecureNeo4j import exists
  if (!content.includes("from '@cortex-os/utils'")) {
    content = content.replace(
      /(import [^\n]+\n)/,
      (m) => `import { SecureNeo4j } from '@cortex-os/utils';\n${m}`,
    );
  }

  // Replace entire class body with a secure implementation
  const classRegex = /export class Neo4j implements INeo4j {[\s\S]*?}\n?$/;
  content = content.replace(classRegex, secureClass);
  writeFileSync(neo4jPath, content);
  log('neo4j.ts has been updated to delegate to SecureNeo4j.');
  return true;
}

try {
  const changed = tryUpdate();
  if (changed) {
    log('✅ Update complete.');
  } else {
    log('ℹ️  Nothing to update.');
  }
} catch (err) {
  console.error('[update-neo4j] Failed to update neo4j.ts:', err);
  process.exit(1);
}

