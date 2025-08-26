import type { MemoryService } from "@cortex-os/memories";

export class MemoriesBridge {
  constructor(private mem: MemoryService) {}
  checkpoint(runId: string, data: unknown) {
    const id = `wf:${runId}:${crypto.randomUUID()}`;
    return (this.mem as any).save({
      id,
      kind: "artifact",
      text: JSON.stringify(data),
      tags: ["orchestrator", "checkpoint"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: { source: "system" },
    });
  }
}

