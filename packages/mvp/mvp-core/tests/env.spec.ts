import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/env.js";

describe("env", () => {
	it("defaults", () => {
		const e = loadEnv({});
		expect(e.NODE_ENV).toBe("development");
		expect(e.LOG_LEVEL).toBe("info");
	});
});
