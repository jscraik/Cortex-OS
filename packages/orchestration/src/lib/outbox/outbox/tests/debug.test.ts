import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Debug Zod Extend", () => {
	it("should extend a simple Zod object", () => {
		const MySchema = z.object({
			id: z.string(),
		});

		const ExtendedSchema = MySchema.extend({
			foo: z.string(),
		});
		expect(ExtendedSchema).toBeDefined();
	});
});
