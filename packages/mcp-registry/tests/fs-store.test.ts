import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { readAll, upsert, remove } from "../src/fs-store.js";
import type { ServerInfo } from "@cortex-os/mcp-core";

let baseDir: string;

beforeEach(() => {
  baseDir = mkdtempSync(join(tmpdir(), "mcp-registry-test-"));
  process.env.CORTEX_HOME = baseDir;
});

afterEach(() => {
  rmSync(baseDir, { recursive: true, force: true });
  delete process.env.CORTEX_HOME;
});

describe("fs-store", () => {
  it("upserts and removes server entries", async () => {
    const si: ServerInfo = { name: "foo", transport: "stdio", command: "foo" };
    await upsert(si);
    let all = await readAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject(si);

    const removed = await remove("foo");
    expect(removed).toBe(true);
    all = await readAll();
    expect(all).toHaveLength(0);
  });

  it("logs and returns fallback on invalid json", async () => {
    const file = join(baseDir, "mcp", "servers.json");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "{ invalid");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await readAll();
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

