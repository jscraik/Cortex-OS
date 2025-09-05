import { describe, expect, it } from "vitest";
import { validateRegistryUrl } from "./registry.js";

describe("validateRegistryUrl", () => {
        it("allows allowed domains", () => {
                expect(
                        validateRegistryUrl("https://registry.cortex-os.dev"),
                ).toBe(true);
                expect(validateRegistryUrl("http://localhost")).toBe(true);
        });

        it("rejects disallowed domains", () => {
                expect(validateRegistryUrl("https://evil.com")).toBe(false);
        });

        it("rejects unsupported protocols", () => {
                expect(
                        validateRegistryUrl("ftp://registry.cortex-os.dev"),
                ).toBe(false);
        });
});
