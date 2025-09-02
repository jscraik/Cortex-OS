import { type IdempotencyStore, once } from "@cortex-os/a2a-core/idempotency";
import { expect, it } from "vitest";

class MemStore implements IdempotencyStore {
	private s = new Set<string>();
	async seen(id: string) {
		return this.s.has(id);
	}
	async remember(id: string) {
		this.s.add(id);
	}
}

it("runs once", async () => {
	const store = new MemStore();
	let count = 0;
	await once(store, "a", 60, async () => {
		count++;
	});
	await once(store, "a", 60, async () => {
		count++;
	});
	expect(count).toBe(1);
});
