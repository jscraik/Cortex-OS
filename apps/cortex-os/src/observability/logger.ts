import { randomUUID } from 'node:crypto';

export interface HttpLogEntry {
	service: string;
	method: string;
	path: string;
	status: number;
	durationMs: number;
	requestId?: string;
	message?: string;
	error?: string;
	metadata?: Record<string, unknown>;
}

export function createRequestId(): string {
	return randomUUID();
}

export function logHttpInfo(entry: HttpLogEntry): void {
	const payload = {
		brand: 'brAInwav',
		level: 'info',
		type: 'http.server.request',
		timestamp: new Date().toISOString(),
		service: entry.service,
		method: entry.method,
		path: entry.path,
		status: entry.status,
		durationMs: Number(entry.durationMs.toFixed(3)),
		requestId: entry.requestId,
		message: entry.message ?? 'HTTP request completed',
		metadata: entry.metadata ?? {},
	};
	console.info(JSON.stringify(payload));
}

export function logHttpError(entry: HttpLogEntry): void {
	const payload = {
		brand: 'brAInwav',
		level: 'error',
		type: 'http.server.error',
		service: entry.service,
		method: entry.method,
		path: entry.path,
		status: entry.status,
		error: entry.error ?? 'Unknown error',
		requestId: entry.requestId,
		durationMs: Number(entry.durationMs.toFixed(3)),
		timestamp: new Date().toISOString(),
	};
	console.error(JSON.stringify(payload));
}
