import neo4j, { Driver } from 'neo4j-driver';
import { SecureNeo4j } from '@cortex-os/mvp-core/src/secure-neo4j';
import { KGNode, KGRel, Subgraph } from '../types.js';

export interface INeo4j {
  upsertNode(node: KGNode): Promise<void>;
  upsertRel(rel: KGRel): Promise<void>;
  neighborhood(nodeId: string, depth?: number): Promise<Subgraph>;
  close(): Promise<void>;
}

export function isValidNeo4jIdentifier(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
}

function assertLabelOrType(s: string) {
  // Safe subset of Cypher identifiers
  if (!isValidNeo4jIdentifier(s)) throw new Error(`neo4j:invalid_identifier:${s}`);
  return s;
}

export class Neo4j implements INeo4j {
  private driver: Driver;
  private secureNeo4j: SecureNeo4j;
  
  constructor(uri: string, user: string, pass: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pass), { userAgent: 'cortex-os/0.1' });
    // Initialize SecureNeo4j for secure operations
    this.secureNeo4j = new SecureNeo4j(uri, user, pass);
  }
  
  async close() {
    await this.driver.close();
  }

  async upsertNode(node: KGNode) {
    // Use SecureNeo4j for node upsert with validation
    try {
      await this.secureNeo4j.upsertNode({
        id: node.id,
        label: node.label,
        props: node.props
      });
    } catch (error) {
      console.error('Error upserting node:', error);
      throw error;
    }
  }

  async upsertRel(rel: KGRel) {
    // Use SecureNeo4j for relationship upsert with validation
    try {
      await this.secureNeo4j.upsertRel({
        from: rel.from,
        to: rel.to,
        type: rel.type,
        props: rel.props
      });
    } catch (error) {
      console.error('Error upserting relationship:', error);
      throw error;
    }
  }

  async neighborhood(nodeId: string, depth = 2): Promise<Subgraph> {
    // Use SecureNeo4j for neighborhood query with validation
    try {
      return await this.secureNeo4j.neighborhood(nodeId, depth);
    } catch (error) {
      console.error('Error querying neighborhood:', error);
      throw error;
    }
  }
});
  }
  async close() {
    await this.driver.close();
  }

  async upsertNode(node: KGNode) {
    const label = assertLabelOrType(node.label);
    const s = this.driver.session();
    try {
      // SECURITY FIX: Validate label before using in query
    const safeLabel = this.validateLabel(label);
    await s.run(`MERGE (n:${safeLabel} {id:$id}) SET n += $props`, {
      id: node.id,
      props: node.props,
    });
    } finally {
      await s.close();
    }
  }

  async upsertRel(rel: KGRel) {
    const type = assertLabelOrType(rel.type);
    const s = this.driver.session();
    try {
      await s.run(
        `MATCH (a {id:$from}), (b {id:$to})
         MERGE (a)-[r:${type}]->(b)
         SET r += $props`,
        { from: rel.from, to: rel.to, props: rel.props ?? {} },
      );
    } finally {
      await s.close();
    }
  }

  async neighborhood(nodeId: string, depth = 2): Promise<Subgraph> {
    const s = this.driver.session();
    try {
      const res = await s.run(
        `
        MATCH (n {id:$id})-[r*1..$d]-(m)
        WITH collect(distinct n) + collect(distinct m) AS ns
        UNWIND ns AS x
        WITH collect(distinct x) AS nodes
        MATCH (x)-[e]-(y) WHERE x IN nodes AND y IN nodes
        RETURN
          [n IN nodes | { id: n.id, label: head(labels(n)), props: properties(n) }] AS nodes,
          collect({ from: startNode(e).id, to: endNode(e).id, type: type(e), props: properties(e) }) AS rels
        `,
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
