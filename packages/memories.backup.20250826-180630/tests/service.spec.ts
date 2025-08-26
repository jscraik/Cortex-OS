import { describe, it, expect } from "vitest";
import { InMemoryStore } from "../src/adapters/store.memory.js";
import { LocalEmbedder } from "./util/local-embedder.js";
import { createMemoryService } from "../src/service/memory-service.js";

describe("MemoryService", () => {
  it("embeds when vector missing and embedder provided", async () => {
    const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
    const now = new Date().toISOString();
    const saved = await svc.save({
      id: "m1",
      kind: "note",
      text: "abc",
      tags: [],
      createdAt: now,
      updatedAt: now,
      provenance: { source: "system" }
    });
    expect(saved.vector?.length).toBe(128);
    expect(saved.embeddingModel).toBe("local-sim");
  });

  it("searches by text when no embedder", async () => {
    const svc = createMemoryService(new InMemoryStore());
    const now = new Date().toISOString();
    await svc.save({ id: "a", kind: "note", text: "hello world", tags: ["t"], createdAt: now, updatedAt: now, provenance: { source: "system" } });
    await svc.save({ id: "b", kind: "note", text: "other", tags: ["t"], createdAt: now, updatedAt: now, provenance: { source: "system" } });
    const r = await svc.search({ text: "hello" });
    expect(r.length).toBe(1);
    expect(r[0].id).toBe("a");
  });
});

