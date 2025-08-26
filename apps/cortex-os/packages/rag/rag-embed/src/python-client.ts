export class PyEmbedder implements import('./provider.js').Embeddings {
  constructor(private endpoint: string, public model = 'e5-small-v2', public dim = 384) {}
  async embed(texts: string[]) {
    const r = await fetch(`${this.endpoint}/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texts }),
    });
    if (!r.ok) throw new Error(`embed HTTP ${r.status}`);
    const { vectors } = await r.json();
    return vectors;
  }
}
