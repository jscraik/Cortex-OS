import { createClient } from "@cortex-os/mcp-core/client";
import { readAll } from "@cortex-os/mcp-registry/fs-store";
import { tracer } from "@cortex-os/telemetry";
import { Command } from "commander";

export const mcpDoctor = new Command("doctor")
	.description("Probe configured MCP servers for basic connectivity")
	.option("--json", "JSON output")
	.action(async (opts: unknown) => {
		const _span = tracer.startSpan("cli.mcp.doctor");
		try {
			const servers = await readAll();
			const results: unknown[] = [];
			for (const s of servers) {
				const item: unknown = {
					name: s.name,
					transport: s.transport,
					ok: false,
				};
				try {
					if (s.transport === "stdio") {
						const client = await createClient(s);
						// Test basic connectivity
						await new Promise((res) => setTimeout(res, 150));
						await client.close();
						item.ok = true;
					} else if (s.transport === "streamableHttp") {
						const url = new URL(s.endpoint ?? "");
						const health = new URL("/healthz", url);
						const res = await fetch(health, {
							signal: AbortSignal.timeout(5000),
						}).catch(() => fetch(url, { signal: AbortSignal.timeout(5000) }));
						item.ok = !!res && res.ok;
					} else if (s.transport === "sse") {
						const client = await createClient(s);
						// Test SSE connectivity
						await new Promise((res) => setTimeout(res, 150));
						await client.close();
						item.ok = true;
					}
				} catch (e: unknown) {
					item.error = e?.message ?? String(e);
				}
				results.push(item);
			}
			if (opts.json)
				process.stdout.write(`${JSON.stringify({ results }, null, 2)}
`);
			else {
				for (const r of results)
					process.stdout.write(
						`${r.ok ? "OK" : "ERR"}\t${r.name}\t${r.transport}${r.error ? ` - ${r.error}` : ""}\n`,
					);
			}
		} finally {
			span.end();
		}
	});
