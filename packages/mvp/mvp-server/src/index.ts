#!/usr/bin/env node
import { http } from './config.js';
import { buildServer } from './http-server.js';

async function main() {
	const app = buildServer();
	const close = async () => {
		try {
			await app.close();
		} catch (err) {
			// Swallow errors during shutdown to ensure fast termination (logged for visibility)
			app.log.warn({ err }, 'graceful shutdown encountered error');
		}
		process.exit(0);
	};
	process.on('SIGINT', close);
	process.on('SIGTERM', close);
	await app.listen({ host: http.host, port: http.port });
	app.log.info({ event: 'listen', host: http.host, port: http.port }, 'mvp-server up');
}
main().catch((e) => {
	console.error(e);
	process.exit(1);
});
