import type { ServerInfo } from "./contracts.js";

export interface EnhancedClient {
  callTool(input: { name: string; arguments?: unknown }): Promise<any>;
  close(): Promise<void>;
}

export async function createEnhancedClient(_si: ServerInfo): Promise<EnhancedClient> {
  // Minimal stub implementation; real transports are provided elsewhere in the repo.
  return {
    async callTool() {
      throw new Error("MCP transport not wired: createEnhancedClient stub");
    },
    async close() { /* noop */ }
  };
}
