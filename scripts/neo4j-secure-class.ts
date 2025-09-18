export class Neo4j implements INeo4j {
	private driver: Driver;
	private secureNeo4j: SecureNeo4j;

	constructor(uri: string, user: string, pass: string) {
		this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pass), {
			userAgent: 'cortex-os/0.1',
		});
		this.secureNeo4j = new SecureNeo4j(uri, user, pass);
	}

	async close() {
		await this.driver.close();
		await this.secureNeo4j.close();
	}

	async upsertNode(node: KGNode) {
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
		try {
			return await this.secureNeo4j.neighborhood(nodeId, depth);
		} catch (error) {
			console.error('Error querying neighborhood:', error);
			throw error;
		}
	}
}
