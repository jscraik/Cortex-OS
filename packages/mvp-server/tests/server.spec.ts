import { describe, it, expect } from "vitest";
import { buildServer } from "../src/server.js";

describe("mvp-server", () => {
  it("health ok", async () => {
    process.env.CORTEX_MCP_TOKEN = "test-token";
    const app = buildServer();
    const res = await app.inject({ method: "GET", url: "/health", headers: { authorization: "Bearer test-token" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    await app.close();
  });
});

