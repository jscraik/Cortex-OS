import { spawn } from "node:child_process";
import type { Envelope } from "@cortex-os/a2a-contracts/envelope";
import type { Transport } from "@cortex-os/a2a-core/transport";
import { createLogger } from "@cortex-os/observability";

const logger = createLogger('a2a-stdio-transport');

export function stdio(
	command: string,
	args: string[] = ["stdio"],
	env: Record<string, string> = {},
): Transport & { terminate: () => Promise<void> } {
	const child = spawn(command, args, {
		stdio: ["pipe", "pipe", "pipe"],
		env: { ...process.env, ...env },
	});
	const subs = new Map<string, Set<(m: Envelope) => Promise<void>>>();

	const cleanup = () => {
		subs.clear();
		child.stdout.removeAllListeners("data");
	};

	child.once("error", cleanup);
	child.once("exit", cleanup);
	child.once("close", cleanup);

	const terminate = () =>
		new Promise<void>((resolve) => {
			if (child.killed || child.exitCode !== null) {
				cleanup();
				return resolve();
			}
			child.once("close", () => {
				cleanup();
				resolve();
			});
			child.kill();
		});

	child.stdout.on("data", (buf) => {
		const lines = buf.toString("utf8").split(/\r?\n/).filter(Boolean);
		for (const line of lines) {
			try {
				const msg = JSON.parse(line);
				const handlers = subs.get(msg.type);
				if (handlers) {
					for (const fn of handlers) fn(msg);
				}
			} catch (error) {
				// Use structured logging for message parsing errors
				logger.warn({
					error: error instanceof Error ? error.message : String(error),
					context: 'stdio-message-parsing'
				}, 'Failed to parse JSON message from stdio');
			}
		}
	});
	return {
		async publish(m) {
			child.stdin.write(`${JSON.stringify(m)}\n`);
		},
		async subscribe(types, onMsg) {
			for (const t of types) subs.set(t, (subs.get(t) ?? new Set()).add(onMsg));
			return async () => {
				for (const t of types) {
					const set = subs.get(t);
					set?.delete(onMsg);
					if (!set?.size) subs.delete(t);
				}
				if (subs.size === 0) await terminate();
			};
		},
		terminate,
		pid: child.pid,
	};
}
