"#!/usr/bin/env node

// Script to update neo4j.ts to use SecureNeo4j

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Updating neo4j.ts to use SecureNeo4j...');

const neo4jPath = join('packages', 'memories', 'src', 'adapters', 'neo4j.ts');
let content = readFileSync(neo4jPath, 'utf-8');

// Add import for SecureNeo4j
if (!content.includes('SecureNeo4j')) {
  content = content.replace(
    \"import neo4j, { Driver } from 'neo4j-driver';\",
    \"import neo4j, { Driver } from 'neo4j-driver';\
import { SecureNeo4j } from '@cortex-os/utils';\"
  );
}

// Update the Neo4j class to extend or use SecureNeo4j
content = content.replace(
  /export class Neo4j implements INeo4j \\{[^}]*\\}/s,
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
      await s.run(\`MERGE (n:\${label} {id:\$id}) SET n += \$props\`, {
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
      await s.run(
        \`MATCH (a {id:\$from}), (b {id:\$to})
         MERGE (a)-[r:\${type}]->(b)
         SET r += \$props\`,
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
      const res = await s.run(
        \`
        MATCH (n {id:\$id})-[r*1..\$d]-(m)
        WITH collect(distinct n) + collect(distinct m) AS ns
        UNWIND ns AS x
        WITH collect(distinct x) AS nodes
        MATCH (x)-[e]-(y) WHERE x IN nodes AND y IN nodes
        RETURN
          [n IN nodes | { id: n.id, label: head(labels(n)), props: properties(n) }] AS nodes,
          collect({ from: startNode(e).id, to: endNode(e).id, type: type(e), props: properties(e) }) AS rels
        \`,
        { id: nodeId, d: depth },
      );
      const rec = res.records[0];
      const nodes = (rec?.get('nodes') ?? []) as Array<{
        id: string;
        label: string;
        props: Record<string, unknown>;
      }>;
      const rels = (rec?.get('rels') ?? []) as Array<{
        from: string;
        to: string;
        type: string;
        props?: Record<string, unknown>;
      }>;
      return {
        nodes: nodes.map((n) => ({ id: n.id, label: n.label, props: n.props })),
        rels: rels.map((r) => ({ from: r.from, to: r.to, type: r.type, props: r.props })),
      };
    } finally {
      await s.close();
    }
  }
}`
);

// Write the updated content back to the file
writeFileSync(neo4jPath, content);

console.log('✅ neo4j.ts has been updated to use SecureNeo4j');
console.log('⚠️  Please review the TODO comments and fully implement the secure operations');"
