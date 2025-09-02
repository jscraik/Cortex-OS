import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { Envelope } from "./src/envelope";

describe("Envelope source URI validation", () => {
	it("accepts valid source URI", () => {
		const env = Envelope.parse({
			id: "1",
			type: "test",
			source: "https://example.com",
			specversion: "1.0",
		});
		expect(env.source).toBe("https://example.com");
	});

	it("throws on invalid source URI", () => {
		try {
			Envelope.parse({
				id: "1",
				type: "test",
				source: "not a url",
				specversion: "1.0",
			});
			throw new Error("Expected validation to fail");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodError);
			const zerr = err as ZodError;
			expect(zerr.errors[0].message).toBe("Source must be a valid URI");
		}
	});
});
