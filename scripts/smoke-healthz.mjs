import { initializeASBR } from '../packages/asbr/src/index.js';

const { server } = await initializeASBR({ port: 0, host: '127.0.0.1' });
const address = server.server?.address();
const port = typeof address === 'object' && address ? address.port : 0;
const res = await fetch(`http://127.0.0.1:${port}/healthz`);
const ok = res.status === 200;
await server.stop();
if (!ok) {
	console.error('Health check failed');
	process.exit(1);
}
console.log('Health check passed');
