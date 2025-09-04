export const generateId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
