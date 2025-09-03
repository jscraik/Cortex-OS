import { describe, expect, test, vi } from "vitest";
import { chatHandler } from "../src/handlers";
describe("chatHandler", () => {
    test("throws when chat capability missing", async () => {
        const router = {
            hasCapability: vi.fn().mockReturnValue(false),
        };
        expect(() => chatHandler(router, {
            msgs: [{ role: "user", content: "hi" }],
        })).toThrow("No chat models available");
    });
    test("returns chat content", async () => {
        const router = {
            hasCapability: vi.fn().mockReturnValue(true),
            generateChat: vi.fn().mockResolvedValue({ content: "hello", model: "m" }),
        };
        const result = await chatHandler(router, {
            msgs: [{ role: "user", content: "hi" }],
        });
        expect(result).toEqual({ content: "hello", modelUsed: "m" });
    });
});
//# sourceMappingURL=chat-handler.test.js.map
