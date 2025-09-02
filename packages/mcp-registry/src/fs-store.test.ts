import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ServerInfo } from "@cortex-os/mcp-core/contracts";
import { afterEach, beforeEach, expect, test } from "vitest";
import { readAll, remove, upsert } from "./fs-store.js";

const originalHome = process.env.HOME;

beforeEach(() => {
	const dir = mkdtempSync(join(tmpdir(), "mcp-registry-"));
	process.env.HOME = dir;
});

afterEach(() => {
	if (originalHome) {
		process.env.HOME = originalHome;
	}
});

test("upsert, readAll, and remove round trip", async () => {
	const server: ServerInfo = {
		name: "echo",
		transport: "stdio",
		command: "echo",
	};

	await upsert(server);
	let all = await readAll();
	expect(all).toHaveLength(1);
	expect(all[0].name).toBe("echo");

	await remove("echo");
	all = await readAll();
	expect(all).toHaveLength(0);
});
