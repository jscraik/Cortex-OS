export class LocalEmbedder {
  name() {
    return 'local-sim';
  }
  async embed(texts: string[]) {
    return texts.map((t) => {
      const v = new Array(128).fill(0);
      for (const ch of t) v[ch.charCodeAt(0) % 128] += 1;
      const n = Math.hypot(...v) || 1;
      return v.map((x) => x / n);
    });
  }
}
