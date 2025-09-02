import { describe, expect, it } from "vitest";
import { validateToolArgs } from "./server/index.js";

describe("validateToolArgs", () => {
	it("throws when required field missing", () => {
		expect(() => validateToolArgs({ required: ["foo"] }, {})).toThrow(
			/foo is required/,
		);
	});

	it("throws on type and length violations", () => {
		const schema = { properties: { name: { type: "string", maxLength: 3 } } };
		expect(() => validateToolArgs(schema, { name: 5 })).toThrow(
			/must be string/,
		);
		expect(() => validateToolArgs(schema, { name: "long" })).toThrow(
			/Input too long/,
		);
	});

	it("passes with valid args", () => {
		const schema = {
			required: ["name"],
			properties: { name: { type: "string", maxLength: 5 } },
		};
		expect(() => validateToolArgs(schema, { name: "test" })).not.toThrow();
	});
});
