import { describe, expect, it, vi } from "vitest";

vi.mock("./suites/rag", () => ({
        ragSuite: {
                optionsSchema: { parse: vi.fn().mockReturnValue({}) },
                run: vi.fn(),
        },
}));
vi.mock("./suites/router", () => ({
        routerSuite: {
                optionsSchema: { parse: vi.fn().mockReturnValue({}) },
                run: vi.fn(),
        },
}));

import { runGate } from "./index";
import { ragSuite } from "./suites/rag";
import { routerSuite } from "./suites/router";

describe("runGate", () => {
        const dataset = { docs: [], queries: [] };

        it("returns pass when all suites pass", async () => {
                vi.mocked(ragSuite.run).mockResolvedValueOnce({
                        name: "rag",
                        pass: true,
                        metrics: {},
                        notes: [],
                });
                vi.mocked(routerSuite.run).mockResolvedValueOnce({
                        name: "router",
                        pass: true,
                        metrics: {},
                        notes: [],
                });
                const cfg = {
                        dataset,
                        suites: [
                                { name: "rag", enabled: true, thresholds: {}, options: {} },
                                { name: "router", enabled: true, thresholds: {} },
                                { name: "router", enabled: false, thresholds: {} },
                        ],
                };
                const res = await runGate(cfg);
                expect(res.pass).toBe(true);
        });

        it("returns fail when a suite fails", async () => {
                vi.mocked(ragSuite.run).mockResolvedValueOnce({
                        name: "rag",
                        pass: false,
                        metrics: {},
                        notes: [],
                });
                vi.mocked(routerSuite.run).mockResolvedValueOnce({
                        name: "router",
                        pass: true,
                        metrics: {},
                        notes: [],
                });
                const cfg = {
                        dataset,
                        suites: [
                                { name: "rag", enabled: true, thresholds: {}, options: {} },
                                { name: "router", enabled: true, thresholds: {} },
                                { name: "router", enabled: false, thresholds: {} },
                        ],
                };
                const res = await runGate(cfg);
                expect(res.pass).toBe(false);
        });

        it("throws on invalid config", async () => {
                await expect(runGate({} as any)).rejects.toThrow();
        });
});
