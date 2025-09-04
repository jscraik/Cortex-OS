import { describe, expect, it, vi } from "vitest";
import type { Grant } from "../src/policy.js";

describe("policy rate limiting", () => {
        it("throws after exceeding perMinute limit", async () => {
                vi.resetModules();
                const { enforce } = await import("../src/policy.js");
                const grant: Grant = {
                        actions: ["embeddings"],
                        rate: { perMinute: 2 },
                        rules: {
                                allow_embeddings: true,
                                allow_rerank: true,
                                allow_chat: true,
                        },
                };
                await enforce(grant, "embeddings");
                await enforce(grant, "embeddings");
                await expect(enforce(grant, "embeddings")).rejects.toThrow(
                        /Rate limit exceeded/,
                );
        });
});
