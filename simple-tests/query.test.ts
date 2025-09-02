import { describe, expect, it } from "vitest";
import { query } from "../src/lib/query";

describe("query validation", () => {
	it("parses valid input with default topK", () => {
		const result = query({ query: "hello" });
		expect(result).toEqual({ query: "hello", topK: 5 });
	});

	it("throws on invalid input", () => {
		expect(() => query({ query: "", topK: -1 })).toThrow(/Invalid query input/);
	});
});
