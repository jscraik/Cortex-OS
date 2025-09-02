import { remove } from "@cortex-os/mcp-registry/fs-store";
import { Command } from "commander";

export const mcpRemove = new Command("remove")
	.description("Remove an MCP server by name")
	.argument("<name>")
	.option("--json", "JSON output")
	.action(async (name: string, opts: unknown) => {
		await remove(name);
		if (opts.json)
			process.stdout.write(
				`${JSON.stringify({ ok: true, removed: name }, null, 2)}
`,
			);
		else process.stdout.write(`Removed MCP server: ${name}\n`);
	});
