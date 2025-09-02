import { describe, expect, it } from "vitest";

describe("tools API route", () => {
	it("returns events for session", async () => {
		const { addToolEvent } = await import("../utils/tool-store");
		const { GET } = await import("../app/api/chat/[sessionId]/tools/route");
		const sid = "s-tools";
		addToolEvent(sid, { name: "demo/tool", status: "start", args: { a: 1 } });
		const res = await GET(new Request("http://x"), {
			params: { sessionId: sid },
		});
		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(Array.isArray(body.events)).toBe(true);
		expect(body.events.length).toBeGreaterThan(0);
		expect(body.events[0].name).toBe("demo/tool");
	});
});
