import { describe, it, expect, vi } from "vitest";
import { CloudEvent } from "../src/integrations/cloudevents.js";
import { configureAuditPublisherWithMCP } from "../src/lib/audit-mcp-adapter.js";
import { record, auditEvent } from "../src/lib/audit.js";

// validate that MCP connector receives CloudEvent through audit publisher

describe("MCP connector", () => {
  it("forwards audit events", async () => {
    const fn = vi.fn(async (_evt: CloudEvent) => {});
    configureAuditPublisherWithMCP(fn);
    const evt = auditEvent("tool", "action", { runId: "r2" }, { foo: "baz" });
    await record(evt);
    expect(fn).toHaveBeenCalledWith(expect.any(CloudEvent));
  });
});
