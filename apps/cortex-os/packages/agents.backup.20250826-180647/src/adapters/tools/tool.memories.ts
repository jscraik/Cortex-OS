import type { Tool, ToolCall } from "../../ports/Tool.js";
import type { MemoryService } from "@cortex-os/memories";

export class MemoriesTool implements Tool {
  constructor(private svc: Pick<MemoryService, "save" | "get" | "search">) {}
  name() { return "memories"; }
  schema() {
    return {
      input: "https://cortex.local/schemas/memory.schema.json",
      output: "https://cortex.local/schemas/memory.schema.json",
    };
  }
  async call(req: ToolCall) {
    if (req.name === "save") return (this.svc as any).save(req.input);
    if (req.name === "get") return (this.svc as any).get((req.input as any).id);
    if (req.name === "search") return (this.svc as any).search(req.input as any);
    throw new Error("unknown memories op");
  }
}

