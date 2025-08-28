import { SecureNeo4j } from '@cortex-os/utils';
import neo4j, { Driver } from 'neo4j-driver';
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
    await this.secureNeo4j.close();
  }

  async upsertNode(node: KGNode) {
    // Use SecureNeo4j for node upsert with validation
    try {
      await this.secureNeo4j.upsertNode({
        id: node.id,
        label: node.label,
        props: node.props,
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
        props: rel.props,
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
}
