import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryStore } from "../src/adapters/store.memory.js";
import { PrismaStore } from "../src/adapters/store.prisma/client.js";
import type { Memory } from "../src/domain/types.js";

// Mock Prisma client for testing
const mockPrisma = {
	memory: {
		upsert: vi.fn(),
		findUnique: vi.fn(),
		delete: vi.fn(),
		findMany: vi.fn(),
		deleteMany: vi.fn(),
	},
};

describe("Purge Expired Memories Implementation Verification", () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	it("InMemoryStore correctly purges expired memories", async () => {
		const store = new InMemoryStore();
		const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
		const now = new Date().toISOString();

		const expiredMemory: Memory = {
			id: "1",
			kind: "note",
			text: "expired memory",
			tags: [],
			ttl: "P1D", // 1 day
			createdAt: past,
			updatedAt: past,
			provenance: { source: "user" },
		};

		const freshMemory: Memory = {
			id: "2",
			kind: "note",
			text: "fresh memory",
			tags: [],
			ttl: "P1D", // 1 day
			createdAt: now,
			updatedAt: now,
			provenance: { source: "user" },
		};

		const noTtlMemory: Memory = {
			id: "3",
			kind: "note",
			text: "no ttl memory",
			tags: [],
			createdAt: past,
			updatedAt: past,
			provenance: { source: "user" },
		};

		await store.upsert(expiredMemory);
		await store.upsert(freshMemory);
		await store.upsert(noTtlMemory);

		// Verify all memories are stored initially
		expect(await store.get("1")).not.toBeNull();
		expect(await store.get("2")).not.toBeNull();
		expect(await store.get("3")).not.toBeNull();

		// Purge expired memories
		const purgedCount = await store.purgeExpired(new Date().toISOString());

		// Should purge only the expired memory
		expect(purgedCount).toBe(1);
		expect(await store.get("1")).toBeNull(); // Expired memory removed
		expect(await store.get("2")).not.toBeNull(); // Fresh memory remains
		expect(await store.get("3")).not.toBeNull(); // No TTL memory remains
	});

	it("PrismaStore correctly purges expired memories", async () => {
		const store = new PrismaStore(mockPrisma as any);
		const now = new Date().toISOString();

		// Mock the findMany response with memories that have TTL
		mockPrisma.memory.findMany.mockResolvedValue([
			{
				id: "1",
				kind: "note",
				text: "expired memory",
				tags: [],
				ttl: "P1D",
				createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
				updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
				provenance: { source: "user" },
			},
			{
				id: "2",
				kind: "note",
				text: "fresh memory",
				tags: [],
				ttl: "P1D",
				createdAt: new Date(),
				updatedAt: new Date(),
				provenance: { source: "user" },
			},
		]);

		// Mock the deleteMany response
		mockPrisma.memory.deleteMany.mockResolvedValue({ count: 1 });

		// Purge expired memories
		const purgedCount = await store.purgeExpired(now);

		// Should purge only the expired memory
		expect(purgedCount).toBe(1);
		expect(mockPrisma.memory.findMany).toHaveBeenCalledWith({
			where: { ttl: { not: null } },
		});
		expect(mockPrisma.memory.deleteMany).toHaveBeenCalledWith({
			where: {
				id: { in: ["1"] },
			},
		});
	});

	it("handles invalid TTL formats gracefully", async () => {
		const store = new InMemoryStore();
		const now = new Date().toISOString();

		// Insert memory with invalid TTL
		const invalidTtlMemory: Memory = {
			id: "invalid-ttl",
			kind: "note",
			text: "invalid ttl memory",
			tags: [],
			ttl: "invalid-format",
			createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
			updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 60 * 30).toISOString(),
			provenance: { source: "user" },
		};

		await store.upsert(invalidTtlMemory);

		// Purging with invalid TTL should not cause errors
		const purgedCount = await store.purgeExpired(now);
		expect(purgedCount).toBe(0); // No memories purged due to invalid TTL
		expect(await store.get("invalid-ttl")).not.toBeNull(); // Memory still exists
	});
});
