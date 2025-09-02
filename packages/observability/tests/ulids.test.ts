import { describe, expect, it } from "vitest";
import {
	createULIDWithTime,
	generateRunId,
	getULIDTimestamp,
	isValidULID,
} from "../src/ulids.js";

describe("ulids", () => {
	it("generates valid ULIDs", () => {
		const id = generateRunId();
		expect(isValidULID(id)).toBe(true);
	});

	it("extracts correct timestamp", () => {
		const ts = Date.UTC(2024, 0, 1);
		const id = createULIDWithTime(ts);
		const extracted = getULIDTimestamp(id).getTime();
		expect(extracted).toBe(ts);
	});
});
