import { buildConfig, loadEnv } from '@cortex-os/mvp-core';

export const env = loadEnv();
export const cfg = buildConfig({
	serviceName: '@cortex-os/mvp-server',
	serviceVersion: '0.1.0',
	sandbox: env.NODE_ENV !== 'production',
	requestTimeoutMs: 30_000,
});

export const http = {
	host: '0.0.0.0',
	port: Number(process.env.PORT ?? 8080),
};
