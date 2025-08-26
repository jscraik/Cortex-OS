import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";

describe("rate limiting", () => {
  it("caps requests per client", async () => {
    const app = Fastify();
    await app.register(rateLimit, { max: 2, timeWindow: "1 minute" });
    app.get("/ping", async () => "pong");
    await app.inject({ method: "GET", url: "/ping" });
    await app.inject({ method: "GET", url: "/ping" });
    const res = await app.inject({ method: "GET", url: "/ping" });
    expect(res.statusCode).toBe(429);
    await app.close();
  });
});
