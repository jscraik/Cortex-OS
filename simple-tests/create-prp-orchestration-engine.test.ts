import { describe, expect, it, vi } from "vitest";

vi.mock("@cortex-os/orchestration", () => ({
        createEngine: (config: unknown) => ({ config }),
}));

import { createPRPOrchestrationEngine } from "../src/lib/create-prp-orchestration-engine.js";

describe("createPRPOrchestrationEngine", () => {
        it("parses configuration overrides", () => {
                const engine = createPRPOrchestrationEngine({
                        maxConcurrentOrchestrations: 1,
                });
                expect(engine.config.maxConcurrentOrchestrations).toBe(1);
        });
});
