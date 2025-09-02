import { spawnSync } from "node:child_process";
import { Command } from "commander";

export const ctlCheck = new Command("check")
	.description("Run .cortex control-centre checks")
	.option("--json", "JSON output")
	.action((opts: unknown) => {
		for (const s of [
			"check-structure.ts",
			"check-agents.ts",
			"check-index.ts",
		]) {
			const r = spawnSync("pnpm", ["tsx", `.cortex/tooling/${s}`], {
				stdio: "inherit",
			});
			if (r.status !== 0) process.exit(r.status ?? 1);
		}
		if (opts.json) process.stdout.write(`${JSON.stringify({ ok: true })}\n`);
	});
// no default export
