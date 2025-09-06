import { beforeEach, describe, expect, it } from "vitest";
import { SQLiteStore } from "../src/adapters/store.sqlite.js";
import type { Memory } from "../src/domain/types.js";

let sqliteAvailable = true;

(function checkSQLite() {
        try {
                new SQLiteStore(":memory:", 2);
        } catch {
                sqliteAvailable = false;
        }
})();

(sqliteAvailable ? describe : describe.skip)("SQLiteStore", () => {
	let store: SQLiteStore;
	const now = new Date().toISOString();

        beforeEach(() => {
                store = new SQLiteStore(":memory:", 2);
                process.env.MEMORIES_RERANK_ENABLED = "false";
        });

	it("persists and retrieves memories", async () => {
		const m: Memory = {
			id: "1",
			kind: "note",
			text: "test",
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: { source: "user" },
		};
		await store.upsert(m);
		const fetched = await store.get("1");
		expect(fetched?.text).toBe("test");
	});

	it("supports vector and text search", async () => {
		const m1: Memory = {
			id: "a",
			kind: "note",
			text: "hello",
			vector: [0, 1],
			tags: ["greet"],
			createdAt: now,
			updatedAt: now,
			provenance: { source: "user" },
		};
		await store.upsert(m1);
		const byVec = await store.searchByVector({ vector: [0, 1], topK: 1 });
		expect(byVec[0]?.id).toBe("a");
		const byText = await store.searchByText({
			text: "hell",
			topK: 1,
			filterTags: ["greet"],
		});
		expect(byText[0]?.id).toBe("a");
	});

	it("purges expired memories and deletes by id", async () => {
		const m: Memory = {
			id: "exp",
			kind: "note",
			text: "temp",
			tags: [],
			ttl: "PT1S",
			createdAt: now,
			updatedAt: now,
			provenance: { source: "user" },
		};
		await store.upsert(m);
		const purged = await store.purgeExpired(
			new Date(Date.now() + 2000).toISOString(),
		);
		expect(purged).toBe(1);
		await store.upsert({ ...m, id: "del", ttl: undefined });
		await store.delete("del");
		const fetched = await store.get("del");
		expect(fetched).toBeNull();
	});
});
