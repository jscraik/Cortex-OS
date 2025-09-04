import { describe, expect, it } from "vitest";
import { getCurrentTraceContext, withSpan } from "../src/tracing/index.js";
import { isValidULID } from "../src/ulids.js";

describe("tracing", () => {
	it("getCurrentTraceContext returns null without active span", () => {
		expect(getCurrentTraceContext()).toBeNull();
	});

        it("withSpan provides trace context", async () => {
                let captured: { traceId?: string; runId?: string } | undefined;
                await withSpan("test", async (runId, ctx) => {
                        expect(isValidULID(runId)).toBe(true);
                        captured = ctx;
                });
                expect(captured?.runId).toBeTruthy();
                expect(captured?.traceId).toBeTruthy();
        });
});
