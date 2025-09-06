import { describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  let spawn: any;
  return {
    setSpawn: (fn: any) => (spawn = fn),
    getSpawn: () => spawn,
  };
});
vi.mock("node:child_process", () => {
  const fn = vi.fn();
  hoisted.setSpawn(fn);
  return { spawn: fn };
});

import { generateFlamegraph } from "../src/flamegraph.js";

const spawn = hoisted.getSpawn();

describe("generateFlamegraph", () => {
  it("spawns 0x with correct arguments", async () => {
    const on = vi.fn((event, cb) => {
      if (event === "exit") cb(0);
    });
    spawn.mockReturnValue({ on });
    await generateFlamegraph("app.js", "out");
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      ["0x", "--output", "out", "app.js"],
      { stdio: "inherit" },
    );
  });
});
