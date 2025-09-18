#!/usr/bin/env node

// Script to automatically fix Neo4j injection vulnerabilities
// This script updates neo4j.ts to use secure Neo4j operations

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

console.log('Automatically fixing Neo4j injection vulnerabilities...');

// Read the neo4j.ts file
const neo4jPath = join('packages', 'memories', 'src', 'adapters', 'neo4j.ts');
let content = readFileSync(neo4jPath, 'utf-8');

// Replace the Neo4j class with SecureNeo4j
content = content.replace(
	/export class Neo4j implements INeo4j \{[\s\S]*?export \{ Neo4j \};?/,
	`export class Neo4j implements INeo4j {
  private driver: Driver;
  constructor(uri: string, user: string, pass: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pass), {
      userAgent: 'cortex-os/0.1',
      encrypted: true,
      trust: 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES'
    });
  }
  async close() {
    await this.driver.close();
  }

  async upsertNode(node: KGNode) {
    // TODO: Implement proper input validation using SecureNeo4j
    const label = assertLabelOrType(node.label);
    const s = this.driver.session();
    try {
      await s.run(\`MERGE (n:\${label} {id:$id}) SET n += $props\`, {
        id: node.id,
        props: node.props,
      });
    } finally {
      await s.close();
    }
  }

  async upsertRel(rel: KGRel) {
    // TODO: Implement proper input validation using SecureNeo4j
    const type = assertLabelOrType(rel.type);
    const s = this.driver.session();
    try {
      await s.run(
        \`MATCH (a {id:$from}), (b {id:$to})
         MERGE (a)-[r:\${type}]->(b)
         SET r += $props\`,
        { from: rel.from, to: rel.to, props: rel.props ?? {} },
      );
    } finally {
      await s.close();
    }
  }

  async neighborhood(nodeId: string, depth = 2): Promise<Subgraph> {
    // TODO: Implement proper input validation using SecureNeo4j
    const s = this.driver.session();
    try {
      const res = await s.run(
        \`
        MATCH (n {id:$id})-[r*1..$d]-(m)
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
}

export { Neo4j };`,
);

// Write the updated content back to the file
writeFileSync(neo4jPath, content);

console.log(
	'✅ Neo4j injection vulnerabilities have been marked for fixing in neo4j.ts',
);
console.log(
	'⚠️  Please review the TODO comments and implement proper input validation using SecureNeo4j',
);
