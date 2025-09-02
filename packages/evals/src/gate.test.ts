import { describe, expect, it, vi } from "vitest";

vi.mock("./suites/rag", () => ({ runRagSuite: vi.fn() }));
vi.mock("./suites/router", () => ({ runRouterSuite: vi.fn() }));

import { runGate } from "./index";
import { runRagSuite } from "./suites/rag";
import { runRouterSuite } from "./suites/router";

describe("runGate", () => {
	it("returns pass when all suites pass", async () => {
		vi.mocked(runRagSuite).mockResolvedValueOnce({
			name: "rag",
			pass: true,
			metrics: {},
			notes: [],
		});
		vi.mocked(runRouterSuite).mockResolvedValueOnce({
			name: "router",
			pass: true,
			metrics: {},
			notes: [],
		});
		const cfg = {
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
		vi.mocked(runRagSuite).mockResolvedValueOnce({
			name: "rag",
			pass: false,
			metrics: {},
			notes: [],
		});
		vi.mocked(runRouterSuite).mockResolvedValueOnce({
			name: "router",
			pass: true,
			metrics: {},
			notes: [],
		});
		const cfg = {
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
