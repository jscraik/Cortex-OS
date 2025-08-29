import crypto from 'crypto';

/**
 * Generate deterministic mock embeddings for tests.
 * Mirrors removed mock provider logic.
 */
export function generateMockEmbeddings(texts: string[], dimensions = 1024): number[][] {
  return texts.map((text) => {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const embedding: number[] = [];
    for (let i = 0; i < dimensions; i++) {
      const byte = parseInt(hash.substring(i % hash.length, (i % hash.length) + 1), 16) || 0;
      embedding.push(byte / 15 - 0.5);
    }
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  });
}
