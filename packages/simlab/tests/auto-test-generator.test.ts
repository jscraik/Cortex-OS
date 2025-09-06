import { describe, it, expect } from "vitest";
import { generateTests } from "../src/auto-test.js";
import type { SimScenario } from "../src";

describe("Auto test generation", () => {
  it("creates test code for scenarios", () => {
    const scenarios: SimScenario[] = [
      {
        id: "scn-auto",
        name: "auto",
        description: "",
        goal: "check",
        persona: { locale: "en-US", tone: "neutral", tech_fluency: "med" },
        initial_context: {},
        sop_refs: [],
        kb_refs: [],
        success_criteria: ["ok"],
        difficulty: "basic",
        category: "support",
        tags: [],
      },
    ];
    const code = generateTests(scenarios);
    expect(code).toContain("scn-auto");
    expect(code).toContain("describe");
  });
});
