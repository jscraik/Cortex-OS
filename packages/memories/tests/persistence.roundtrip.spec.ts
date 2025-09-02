import { describe, expect, it } from "vitest";
import { InMemoryStore } from "../src/adapters/store.memory.js";
import type { Memory } from "../src/domain/types.js";

describe("InMemoryStore persistence", () => {
	it("performs round-trip upsert and get", async () => {
		const store = new InMemoryStore();
		const now = new Date().toISOString();
		const record: Memory = {
			id: "1",
			kind: "note",
			text: "hello world",
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: { source: "user" },
		} as Memory;
		await store.upsert(record);
		const out = await store.get("1");
		expect(out).toEqual(record);
	});
});
