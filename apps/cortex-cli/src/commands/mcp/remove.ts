import { remove } from "@cortex-os/mcp-registry/fs-store";
import { Command } from "commander";
import { err, ok, type Result } from "../../utils/result.js";

interface RemoveOptions {
	json?: boolean;
	force?: boolean; // Reserved for future behavior (e.g., ignore missing)
}

async function removeCommandHandler(name: string): Promise<Result<{ removed: string }, Error>> {
	try {
		await remove(name);
		return ok({ removed: name });
	} catch (e) {
		return err(e instanceof Error ? e : new Error(String(e)));
	}
}

export const mcpRemove = new Command("remove")
	.description("Remove an MCP server by name")
	.argument("<name>")
	.option("--json", "JSON output")
	.action(async (name: string, opts: RemoveOptions) => {
		const result = await removeCommandHandler(name);
		if (!result.ok) {
			const message = result.error.message;
			if (opts.json) {
				process.stderr.write(`${JSON.stringify({ error: message }, null, 2)}\n`);
			} else {
				process.stderr.write(`Error: ${message}\n`);
			}
			process.exit(1);
		}
		if (opts.json) {
			process.stdout.write(`${JSON.stringify({ ok: true, removed: result.value.removed }, null, 2)}\n`);
		} else {
			process.stdout.write(`Removed MCP server: ${result.value.removed}\n`);
		}
	});
