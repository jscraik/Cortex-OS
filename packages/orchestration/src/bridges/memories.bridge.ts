import type { MemoryService } from "@cortex-os/memories";
import { uuid } from "@cortex-os/utils";

export type MemoriesBridge = {
  checkpoint: (runId: string, data: unknown) => Promise<any>;
};

export const createMemoriesBridge = (mem: MemoryService): MemoriesBridge => ({
  checkpoint: async (runId, data) => {
    const id = `wf:${runId}:${uuid()}`;
    return (mem as any).save({
      id,
      kind: "artifact",
      text: JSON.stringify(data),
      tags: ["orchestrator", "checkpoint"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provenance: { source: "system" },
    });
  }
});