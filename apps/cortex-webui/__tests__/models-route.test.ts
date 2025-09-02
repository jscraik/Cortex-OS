import { describe, expect, it } from "vitest";

describe("models route", () => {
	it("returns models list with default and minimal shape", async () => {
		const { GET } = await import("../app/api/models/route");
		const res = await GET();
		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(Array.isArray(body.models)).toBe(true);
		// must have id + label per contract
		if (body.models.length > 0) {
			const m = body.models[0];
			expect(typeof m.id).toBe("string");
			expect(typeof m.label).toBe("string");
		}
		// default should be present and exist in the set when config provides it
		expect(typeof body.default === "string" || body.default === null).toBe(
			true,
		);
		if (body.default) {
			const ids = new Set(body.models.map((m: unknown) => m.id));
			expect(ids.has(body.default)).toBe(true);
		}
	});
});
