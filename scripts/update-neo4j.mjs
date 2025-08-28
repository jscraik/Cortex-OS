#!/usr/bin/env node

// Script to update neo4j.ts to use SecureNeo4j

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating neo4j.ts to use SecureNeo4j...');

const neo4jPath = join('packages', 'memories', 'src', 'adapters', 'neo4j.ts');
let content = readFileSync(neo4jPath, 'utf-8');

// Add import for SecureNeo4j
if (!content.includes('SecureNeo4j')) {
  content = content.replace(
    "import neo4j, { Driver } from 'neo4j-driver';",
    `import neo4j, { Driver } from 'neo4j-driver';
import { SecureNeo4j } from '@cortex-os/utils';`,
  );
}

// Update the Neo4j class to extend or use SecureNeo4j
content = content.replace(
  /export class Neo4j implements INeo4j \{[^}]*\}/s,
  `export class Neo4j implements INeo4j {
  private driver: Driver;
  private secureNeo4j: SecureNeo4j;
  
  constructor(uri: string, user: string, pass: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pass), { userAgent: 'cortex-os/0.1' });
    // TODO: Initialize SecureNeo4j
    // this.secureNeo4j = new SecureNeo4j(uri, user, pass);
  }
  
  async close() {
    await this.driver.close();
  }

  async upsertNode(node: KGNode) {
    // TODO: Use SecureNeo4j for node upsert
    const label = assertLabelOrType(node.label);
    const s = this.driver.session();
    try {
      await s.run(` +
    '`MERGE (n:${label} {id:$id}) SET n += $props`' +
    `, {
        id: node.id,
        props: node.props,
      });
    } finally {
      await s.close();
    }
  }

  async upsertRel(rel: KGRel) {
    // TODO: Use SecureNeo4j for relationship upsert
    const type = assertLabelOrType(rel.type);
    const s = this.driver.session();
    try {
      await s.run(` +
    '`MATCH (a {id:$from}), (b {id:$to})\n         MERGE (a)-[r:${type}]->(b)\n         SET r += $props`' +
    `,
        { from: rel.from, to: rel.to, props: rel.props ?? {} },
      );
    } finally {
      await s.close();
    }
  }

  async neighborhood(nodeId: string, depth = 2): Promise<Subgraph> {
    // TODO: Use SecureNeo4j for neighborhood query
    const s = this.driver.session();
    try {
      const res = await s.run(` +
    '`\n        MATCH (n {id:$id})-[r*1..$d]-(m)\n        WITH collect(distinct n) + collect(distinct m) AS ns\n        UNWIND ns AS x\n        WITH collect(distinct x) AS nodes\n        MATCH (x)-[e]-(y) WHERE x IN nodes AND y IN nodes\n        RETURN`' +
    `,
        { id: nodeId, d: depth },
      );
      // TODO: map res to Subgraph
      return { nodes: [], rels: [] } as unknown as Subgraph;
    } finally {
      await s.close();
    }
  }
}
`,
);

// Write the updated content back to the file
writeFileSync(neo4jPath, content);

console.log('✅ neo4j.ts has been updated to include SecureNeo4j scaffolding');
console.log('⚠️  Please review and complete the SecureNeo4j integration');
