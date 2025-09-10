export const generateId = () =>
	globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
