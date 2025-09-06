import { describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => {
  return { spawn: vi.fn() };
});

import { generateFlamegraph } from "../src/flamegraph.js";
import { spawn } from "node:child_process";

const mockedSpawn = vi.mocked(spawn);
describe("generateFlamegraph", () => {
  it("spawns 0x with correct arguments", async () => {
    const on = vi.fn((event, cb) => {
      if (event === "exit") cb(0);
    });
    mockedSpawn.mockReturnValue({ on });
    await generateFlamegraph("app.js", "out");
    expect(mockedSpawn).toHaveBeenCalledWith(
      "npx",
      ["0x", "--output", "out", "app.js"],
      { stdio: "inherit" },
    );
  });
});
