#!/usr/bin/env node
import { initializeASBR } from './index.js';

async function main() {
	const port = process.env.ASBR_PORT ? Number(process.env.ASBR_PORT) : 7439;
	const host = process.env.ASBR_HOST || '127.0.0.1';
	const { token } = await initializeASBR({ port, host, autoStart: true });
	// Minimal output for piping
	console.log(`asbr listening on http://${host}:${port}`);
	console.log(`asbr token ${token}`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.stack || err.message : String(err));
	process.exit(1);
});
