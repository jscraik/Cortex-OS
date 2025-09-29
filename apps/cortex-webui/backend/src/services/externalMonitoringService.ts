import { createCounter } from '@cortex-os/telemetry';
import logger from '../utils/logger';

type AuthEventType =
	| 'login'
	| 'logout'
	| 'register'
	| 'password_reset'
	| 'email_verified'
	| '2fa_enabled'
	| '2fa_disabled'
	| 'oauth_signin'
	| 'failed_login';

type ProviderName = 'datadog' | 'newRelic' | 'webhook';

type ProviderSkipReason = 'missing_credentials' | 'missing_url' | 'invalid_url';

export interface AuthMonitoringPayload {
	userId?: string;
	eventType: AuthEventType;
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, unknown>;
	timestamp: Date;
}

interface MonitoringConfig {
	prometheusEnabled: boolean;
	timeoutMs: number;
	datadogApiKey?: string;
	datadogAppKey?: string;
	datadogSite: string;
	newRelicAccountId?: string;
	newRelicInsertKey?: string;
	webhookUrl?: string;
}

interface VendorContext {
	status: 'success' | 'failure';
	actorType: 'user' | 'system';
}

const AUTH_COUNTER = createCounter(
	'brainwav_auth_events_total',
	'brAInwav Cortex-OS authentication events total',
);

const DEFAULT_TIMEOUT_MS = 3_000;

function resolveConfig(): MonitoringConfig {
	const timeoutRaw = Number.parseInt(process.env.AUTH_MONITORING_TIMEOUT_MS ?? '3000', 10);
	return {
		prometheusEnabled: process.env.AUTH_MONITORING_PROMETHEUS_ENABLED !== 'false',
		timeoutMs: Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : DEFAULT_TIMEOUT_MS,
		datadogApiKey: safeEnv(process.env.AUTH_MONITORING_DATADOG_API_KEY),
		datadogAppKey: safeEnv(process.env.AUTH_MONITORING_DATADOG_APP_KEY),
		datadogSite: safeEnv(process.env.AUTH_MONITORING_DATADOG_SITE) ?? 'datadoghq.com',
		newRelicAccountId: safeEnv(process.env.AUTH_MONITORING_NEW_RELIC_ACCOUNT_ID),
		newRelicInsertKey: safeEnv(process.env.AUTH_MONITORING_NEW_RELIC_INSERT_KEY),
		webhookUrl: safeEnv(process.env.AUTH_MONITORING_WEBHOOK_URL),
	};
}

function safeEnv(value?: string): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function deriveStatus(eventType: AuthEventType): 'success' | 'failure' {
	return eventType === 'failed_login' ? 'failure' : 'success';
}

function deriveActorType(event: AuthMonitoringPayload): 'user' | 'system' {
	return event.userId ? 'user' : 'system';
}

function logProviderSkip(provider: ProviderName, reason: ProviderSkipReason): void {
        const payload = { provider, reason } as const;

        if (reason === 'invalid_url') {
                logger.warn('brAInwav external monitoring invalid webhook configuration', payload);
                return;
        }

        logger.info('external-monitoring: provider skipped for brAInwav auth monitoring', payload);
}

function logProviderFailure(provider: ProviderName, status?: number, error?: unknown): void {
        if (status !== undefined) {
                logger.warn('brAInwav external monitoring provider failure', {
                        provider,
                        status,
                });
                return;
        }

        const message = resolveErrorReason(error);
        logger.warn('brAInwav external monitoring request error', {
                provider,
                reason: message,
        });
}

function resolveErrorReason(error: unknown): string {
        if (error instanceof Error) {
                return error.message;
        }

        if (typeof error === 'object' && error !== null) {
                const potentialMessage = (error as { message?: unknown }).message;
                if (typeof potentialMessage === 'string' && potentialMessage.trim() !== '') {
                        return potentialMessage;
                }

                const potentialName = (error as { name?: unknown }).name;
                if (typeof potentialName === 'string' && potentialName.trim() !== '') {
                        return potentialName;
                }
        }

        return 'unknown error';
}

function buildDatadogBody(
	event: AuthMonitoringPayload,
	context: VendorContext,
): Record<string, unknown> {
	return {
		title: `brAInwav auth ${event.eventType}`,
		text: `brAInwav authentication event ${event.eventType} for ${event.userId ?? 'anonymous'}`,
		alert_type: context.status === 'success' ? 'info' : 'error',
		tags: [
			'brAInwav',
			'auth',
			`event:${event.eventType}`,
			`status:${context.status}`,
			`actor:${context.actorType}`,
		],
		date_happened: Math.floor(event.timestamp.getTime() / 1_000),
		aggregation_key: event.userId ?? 'anonymous',
		source_type_name: 'brAInwav Cortex-OS',
		metadata: event.metadata,
	};
}

function buildNewRelicBody(
	event: AuthMonitoringPayload,
	context: VendorContext,
): Array<Record<string, unknown>> {
	return [
		{
			eventType: 'BrAInwavAuthEvent',
			eventName: event.eventType,
			status: context.status,
			actorType: context.actorType,
			occurredAt: event.timestamp.toISOString(),
			userId: event.userId,
			ipAddress: event.ipAddress,
			userAgent: event.userAgent,
			metadata: event.metadata,
		},
	];
}

function buildWebhookBody(
	event: AuthMonitoringPayload,
	context: VendorContext,
): Record<string, unknown> {
	return {
		...event,
		status: context.status,
		actorType: context.actorType,
	};
}

async function executeRequest(
	provider: ProviderName,
	url: string,
	init: RequestInit,
	timeoutMs: number,
): Promise<void> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { ...init, signal: controller.signal });
		if (!response.ok) {
			logProviderFailure(provider, response.status);
		}
	} catch (error) {
		logProviderFailure(provider, undefined, error);
	} finally {
		clearTimeout(timer);
	}
}

async function sendToDatadog(
	event: AuthMonitoringPayload,
	config: MonitoringConfig,
	context: VendorContext,
): Promise<void> {
	if (!config.datadogApiKey) {
		logProviderSkip('datadog', 'missing_credentials');
		return;
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'DD-API-KEY': config.datadogApiKey,
	};

	if (config.datadogAppKey) {
		headers['DD-APPLICATION-KEY'] = config.datadogAppKey;
	}

	const url = `https://api.${config.datadogSite}/api/v1/events`;
	const body = JSON.stringify(buildDatadogBody(event, context));

	await executeRequest(
		'datadog',
		url,
		{
			method: 'POST',
			headers,
			body,
		},
		config.timeoutMs,
	);
}

async function sendToNewRelic(
	event: AuthMonitoringPayload,
	config: MonitoringConfig,
	context: VendorContext,
): Promise<void> {
	if (!config.newRelicAccountId || !config.newRelicInsertKey) {
		logProviderSkip('newRelic', 'missing_credentials');
		return;
	}

	const url = `https://insights-collector.newrelic.com/v1/accounts/${config.newRelicAccountId}/events`;
	const body = JSON.stringify(buildNewRelicBody(event, context));

	await executeRequest(
		'newRelic',
		url,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Insert-Key': config.newRelicInsertKey,
			},
			body,
		},
		config.timeoutMs,
	);
}

async function sendToWebhook(
	event: AuthMonitoringPayload,
	config: MonitoringConfig,
	context: VendorContext,
): Promise<void> {
	if (!config.webhookUrl) {
		logProviderSkip('webhook', 'missing_url');
		return;
	}

	let parsed: URL;
	try {
		parsed = new URL(config.webhookUrl);
	} catch (_error) {
		logProviderSkip('webhook', 'invalid_url');
		return;
	}

	if (parsed.protocol !== 'https:') {
		logProviderSkip('webhook', 'invalid_url');
		return;
	}

	const body = JSON.stringify(buildWebhookBody(event, context));

	await executeRequest(
		'webhook',
		parsed.toString(),
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body,
		},
		config.timeoutMs,
	);
}

async function dispatchVendors(
        event: AuthMonitoringPayload,
        config: MonitoringConfig,
        context: VendorContext,
): Promise<void> {
        await sendToDatadog(event, config, context);
        await sendToNewRelic(event, config, context);
        await sendToWebhook(event, config, context);
}

async function recordPrometheus(
	event: AuthMonitoringPayload,
	context: VendorContext,
	config: MonitoringConfig,
): Promise<void> {
	if (!config.prometheusEnabled) {
		return;
	}

	AUTH_COUNTER.add(1, {
		eventType: event.eventType,
		actorType: context.actorType,
		status: context.status,
	});
}

async function emitAuthEvent(event: AuthMonitoringPayload): Promise<void> {
	const config = resolveConfig();
	const context: VendorContext = {
		status: deriveStatus(event.eventType),
		actorType: deriveActorType(event),
	};

	await recordPrometheus(event, context, config);
	await dispatchVendors(event, config, context);
}

export const externalMonitoringService = {
	emitAuthEvent,
};
