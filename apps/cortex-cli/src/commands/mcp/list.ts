import { readAll } from "@cortex-os/mcp-registry/fs-store";
import { Command } from "commander";

export const mcpList = new Command("list")
	.description("List installed MCP servers")
	.option("--json", "JSON output")
	.action(async (opts: { json?: boolean }) => {
		const all = await readAll();
		if (opts.json)
			process.stdout.write(`${JSON.stringify({ servers: all }, null, 2)}\n`);
		else
			for (const s of all)
				process.stdout.write(
					`${s.name}\t${s.transport}\t${s.endpoint ?? s.command ?? ""}\n`,
				);
	});
