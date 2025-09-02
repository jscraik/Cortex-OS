import { describe, expect, it } from "vitest";
import { Envelope } from "../src/envelope";

describe("Envelope validation", () => {
	it("throws when source is not a valid URI", () => {
		expect(() =>
			Envelope.parse({
				id: "1",
				type: "test",
				source: "not a uri",
				specversion: "1.0",
			}),
		).toThrow(/Source must be a valid URI/);
	});
});
