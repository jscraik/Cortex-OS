import type { Tool, ToolCall } from "../../ports/Tool.js";

export class McpTool implements Tool {
  constructor(
    private mcpClient: {
      callTool(name: string, input: unknown, timeoutMs?: number): Promise<unknown>;
    },
    private toolName: string,
    private inputSchema: string,
    private outputSchema: string
  ) {}
  name() {
    return `mcp:${this.toolName}`;
  }
  schema() {
    return { input: this.inputSchema, output: this.outputSchema };
  }
  call(req: ToolCall) {
    return this.mcpClient.callTool(this.toolName, req.input, req.timeoutMs);
  }
}

