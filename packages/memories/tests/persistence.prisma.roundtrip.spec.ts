import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaStore } from "../src/adapters/store.prisma/client.js";
import type { Memory } from "../src/domain/types.js";

// Mock Prisma client for testing
const mockPrisma = {
	memory: {
		upsert: vi.fn(),
		findUnique: vi.fn(),
		delete: vi.fn(),
		findMany: vi.fn(),
	},
};

describe("PrismaStore persistence", () => {
	let store: PrismaStore;

	beforeEach(() => {
		store = new PrismaStore(mockPrisma as any);
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	it("performs round-trip upsert and get", async () => {
		const now = new Date().toISOString();
		const record: Memory = {
			id: "1",
			kind: "note",
			text: "hello world",
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: { source: "user" },
		};

		// Mock the upsert response
		mockPrisma.memory.upsert.mockResolvedValue({
			id: "1",
			kind: "note",
			text: "hello world",
			tags: [],
			createdAt: new Date(now),
			updatedAt: new Date(now),
			provenance: { source: "user" },
		});

		// Mock the get response
		mockPrisma.memory.findUnique.mockResolvedValue({
			id: "1",
			kind: "note",
			text: "hello world",
			tags: [],
			createdAt: new Date(now),
			updatedAt: new Date(now),
			provenance: { source: "user" },
		});

		const saved = await store.upsert(record);
		const retrieved = await store.get("1");

		expect(saved).toEqual(record);
		expect(retrieved).toEqual(record);
		expect(mockPrisma.memory.upsert).toHaveBeenCalledTimes(1);
		expect(mockPrisma.memory.findUnique).toHaveBeenCalledTimes(1);
	});

	it("handles null values correctly during round-trip", async () => {
		const now = new Date().toISOString();
		const record: Memory = {
			id: "2",
			kind: "event",
			// text is optional, so omitting it
			tags: ["event"],
			createdAt: now,
			updatedAt: now,
			provenance: { source: "system" },
			ttl: "P1D", // 1 day TTL
		};

		// Mock the upsert response
		mockPrisma.memory.upsert.mockResolvedValue({
			id: "2",
			kind: "event",
			text: null,
			tags: ["event"],
			ttl: "P1D",
			createdAt: new Date(now),
			updatedAt: new Date(now),
			provenance: { source: "system" },
		});

		// Mock the get response
		mockPrisma.memory.findUnique.mockResolvedValue({
			id: "2",
			kind: "event",
			text: null,
			tags: ["event"],
			ttl: "P1D",
			createdAt: new Date(now),
			updatedAt: new Date(now),
			provenance: { source: "system" },
		});

		const saved = await store.upsert(record);
		const retrieved = await store.get("2");

		expect(saved).toEqual(record);
		expect(retrieved).toEqual(record);
	});
});
