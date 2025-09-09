declare module '@cortex-os/contracts' {
  export interface A2AMessage {
    action: string;
    params?: any;
  }

  // Minimal placeholder for agent configuration; accepts arbitrary string keys with unknown values.
  export type AgentConfigSchema = Record<string, unknown>;

  export const TOKENS: Record<string, any>;

  export type RAGQuerySchema = any;
  export type MCPRequestSchema = any;
}
