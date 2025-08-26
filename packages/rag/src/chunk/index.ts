export function byChars(text: string, size = 300, overlap = 0): string[] {
  const chunks: string[] = [];
  const step = Math.max(1, size - overlap);
  for (let i = 0; i < text.length; i += step) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
