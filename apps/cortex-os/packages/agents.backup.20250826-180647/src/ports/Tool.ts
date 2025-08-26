export interface ToolCall {
  name: string;
  input: unknown;
  timeoutMs?: number;
}

export interface Tool {
  name(): string;
  schema(): { input: string; output: string };
  call(req: ToolCall, ctx?: Record<string, unknown>): Promise<unknown>;
}

