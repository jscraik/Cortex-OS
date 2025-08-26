import type { Tool, ToolCall } from "../../ports/Tool.js";

export class HttpTool implements Tool {
  constructor(
    private toolId: string,
    private endpoint: string,
    private inputSchema: string,
    private outputSchema: string,
    private fetchImpl: typeof fetch = fetch
  ) {}
  name() { return `http:${this.toolId}`; }
  schema() { return { input: this.inputSchema, output: this.outputSchema }; }
  async call(req: ToolCall) {
    const res = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: req.name, input: req.input })
    });
    if (!res.ok) throw new Error(`HTTP_TOOL_ERROR ${res.status}`);
    return res.json();
  }
}

