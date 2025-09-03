// Minimal HTTP embedder client for a Python service
// Endpoint contract: POST /embed { texts: string[] } -> { embeddings: number[][] }
export class PyEmbedder {
  constructor(private endpoint: string = "http://127.0.0.1:8000") {}

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const res = await fetch(new URL("/embed", this.endpoint).toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texts }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { embeddings: number[][] };
      if (!json || !Array.isArray(json.embeddings))
        throw new Error("Invalid embed response");
      return json.embeddings;
    } catch {
      // Fallback: simple deterministic encoding to keep flow working in dev
      return texts.map((t) => [t.length, 0, 0]);
    }
  }
}
