import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("token authentication", () => {
  it("rejects invalid token", async () => {
    process.env.CORTEX_MCP_TOKEN = "secret";
    const app = buildServer();
    try {
      const res = await app.inject({ method: "GET", url: "/health", headers: { authorization: "Bearer wrong" } });
      expect(res.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it("accepts valid token", async () => {
    process.env.CORTEX_MCP_TOKEN = "secret";
    const app = buildServer();
    try {
      const res = await app.inject({ method: "GET", url: "/health", headers: { authorization: "Bearer secret" } });
      expect(res.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});
