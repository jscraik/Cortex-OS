export function byChars(text: string, size = 900, overlap = 150): string[] {
  const res: string[] = [];
  for (let i = 0; i < text.length; i += size - overlap) res.push(text.slice(i, i + size));
  return res;
}
