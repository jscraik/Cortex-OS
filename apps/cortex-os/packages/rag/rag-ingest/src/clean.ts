export function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[^\S\n]+/g, ' ').trim();
}
