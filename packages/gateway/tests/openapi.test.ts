import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

test('openapi.json is generated and includes expected structure', () => {
	const openapiPath = path.resolve(__dirname, '..', 'openapi.json');
	expect(existsSync(openapiPath)).toBe(true);

	const raw = readFileSync(openapiPath, 'utf8');
	const doc = JSON.parse(raw);

	// Basic top-level fields
	expect(doc.openapi).toBeDefined();
	expect(doc.info).toBeDefined();
	expect(doc.info.title).toBe('Cortex-OS Gateway');

	// Paths
	expect(doc.paths).toBeDefined();
	for (const p of ['/mcp', '/a2a', '/rag', '/simlab']) {
		expect(Object.keys(doc.paths)).toContain(p);
		const post = doc.paths[p]?.post;
		expect(post).toBeDefined();
		const content = post.requestBody?.content?.['application/json'];
		expect(content?.schema).toBeDefined();
	}

	// Schemas we define in the generator
	const schemas = doc.components?.schemas ?? {};
	for (const s of ['AgentConfig', 'MCPBody', 'A2ABody', 'RAGBody', 'SimlabBody']) {
		expect(Object.keys(schemas)).toContain(s);
	}
});
