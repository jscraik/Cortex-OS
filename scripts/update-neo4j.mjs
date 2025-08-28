#!/usr/bin/env node

// Idempotent updater: replace the entire Neo4j class with a
// SecureNeo4j-backed implementation using safe template literals.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const neo4jPath = join('packages', 'memories', 'src', 'adapters', 'neo4j.ts');

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
  const secureClass = `export class Neo4j implements INeo4j {\n  private driver: Driver;\n  private secureNeo4j: SecureNeo4j;\n\n  constructor(uri: string, user: string, pass: string) {\n    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pass), { userAgent: 'cortex-os/0.1' });\n    this.secureNeo4j = new SecureNeo4j(uri, user, pass);\n  }\n\n  async close() {\n    await this.driver.close();\n    await this.secureNeo4j.close();\n  }\n\n  async upsertNode(node: KGNode) {\n    try {\n      await this.secureNeo4j.upsertNode({ id: node.id, label: node.label, props: node.props });\n    } catch (error) {\n      console.error('Error upserting node:', error);\n      throw error;\n    }\n  }\n\n  async upsertRel(rel: KGRel) {\n    try {\n      await this.secureNeo4j.upsertRel({ from: rel.from, to: rel.to, type: rel.type, props: rel.props });\n    } catch (error) {\n      console.error('Error upserting relationship:', error);\n      throw error;\n    }\n  }\n\n  async neighborhood(nodeId: string, depth = 2): Promise<Subgraph> {\n    try {\n      return await this.secureNeo4j.neighborhood(nodeId, depth);\n    } catch (error) {\n      console.error('Error querying neighborhood:', error);\n      throw error;\n    }\n  }\n}\n`;

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


console.log('✅ neo4j.ts has been updated to use SecureNeo4j');
console.log('⚠️  Please review the TODO comments and fully implement the secure operations');"

