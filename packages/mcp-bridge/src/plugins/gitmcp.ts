// @ts-nocheck
import { RemoteSSEClient } from '@modelcontextprotocol/sdk/client/sse.js';
import { z } from 'zod';

const SearchHit = z.object({
  title: z.string(),
  url: z.string().url(),
  score: z.number().optional(),
  snippet: z.string().optional(),
});
const SearchResponse = z.object({ results: z.array(SearchHit) });
const FetchResponse = z.object({ content: z.string().min(1) });

export class GitMCP {
  private client: RemoteSSEClient;
  constructor(private base = 'https://gitmcp.io') {
    // bootstrap endpoint; per-repo tools are exposed dynamically by GitMCP
    this.client = new RemoteSSEClient({ url: `${base}/idosal/git-mcp` });
  }
  async connect() {
    await this.client.connect();
  }
  private tool(repo: string, kind: 'fetch' | 'search') {
    const safe = repo.replace('/', '_');
    return `${kind}_${safe}_documentation`;
  }
  async fetch(ownerRepo: string) {
    const res = await this.client.callTool(this.tool(ownerRepo, 'fetch'), {});
    return FetchResponse.parse(res);
  }
  async search(ownerRepo: string, query: string, limit = 8) {
    const res = await this.client.callTool(this.tool(ownerRepo, 'search'), {
      query,
      limit,
    });
    return SearchResponse.parse(res);
  }
  async close() {
    await this.client.close();
  }
}

export type { z };
