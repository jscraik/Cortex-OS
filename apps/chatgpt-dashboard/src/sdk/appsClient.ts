import type { ConnectorServiceEntry } from './types';

declare global {
	interface Window {
		openai?: {
			apps?: {
				createClient?: () => unknown;
			};
		};
	}
}

let cachedClient: unknown | null = null;

export async function ensureAppsClient(): Promise<unknown | null> {
	if (cachedClient) {
		return cachedClient;
	}

	// Prefer the runtime-provided client from ChatGPT Apps.
	const factory = window.openai?.apps?.createClient;
	if (typeof factory === 'function') {
		cachedClient = factory();
		return cachedClient;
	}

	// Fall back to dynamically importing the SDK for local previews.
	try {
		const sdk = await import('@openai/apps-sdk');
		if (typeof sdk.createClient === 'function') {
			cachedClient = sdk.createClient();
			return cachedClient;
		}
	} catch (error) {
		console.warn('OpenAI Apps SDK not available', error);
	}

	return null;
}

export interface ServiceMapPayload {
	id: string;
	brand: string;
	generatedAt: string;
	ttlSeconds: number;
	connectors: ConnectorServiceEntry[];
	signature?: string;
}
