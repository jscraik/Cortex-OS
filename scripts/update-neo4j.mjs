#!/usr/bin/env node

// Idempotent updater: ensure neo4j.ts delegates to SecureNeo4j without injecting raw Cypher strings.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const neo4jPath = join('packages', 'memories', 'src', 'adapters', 'neo4j.ts');

function log(msg) {
  console.log(`[update-neo4j] ${msg}`);
}

function tryUpdate() {
  let content = readFileSync(neo4jPath, 'utf-8');

  // If already using SecureNeo4j delegation, do nothing
  const alreadySecure = content.includes('new SecureNeo4j(') &&
    content.includes('this.secureNeo4j') &&
    content.includes('return await this.secureNeo4j.neighborhood') &&
    content.includes('await this.secureNeo4j.upsertNode') &&
    content.includes('await this.secureNeo4j.upsertRel');

  if (alreadySecure) {
    log('neo4j.ts already delegates to SecureNeo4j. No changes needed.');
    return false;
  }

  let updated = false;

  // Ensure import exists
  if (!content.includes("from '@cortex-os/utils'")) {
    // Insert SecureNeo4j import before the first non-comment import line
    content = content.replace(
      /(import [^\n]+\n)/,
      (m) => `import { SecureNeo4j } from '@cortex-os/utils';\n${m}`,
    );
    updated = true;
  }

  // Ensure secureNeo4j property exists
  if (!content.includes('private secureNeo4j: SecureNeo4j;')) {
    content = content.replace(
      /(private driver: Driver;\s*)/,
      `$1\n  private secureNeo4j: SecureNeo4j;\n`,
    );
    updated = true;
  }

  // Ensure constructor initializes secureNeo4j
  if (!content.includes('this.secureNeo4j = new SecureNeo4j')) {
    content = content.replace(
      /(constructor\([^)]*\)\s*\{[\s\S]*?\})/,
      (m) => m.replace(/\}\s*$/, `    this.secureNeo4j = new SecureNeo4j(uri, user, pass);\n  }`),
    );
    updated = true;
  }

  // Replace upsertNode body
  content = content.replace(
    /async upsertNode\([^)]*\)\s*\{[\s\S]*?\}/,
    `async upsertNode(node: KGNode) {\n    try {\n      await this.secureNeo4j.upsertNode({ id: node.id, label: node.label, props: node.props });\n    } catch (error) {\n      console.error('Error upserting node:', error);\n      throw error;\n    }\n  }`,
  );

  // Replace upsertRel body
  content = content.replace(
    /async upsertRel\([^)]*\)\s*\{[\s\S]*?\}/,
    `async upsertRel(rel: KGRel) {\n    try {\n      await this.secureNeo4j.upsertRel({ from: rel.from, to: rel.to, type: rel.type, props: rel.props });\n    } catch (error) {\n      console.error('Error upserting relationship:', error);\n      throw error;\n    }\n  }`,
  );

  // Replace neighborhood body
  content = content.replace(
    /async neighborhood\([^)]*\)\s*\{[\s\S]*?\}/,
    `async neighborhood(nodeId: string, depth = 2): Promise<Subgraph> {\n    try {\n      return await this.secureNeo4j.neighborhood(nodeId, depth);\n    } catch (error) {\n      console.error('Error querying neighborhood:', error);\n      throw error;\n    }\n  }`,
  );

  // Ensure close also closes secureNeo4j
  if (!content.includes('await this.secureNeo4j.close();')) {
    content = content.replace(
      /async close\(\)\s*\{[\s\S]*?\}/,
      `async close() {\n    await this.driver.close();\n    await this.secureNeo4j.close();\n  }`,
    );
    updated = true;
  }

  if (updated) {
    writeFileSync(neo4jPath, content);
    log('neo4j.ts has been updated to delegate to SecureNeo4j.');
  } else {
    log('No applicable changes were made (patterns not matched).');
  }

  return updated;
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
