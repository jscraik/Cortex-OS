import { describe, expect, test } from "vitest";
import { provideOrchestration } from "../src/services";

describe("orchestration service", () => {
  test("creates engine", () => {
    const engine = provideOrchestration();
    expect(engine).toHaveProperty("config");
  });
});
