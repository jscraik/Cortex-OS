import { randomUUID } from 'node:crypto';
import { sleep } from '../lib/utils.js';

export interface IdempotencyStore {
	seen(id: string): Promise<boolean>;
	remember(id: string, ttlSec: number): Promise<void>;
}

const once = async <T>(
	store: IdempotencyStore,
	id: string,
	ttlSec: number,
	fn: () => Promise<T>,
): Promise<T | undefined> => {
	if (await store.seen(id)) {
		return undefined;
	}

	const result = await fn();
	await store.remember(id, ttlSec);
	return result;
};

export interface EmailTemplate {
	readonly id: string;
	readonly subject: string;
	readonly text?: string;
	readonly html?: string;
	readonly from?: string;
}

export interface EmailTemplateStore {
	get(templateId: string): Promise<EmailTemplate | undefined>;
}

export interface EmailTemplateRenderer {
	render(
		template: EmailTemplate,
		context: Record<string, unknown>,
	): Promise<{ subject: string; text?: string; html?: string; from?: string }>;
}

export interface EmailTransportMessage {
	to: string[];
	subject: string;
	text?: string;
	html?: string;
	from?: string;
	cc?: string[];
	bcc?: string[];
	headers?: Record<string, string>;
	metadata?: Record<string, unknown>;
	tags?: string[];
	idempotencyKey?: string;
}

export interface EmailTransportResponse {
	id?: string;
	accepted?: string[];
	rejected?: string[];
	metadata?: Record<string, unknown>;
}

export interface EmailTransport {
	send(message: EmailTransportMessage): Promise<EmailTransportResponse | void>;
}

export interface EmailNotificationRequest {
	to: string | string[];
	templateId: string;
	data?: Record<string, unknown>;
	idempotencyKey?: string;
	from?: string;
	cc?: string | string[];
	bcc?: string | string[];
	headers?: Record<string, string>;
	metadata?: Record<string, unknown>;
	tags?: string[];
}

export interface EmailNotificationResult {
	status: 'sent' | 'skipped';
	attempts: number;
	messageId?: string;
	idempotencyKey?: string;
}

export interface EmailNotifierRetryOptions {
	/** Total attempts including the first try. Default: 3 */
	maxAttempts?: number;
	/** Base delay in milliseconds for exponential backoff. Default: 250 */
	baseDelayMs?: number;
	/** Custom delay strategy. Receives attempt number (1-based) and base delay. */
	delayStrategy?: (attempt: number, baseDelayMs: number) => number;
	/** Override sleep implementation (useful for tests with fake timers). */
	sleepFn?: (ms: number) => Promise<void>;
}

export interface EmailNotifierIdempotencyOptions {
	store: IdempotencyStore;
	ttlSeconds?: number;
	keyFactory?: (request: EmailNotificationRequest) => string;
}

export interface EmailNotifierConfig {
	templateStore: EmailTemplateStore;
	transport: EmailTransport;
	renderer?: EmailTemplateRenderer;
	logger?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
	retry?: EmailNotifierRetryOptions;
	idempotency?: EmailNotifierIdempotencyOptions;
	defaultFrom?: string;
}

export class EmailTemplateNotFoundError extends Error {
	constructor(templateId: string) {
		super(`Email template not found: ${templateId}`);
		this.name = 'EmailTemplateNotFoundError';
	}
}

export class EmailNotificationError extends Error {
	readonly attempts: number;

	constructor(message: string, attempts: number, cause?: unknown) {
		super(message);
		this.name = 'EmailNotificationError';
		this.attempts = attempts;
		if (cause !== undefined) {
			(this as any).cause = cause;
		}
	}
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_IDEMPOTENCY_TTL = 15 * 60; // 15 minutes

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toArray = (value: string | string[] | undefined): string[] | undefined => {
	if (!value) {
		return undefined;
	}
	return Array.isArray(value) ? value : [value];
};

const defaultDelayStrategy = (attempt: number, base: number): number => base * 2 ** (attempt - 1);

const stableStringify = (value: unknown): string => {
	if (!isPlainObject(value)) {
		return JSON.stringify(value);
	}

	const sortedEntries = Object.entries(value)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, val]) => [key, isPlainObject(val) ? JSON.parse(stableStringify(val)) : val]);

	return JSON.stringify(Object.fromEntries(sortedEntries));
};

const defaultKeyFactory = (request: EmailNotificationRequest): string => {
	const parts = [
		request.templateId,
		Array.isArray(request.to) ? request.to.join(',') : request.to,
		request.idempotencyKey ?? '',
	];

	if (request.data) {
		parts.push(stableStringify(request.data));
	}

	return parts.join('|');
};

const resolvePath = (context: Record<string, unknown>, path: string): unknown => {
	return path.split('.').reduce<unknown>((acc, segment) => {
		if (acc === undefined || acc === null) {
			return undefined;
		}

		if (typeof acc !== 'object') {
			return undefined;
		}

		return (acc as Record<string, unknown>)[segment];
	}, context);
};

const renderTokenisedString = (
	template: string | undefined,
	context: Record<string, unknown>,
): string | undefined => {
	if (!template) {
		return template;
	}

	return template.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_match, token) => {
		const value = resolvePath(context, token);
		if (value === undefined || value === null) {
			return '';
		}
		return String(value);
	});
};

const defaultRenderer: EmailTemplateRenderer = {
	async render(template, context) {
		return {
			subject: renderTokenisedString(template.subject, context) ?? template.subject,
			text: renderTokenisedString(template.text, context),
			html: renderTokenisedString(template.html, context),
			from: template.from,
		};
	},
};

export interface EmailNotifier {
	send(request: EmailNotificationRequest): Promise<EmailNotificationResult>;
}

export const createEmailNotifier = (config: EmailNotifierConfig): EmailNotifier => {
	const {
		templateStore,
		transport,
		renderer = defaultRenderer,
		logger,
		retry,
		idempotency,
		defaultFrom,
	} = config;

	const maxAttempts = Math.max(1, retry?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
	const baseDelayMs = retry?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
	const delayStrategy = retry?.delayStrategy ?? defaultDelayStrategy;
	const sleepFn = retry?.sleepFn ?? sleep;

	const executeSend = async (
		request: EmailNotificationRequest,
	): Promise<EmailNotificationResult> => {
		const template = await templateStore.get(request.templateId);

		if (!template) {
			throw new EmailTemplateNotFoundError(request.templateId);
		}

		const context = request.data ?? {};
		const rendered = await renderer.render(template, context);
		const to = Array.isArray(request.to) ? request.to : [request.to];

		if (!to.length) {
			throw new EmailNotificationError('Email notification requires at least one recipient', 0);
		}

		const message: EmailTransportMessage = {
			to,
			subject: rendered.subject,
			text: rendered.text ?? template.text,
			html: rendered.html ?? template.html,
			from: request.from ?? rendered.from ?? template.from ?? defaultFrom,
			cc: toArray(request.cc),
			bcc: toArray(request.bcc),
			headers: request.headers,
			metadata: request.metadata,
			tags: request.tags,
			idempotencyKey: request.idempotencyKey,
		};

		let attempts = 0;
		let lastError: unknown;
		let sendResult: EmailTransportResponse | void;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			attempts = attempt;

			try {
				sendResult = await transport.send(message);
				return {
					status: 'sent',
					attempts,
					messageId: sendResult?.id ?? randomUUID(),
					idempotencyKey: request.idempotencyKey,
				};
			} catch (error) {
				lastError = error;

				if (attempt === maxAttempts) {
					logger?.error?.('Email notification send failed', error);
					throw new EmailNotificationError('Failed to send email notification', attempts, error);
				}

				logger?.warn?.('Email notification send failed, retrying', {
					templateId: request.templateId,
					attempt,
					reason: (error as Error)?.message ?? error,
				});

				const delay = Math.max(0, delayStrategy(attempt, baseDelayMs));
				if (delay > 0) {
					await sleepFn(delay);
				}
			}
		}

		throw new EmailNotificationError('Failed to send email notification', attempts, lastError);
	};

	return {
		async send(request: EmailNotificationRequest): Promise<EmailNotificationResult> {
			if (!idempotency) {
				return executeSend(request);
			}

			const ttl = Math.max(1, idempotency.ttlSeconds ?? DEFAULT_IDEMPOTENCY_TTL);
			const key = request.idempotencyKey ?? idempotency.keyFactory?.(request) ?? defaultKeyFactory(request);

			const result = await once(idempotency.store, key, ttl, () => executeSend({ ...request, idempotencyKey: key }));

			if (!result) {
				logger?.info?.('Email notification skipped due to idempotency', {
					templateId: request.templateId,
					idempotencyKey: key,
				});

				return {
					status: 'skipped',
					attempts: 0,
					idempotencyKey: key,
				};
			}

			return {
				...result,
				idempotencyKey: key,
			};
		},
	};
};

export class InMemoryEmailTemplateStore implements EmailTemplateStore {
	private readonly templates = new Map<string, EmailTemplate>();

	constructor(initialTemplates: EmailTemplate[] = []) {
		for (const template of initialTemplates) {
			this.templates.set(template.id, template);
		}
	}

	async get(templateId: string): Promise<EmailTemplate | undefined> {
		return this.templates.get(templateId);
	}

	async set(template: EmailTemplate): Promise<void> {
		this.templates.set(template.id, template);
	}

	async delete(templateId: string): Promise<void> {
		this.templates.delete(templateId);
	}
}
