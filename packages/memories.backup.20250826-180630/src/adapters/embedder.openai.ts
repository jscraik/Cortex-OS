import type { Embedder } from "../ports/Embedder.js";

export class OpenAIEmbedder implements Embedder {
  constructor(private opts: { apiKey?: string; model?: string } = {}) {}
  name() { return this.opts.model ?? "text-embedding-3-small"; }
  async embed(texts: string[]): Promise<number[][]> {
    const apiKey = this.opts.apiKey ?? process.env.OPENAI_API_KEY;
    const model = this.opts.model ?? "text-embedding-3-small";
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ input: texts, model })
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const json: any = await res.json();
    return json.data.map((d: any) => d.embedding as number[]);
  }
}

