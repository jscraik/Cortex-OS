import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { Request as ExpressRequest, RequestHandler } from 'express';

type BetterAuthHandler = (request: Request) => Promise<Response>;
type HeadersWithGetSetCookie = Headers & {
	getSetCookie?: () => string[];
};

const asBodyInit = (payload: unknown): BodyInit | undefined => {
	if (payload === undefined || payload === null) {
		return undefined;
	}

	if (typeof payload === 'string') {
		return payload;
	}

	if (Buffer.isBuffer(payload)) {
		return payload as unknown as BodyInit;
	}

	if (payload instanceof ArrayBuffer) {
		return Buffer.from(payload) as unknown as BodyInit;
	}

	if (payload instanceof Uint8Array) {
		return Buffer.from(payload) as unknown as BodyInit;
	}

	return undefined;
};

const buildHeaders = (req: ExpressRequest): Headers => {
	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers)) {
		if (value === undefined) {
			continue;
		}

		if (Array.isArray(value)) {
			for (const entry of value) {
				headers.append(key, entry);
			}
			continue;
		}

		headers.append(key, value);
	}

	return headers;
};

const resolveAbsoluteUrl = (req: ExpressRequest, fallbackBaseUrl: string): string => {
	const baseUrl = new URL(fallbackBaseUrl);
	const protocolHeader = req.headers['x-forwarded-proto'];
	const hostHeader = req.headers['x-forwarded-host'];

	const protocol =
		typeof protocolHeader === 'string' ? protocolHeader : baseUrl.protocol.replace(':', '');
	const host = typeof hostHeader === 'string' ? hostHeader : baseUrl.host;
	const origin = `${protocol}://${host}`;
	const relative = req.originalUrl ?? req.url;

	return new URL(relative, origin).toString();
};

const buildBody = (req: ExpressRequest, headers: Headers): BodyInit | undefined => {
	const method = req.method?.toUpperCase() ?? 'GET';
	if (method === 'GET' || method === 'HEAD') {
		return undefined;
	}

	const payload = req.body;
	const normalized = asBodyInit(payload);
	if (normalized !== undefined) {
		return normalized;
	}

	if (payload === undefined || payload === null) {
		return undefined;
	}

	if (!headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}

	return JSON.stringify(payload);
};

const sendResponse = async (res: Parameters<RequestHandler>[1], response: Response) => {
	res.status(response.status);
	response.headers.forEach((value, key) => {
		if (key.toLowerCase() === 'set-cookie') {
			return;
		}

		res.setHeader(key, value);
	});

	const headersWithCookies = response.headers as HeadersWithGetSetCookie;
	const cookies = headersWithCookies.getSetCookie?.() ?? [];
	if (cookies.length > 0) {
		if (cookies.length > 0) {
			res.setHeader('set-cookie', cookies);
		}
	}

	if (!response.body) {
		res.end();
		return;
	}

	const nodeStream = Readable.fromWeb(response.body as unknown as NodeReadableStream);
	nodeStream.on('error', (error: unknown) => {
		res.destroy(error instanceof Error ? error : new Error(String(error)));
	});
	nodeStream.pipe(res);
};

const formatError = (error: unknown) => {
	if (error instanceof Error) {
		return {
			message: error.message,
			stack: error.stack,
			name: error.name,
		};
	}

	return { value: error };
};

export const createAuthExpressMiddleware = (
	handler: BetterAuthHandler,
	baseUrl: string,
): RequestHandler => {
	const middleware: RequestHandler = (req, res, next) => {
		void (async () => {
			try {
				const headers = buildHeaders(req);
				const url = resolveAbsoluteUrl(req, baseUrl);
				console.error('[brAInwav][better-auth-express] forwarding request', {
					method: req.method,
					resolvedUrl: url,
					originalUrl: req.originalUrl,
					url: req.url,
					headers: {
						host: req.headers.host,
						'x-forwarded-host': req.headers['x-forwarded-host'],
						'x-forwarded-proto': req.headers['x-forwarded-proto'],
					},
				});
				const body = buildBody(req, headers);
				const init: RequestInit = {
					method: req.method,
					headers,
				};
				if (body !== undefined) {
					init.body = body;
					(init as { duplex: 'half' }).duplex = 'half';
				}

				const response = await handler(new Request(url, init));
				if (response.status >= 400) {
					try {
						const clone = response.clone();
						const text = await clone.text();
						let parsed: unknown;
						try {
							parsed = text.length > 0 ? JSON.parse(text) : undefined;
						} catch (parseError) {
							parsed = { parseError: formatError(parseError), raw: text };
						}

						const captured = {
							status: response.status,
							body: parsed,
							method: req.method,
							resolvedUrl: url,
							originalUrl: req.originalUrl,
						};
						(globalThis as Record<string, unknown>).__brAInwavBetterAuthLastError = captured;
						console.error('[brAInwav][better-auth-express] captured error response', captured);
					} catch (captureError) {
						console.error('[brAInwav][better-auth-express] failed to capture error body', {
							captureError: formatError(captureError),
						});
					}
				}

				await sendResponse(res, response);
			} catch (error) {
				const formattedError = formatError(error);
				console.error('[brAInwav][better-auth-express] handler failure', {
					error: formattedError,
					method: req.method,
					originalUrl: req.originalUrl,
					resolvedUrl: resolveAbsoluteUrl(req, baseUrl),
				});
				(globalThis as Record<string, unknown>).__brAInwavBetterAuthLastError = {
					error: formattedError,
					method: req.method,
					originalUrl: req.originalUrl,
				};
				next(error);
			}
		})();
	};

	return middleware;
};
