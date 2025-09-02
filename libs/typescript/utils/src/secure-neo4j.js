import neo4j from "neo4j-driver";
import { validateNeo4jInput } from "./validation.js";
// Secure Neo4j wrapper that prevents injection vulnerabilities
export class SecureNeo4j {
	driver;
	sessionPool = [];
	maxPoolSize = 10;
	activeSessions = 0;
	constructor(uri, user, pass) {
		this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pass), {
			userAgent: "cortex-os/0.1",
			// Add security configurations
			encrypted: true,
			trust: "TRUST_SYSTEM_CA_SIGNED_CERTIFICATES",
			// Add connection pooling configurations
			maxConnectionPoolSize: this.maxPoolSize,
			connectionAcquisitionTimeout: 60000,
			connectionTimeout: 30000,
		});
	}
	async close() {
		// Close all sessions in the pool
		for (const session of this.sessionPool) {
			await session.close();
		}
		this.sessionPool = [];
		await this.driver.close();
	}
	// Get a session from the pool or create a new one
	getSession() {
		if (this.sessionPool.length > 0) {
			return this.sessionPool.pop();
		}
		if (this.activeSessions < this.maxPoolSize) {
			this.activeSessions++;
			return this.driver.session();
		}
		throw new Error("Maximum session pool size reached");
	}
	// Return a session to the pool
	returnSession(session) {
		if (this.sessionPool.length < this.maxPoolSize) {
			this.sessionPool.push(session);
		} else {
			session.close();
			this.activeSessions--;
		}
	}
	// Secure node upsert with validation
	async upsertNode(node) {
		// Validate inputs
		const idValidation = validateNeo4jInput.nodeId(node.id);
		const labelValidation = validateNeo4jInput.label(node.label);
		if (!idValidation.success) {
			throw new Error(`Invalid node ID: ${idValidation.error}`);
		}
		if (!labelValidation.success) {
			throw new Error(`Invalid label: ${labelValidation.error}`);
		}
		// Validate properties
		this.validateProperties(node.props);
		const session = this.getSession();
		try {
			// Use parameterized query to prevent injection
			// SECURITY FIX: Use validated label directly
			await session.run(
				`MERGE (n:${labelValidation.data} {id: $id}) SET n += $props`,
				{
					id: idValidation.data,
					props: node.props,
				},
			);
		} finally {
			this.returnSession(session);
		}
	}
	// Secure relationship upsert with validation
	async upsertRel(rel) {
		// Validate inputs
		const fromValidation = validateNeo4jInput.nodeId(rel.from);
		const toValidation = validateNeo4jInput.nodeId(rel.to);
		const typeValidation = validateNeo4jInput.type(rel.type);
		if (!fromValidation.success) {
			throw new Error(`Invalid from node ID: ${fromValidation.error}`);
		}
		if (!toValidation.success) {
			throw new Error(`Invalid to node ID: ${toValidation.error}`);
		}
		if (!typeValidation.success) {
			throw new Error(`Invalid relationship type: ${typeValidation.error}`);
		}
		// Validate properties
		if (rel.props) {
			this.validateProperties(rel.props);
		}
		const session = this.getSession();
		try {
			// Use parameterized query to prevent injection
			await session.run(
				`MATCH (a {id: $from}), (b {id: $to})
         MERGE (a)-[r:${typeValidation.data}]->(b)
         SET r += $props`,
				{
					from: fromValidation.data,
					to: toValidation.data,
					props: rel.props || {},
				},
			);
		} finally {
			this.returnSession(session);
		}
	}
	// Secure neighborhood query with validation
	async neighborhood(nodeId, depth = 2) {
		// Validate inputs
		const idValidation = validateNeo4jInput.nodeId(nodeId);
		if (!idValidation.success) {
			throw new Error(`Invalid node ID: ${idValidation.error}`);
		}
		// Validate depth (prevent excessive resource usage)
		if (depth < 1 || depth > 5) {
			throw new Error("Depth must be between 1 and 5");
		}
		const session = this.getSession();
		try {
			// Use parameterized query to prevent injection
			const result = await session.run(
				`
        MATCH (n {id: $id})-[r*1..$depth]-(m)
        WITH collect(distinct n) + collect(distinct m) AS ns
        UNWIND ns AS x
        WITH collect(distinct x) AS nodes
        MATCH (x)-[e]-(y) WHERE x IN nodes AND y IN nodes
        RETURN
          [n IN nodes | { id: n.id, label: head(labels(n)), props: properties(n) }] AS nodes,
          collect({ from: startNode(e).id, to: endNode(e).id, type: type(e), props: properties(e) }) AS rels`,
				{
					id: idValidation.data,
					depth: depth,
				},
			);
			const record = result.records[0];
			const nodes = record?.get("nodes") ?? [];
			const rels = record?.get("rels") ?? [];
			return {
				nodes: nodes.map((n) => ({ id: n.id, label: n.label, props: n.props })),
				rels: rels.map((r) => ({
					from: r.from,
					to: r.to,
					type: r.type,
					props: r.props,
				})),
			};
		} finally {
			this.returnSession(session);
		}
	}
	// Validate properties to prevent injection
	validateProperties(props) {
		for (const [key, value] of Object.entries(props)) {
			// Validate property keys
			const keySchema = validateNeo4jInput.label(key);
			if (!keySchema.success) {
				throw new Error(`Invalid property key: ${key}`);
			}
			// Validate property values
			if (typeof value === "string") {
				// Prevent very long strings that could be used for DoS
				if (value.length > 10000) {
					throw new Error(`Property value too long for key: ${key}`);
				}
				// Prevent dangerous patterns in strings
				if (/[;'"`<>(){}]/.test(value)) {
					throw new Error(
						`Invalid characters in property value for key: ${key}`,
					);
				}
			} else if (typeof value === "object" && value !== null) {
				// Recursively validate nested objects
				this.validateProperties(value);
			}
		}
	}
	// Get connection pool statistics
	getPoolStats() {
		return {
			activeSessions: this.activeSessions,
			pooledSessions: this.sessionPool.length,
			maxPoolSize: this.maxPoolSize,
		};
	}
}
//# sourceMappingURL=secure-neo4j.js.map
