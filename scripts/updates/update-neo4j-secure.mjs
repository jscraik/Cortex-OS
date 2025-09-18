#!/usr/bin/env node

// Script to update neo4j.ts to use SecureNeo4j

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

console.log('Updating neo4j.ts to use SecureNeo4j...');

const neo4jPath = join('packages', 'memories', 'src', 'adapters', 'neo4j.ts');
let content = readFileSync(neo4jPath, 'utf-8');

// Add import for SecureNeo4j
if (!content.includes('SecureNeo4j')) {
	content = content.replace(
		"import neo4j, { Driver } from 'neo4j-driver';",
		"import neo4j, { Driver } from 'neo4j-driver';\nimport { SecureNeo4j } from '@cortex-os/utils';",
	);
}

// Update the Neo4j class to extend SecureNeo4j and use its methods
content = content.replace(
	/export class Neo4j implements INeo4j \{[^}]*\}/s,
	`export class Neo4j implements INeo4j {
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
}`,
);

// Write the updated content back to the file
writeFileSync(neo4jPath, content);

console.log('✅ neo4j.ts updated to use SecureNeo4j');
