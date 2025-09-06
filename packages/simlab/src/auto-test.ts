import type { SimScenario } from "./types.js";

export function generateTests(scenarios: SimScenario[]): string {
  return scenarios
    .map(
      (s) => `import { describe, it, expect } from 'vitest';\n` +
        `describe('${s.id}', () => {\n` +
        `  it('has goal', () => {\n` +
        `    expect('${s.goal}').toBeTruthy();\n` +
        `  });\n});\n`
    )
    .join("\n");
}
