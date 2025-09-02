import { describe, expect, it } from "vitest";
import { sanitizeEvent } from "../../scripts/sanitize-events.mjs";

describe("sanitizeEvent", () => {
	it("removes sensitive identifiers", () => {
		const event = {
			id: "1",
			type: "session:created",
			data: { sessionId: "secret", timestamp: 1 },
			metadata: {
				sessionId: "secret",
				eventManagerId: "mgr",
				source: "session",
				timestamp: 1,
			},
		};
		const sanitized = sanitizeEvent(event);
		expect(sanitized.data.sessionId).toBeUndefined();
		expect(sanitized.metadata?.sessionId).toBeUndefined();
		expect(sanitized.metadata?.eventManagerId).toBeUndefined();
		expect(sanitized.data.timestamp).toBe(1);
	});
});
