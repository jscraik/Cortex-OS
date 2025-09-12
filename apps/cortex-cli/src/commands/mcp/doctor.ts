import { createEnhancedClient } from "@cortex-os/mcp-core/client";
import { readAll } from "@cortex-os/mcp-registry/fs-store";
import { tracer } from "@cortex-os/telemetry";
import { Command } from "commander";

interface DoctorOptions { json?: boolean }
type TransportKind = "stdio" | "sse" | "streamableHttp";
interface DoctorServerResult {
	name: string;
	transport: TransportKind;
	ok: boolean;
	error?: string;
}

export const mcpDoctor = new Command("doctor")
	.description("Probe configured MCP servers for basic connectivity")
	.option("--json", "JSON output")
	.action(async (opts: DoctorOptions) => {
		const span = tracer.startSpan("cli.mcp.doctor");
		try {
			const servers = await readAll();
			const results: unknown[] = [];
			const testConnection = async (server: { name: string; transport: TransportKind; endpoint?: string }) => {
				const item: DoctorServerResult = { name: server.name, transport: server.transport, ok: false };
				try {
					if (server.transport === "stdio" || server.transport === "sse") {
						const client = await createEnhancedClient(server);
						await new Promise((res) => setTimeout(res, 150));
						await client.close();
						item.ok = true;
					} else if (server.transport === "streamableHttp") {
						const url = new URL(server.endpoint ?? "");
						const health = new URL("/healthz", url);
						const res = await fetch(health, { signal: AbortSignal.timeout(5000) })
							.catch(() => fetch(url, { signal: AbortSignal.timeout(5000) }));
						item.ok = !!res && res.ok;
					}
				} catch (e: unknown) {
					item.error = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : String(e);
				}
				return item;
			};

			for (const server of servers) {
				results.push(await testConnection(server));
			}
			if (opts.json) {
				process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
			} else {
				for (const r of results as DoctorServerResult[]) {
					const status = r.ok ? "OK" : "ERR";
					const errorSuffix = r.error ? ` - ${r.error}` : "";
					process.stdout.write(`${status}\t${r.name}\t${r.transport}${errorSuffix}\n`);
				}
			}
		} finally {
			span.end();
		}
	});
