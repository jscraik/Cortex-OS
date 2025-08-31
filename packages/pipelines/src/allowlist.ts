const allow = new Set<string>();

export function allowPipeline(id: string) {
  allow.add(id);
}

export function isAllowed(id: string): boolean {
  return allow.has(id);
}
