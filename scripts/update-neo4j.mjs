#!/usr/bin/env node

// Idempotent updater: replace the entire Neo4j class with a
// SecureNeo4j-backed implementation using a readable template file and
// balanced brace matching instead of fragile regex.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const neo4jPath = join('packages', 'memories', 'src', 'adapters', 'neo4j.ts');
const secureClassPath = fileURLToPath(new URL('./templates/neo4j-secure-class.ts', import.meta.url));

function log(msg) {
  console.log(`[update-neo4j] ${msg}`);
}

function replaceNeo4jClass(content, replacement) {
  const classToken = 'export class Neo4j implements INeo4j';
  const start = content.indexOf(classToken);
  if (start === -1) return null;

  const braceStart = content.indexOf('{', start + classToken.length);
  if (braceStart === -1) return null;

  let depth = 1;
  let i = braceStart + 1;
  while (i < content.length && depth > 0) {
    const ch = content[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }

  if (depth !== 0) return null;
  const end = i; // index after closing brace

  return content.slice(0, start) + replacement + content.slice(end);
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

  const secureClass = readFileSync(secureClassPath, 'utf-8');
  const replaced = replaceNeo4jClass(content, `${secureClass}\n`);
  if (replaced === null) {
    throw new Error('Neo4j class definition not found');
  }

  writeFileSync(neo4jPath, replaced);
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



console.log('✅ neo4j.ts has been updated to use SecureNeo4j');
console.log('⚠️  Please review the TODO comments and fully implement the secure operations');"


