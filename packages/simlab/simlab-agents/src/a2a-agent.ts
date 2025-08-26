// Placeholder A2A-backed agent adapter; implementation deferred.
export type A2AAgent = { decide(s: unknown): Promise<unknown> };
export function a2aAgent(): A2AAgent { return { async decide() { throw new Error("A2A agent not implemented"); } }; }

