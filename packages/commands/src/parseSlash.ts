import type { SlashParseResult } from './types.js';

export function parseSlash(input: string): SlashParseResult | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;
  const parts = trimmed.slice(1).split(/\s+/).filter(Boolean);
  const [head, ...rest] = parts;
  if (!head) return null;
  return { cmd: head.toLowerCase(), args: rest };
}
