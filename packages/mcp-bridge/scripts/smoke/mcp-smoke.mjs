#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mcpDir = path.resolve(__dirname, "../mcp-server");

const result = spawnSync("npm", ["run", "-s", "-l"], {
	cwd: mcpDir,
	stdio: "pipe",
	encoding: "utf8",
});

if (result.status !== 0) {
	console.error(
		"[mcp:smoke] unable to list npm scripts in mcp-server",
		result.stderr,
	);
	process.exit(1);
}

if (!/\bstart\b/.test(result.stdout)) {
	console.error("[mcp:smoke] expected a 'start' script in mcp-server");
	process.exit(2);
}

console.log("[mcp:smoke] mcp-server scripts look sane");
