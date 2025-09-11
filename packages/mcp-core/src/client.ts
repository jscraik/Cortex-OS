import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { z } from 'zod';
import type { ServerInfo } from './contracts.js';
import { ServerInfoSchema } from './contracts.js';

export interface EnhancedClient {
	callTool(input: { name: string; arguments?: unknown }): Promise<unknown>;
	close(): Promise<void>;
}

const ToolRequestSchema = z.object({
	name: z.string(),
	arguments: z.unknown().optional(),
});

export async function createEnhancedClient(
	si: ServerInfo,
): Promise<EnhancedClient> {
	const server = ServerInfoSchema.parse(si);

	if (server.transport === 'streamableHttp' || server.transport === 'sse') {
		if (!server.endpoint) {
			throw new Error('endpoint required for http transports');
		}
		return {
			async callTool(input) {
				const payload = ToolRequestSchema.parse(input);
				const res = await fetch(server.endpoint!, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...(server.headers ?? {}),
					},
					body: JSON.stringify(payload),
				});
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}`);
				}
				return await res.json();
			},
			async close() {
				/* noop */
			},
		};
	}

	if (server.transport === 'stdio') {
		if (!server.command) {
			throw new Error('command required for stdio transport');
		}

		const child = spawn(server.command, server.args ?? [], {
			env: { ...process.env, ...(server.env ?? {}) },
		});

		return {
			async callTool(input) {
				const payload = ToolRequestSchema.parse(input);
				child.stdin.write(`${JSON.stringify(payload)}\n`);
				const [data] = await once(child.stdout, 'data');
				const line = data.toString().trimEnd();
				return JSON.parse(line);
			},
			async close() {
				child.kill();
			},
		};
	}

	throw new Error(`Unsupported transport: ${server.transport}`);
}
