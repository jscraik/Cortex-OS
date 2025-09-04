import { describe, expect, it, vi } from "vitest";

vi.mock("@cortex-os/orchestration", () => ({
        createEngine: (config: unknown) => ({ config }),
}));

import { createPRPOrchestrationEngine } from "./create-prp-orchestration-engine";

describe("createPRPOrchestrationEngine", () => {
        it("returns engine with parsed configuration", () => {
                const engine = createPRPOrchestrationEngine({
                        maxConcurrentOrchestrations: 1,
                });
                expect(engine.config.maxConcurrentOrchestrations).toBe(1);
        });
});
