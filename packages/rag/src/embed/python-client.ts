export class PyEmbedder {
  constructor(private readonly endpoint: string) {}
  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.endpoint}/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texts })
    });
    if (!res.ok) throw new Error(`Embedder error: ${res.status}`);
    const data = await res.json();
    return data.embeddings as number[][];
  }
}
