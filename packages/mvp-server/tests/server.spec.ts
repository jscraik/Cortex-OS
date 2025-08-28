import { describe, it, expect } from "vitest";
import { buildServer } from "../src/http-server.js";

describe("mvp-server", () => {
  it("health ok", async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: "GET", url: "/api/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
    } finally {
      await app.close();
    }
  }, 10000); // 10 second timeout
});

