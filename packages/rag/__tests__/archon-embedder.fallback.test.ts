import { beforeAll, describe, expect, it } from 'vitest';
import { ArchonEmbedder } from '../src/integrations/archon-mcp.js';

class FallbackEmbedder {
	async embed(texts: string[]) {
		return texts.map(() => [0.42, 0.13, 0.7]);
	}
}

// Config enabling fallback
const config: any = {
	fallbackToLocal: true,
};

describe('ArchonEmbedder fallback embedding', () => {
	let embedder: ArchonEmbedder;
	beforeAll(async () => {
		// Force remote failure by giving no MCP server (mock call may still succeed currently)
		embedder = new ArchonEmbedder(config, new FallbackEmbedder() as any);
		await embedder.initialize();
	});

	it('returns fallback embeddings when remote fails (documented expected future behavior)', async () => {
		// We simulate remote failure by monkey patching mcpClient.callTool
		// @ts-expect-error accessing private for test poke
		embedder.mcpClient.callTool = async () => {
			throw new Error('remote down');
		};
		const vectors = await embedder.embed(['hello world']);
		expect(vectors.length).toBe(1);
		expect(vectors[0].length).toBeGreaterThan(0);
	});
});
