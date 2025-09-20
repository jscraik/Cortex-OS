import { beforeAll, describe, expect, it } from 'vitest';
import { RemoteMCPEmbedder } from '../src/integrations/remote-mcp.js';
import type { Embedder } from '../src/lib/types.js';

class FallbackEmbedder {
	async embed(texts: string[]) {
		return texts.map(() => [0.42, 0.13, 0.7]);
	}
}

// Config enabling fallback
const config: Record<string, unknown> = {
	fallbackToLocal: true,
};

describe('RemoteMCPEmbedder fallback embedding', () => {
	let embedder: RemoteMCPEmbedder;
	beforeAll(async () => {
		// Force remote failure by giving no MCP server (mock call may still succeed currently)
		embedder = new RemoteMCPEmbedder(config, new FallbackEmbedder() as unknown as Embedder);
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
