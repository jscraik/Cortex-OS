import { beforeEach, describe, expect, it } from "vitest";
import { MemoryCacheManager } from "../src/core/in-memory-cache";

// Helper to advance time for TTL tests
const advanceTime = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

describe("MemoryCacheManager", () => {
	let cache: MemoryCacheManager;

	beforeEach(() => {
		cache = new MemoryCacheManager({ maxSize: 3, ttl: 1 }); // 1 second TTL
	});

	it("should set and get a value", async () => {
		await cache.set("key1", "value1");
		const value = await cache.get("key1");
		expect(value).toBe("value1");
	});

	it("should return null for a non-existent key", async () => {
		const value = await cache.get("non-existent");
		expect(value).toBeNull();
	});

	it("should return true for an existing key and false otherwise", async () => {
		await cache.set("key1", "value1");
		expect(await cache.has("key1")).toBe(true);
		expect(await cache.has("non-existent")).toBe(false);
	});

	it("should expire a key after its TTL", async () => {
		await cache.set("key1", "value1", 0.05); // 50ms TTL
		expect(await cache.get("key1")).toBe("value1");
		await advanceTime(60);
		expect(await cache.get("key1")).toBeNull();
		expect(await cache.has("key1")).toBe(false);
	});

	it("should clear the cache", async () => {
		await cache.set("key1", "value1");
		await cache.set("key2", "value2");
		await cache.clear();
		expect(await cache.size()).toBe(0);
		expect(await cache.get("key1")).toBeNull();
	});

	it("should respect the maxSize and evict the oldest entry", async () => {
		await cache.set("key1", "value1");
		await cache.set("key2", "value2");
		await cache.set("key3", "value3");
		expect(await cache.size()).toBe(3);

		// This should evict key1
		await cache.set("key4", "value4");
		expect(await cache.size()).toBe(3);
		expect(await cache.get("key1")).toBeNull();
		expect(await cache.get("key2")).toBe("value2");
		expect(await cache.get("key4")).toBe("value4");
	});

	it("should correctly report its size, excluding expired entries", async () => {
		await cache.set("key1", "value1");
		await cache.set("key2", "value2", 0.05); // 50ms TTL
		expect(await cache.size()).toBe(2);
		await advanceTime(60);
		// size() should clean up expired entries
		expect(await cache.size()).toBe(1);
	});
});
