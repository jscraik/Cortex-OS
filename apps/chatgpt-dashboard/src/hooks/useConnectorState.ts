import * as React from 'react';

import { ensureAppsClient, type ServiceMapPayload } from '../sdk/appsClient.js';
import type { ConnectorServiceEntry } from '../sdk/types.js';

const CONNECTORS_ROUTE = '/v1/connectors/service-map';
const AUTO_REFRESH_BUFFER_MS = 5_000;

interface ConnectorCard extends ConnectorServiceEntry {
	readonly expiresAt: string | null;
	readonly statusLabel: string;
}

interface ConnectorMetadata {
	readonly id: string;
	readonly brand: string;
	readonly generatedAt: string;
	readonly expiresAt: string | null;
	readonly ttlSeconds: number;
	readonly remainingSeconds: number;
	readonly signature?: string;
	readonly count: number;
}

interface ConnectorState {
	readonly connectors: ConnectorCard[];
	readonly metadata?: ConnectorMetadata;
	readonly loading: boolean;
	readonly refreshing: boolean;
	readonly error?: string;
	readonly refresh: () => Promise<void>;
}

type FetchReason = 'initial' | 'manual' | 'auto';

interface NormalisedMap {
	readonly payload: ServiceMapPayload;
	readonly signature?: string;
}

interface AppsClientLike {
	readonly connectors?: {
		readonly serviceMap?: () => Promise<unknown>;
	};
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object';

const toStringArray = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];
	return value.filter((entry): entry is string => typeof entry === 'string');
};

const toStringMap = (value: unknown): Record<string, string> => {
	if (!isRecord(value)) return {};
	return Object.entries(value).reduce<Record<string, string>>((acc, [key, entry]) => {
		if (typeof entry === 'string') {
			acc[key] = entry;
		}
		return acc;
	}, {});
};

const toAuth = (value: unknown): ConnectorServiceEntry['auth'] => {
	if (!isRecord(value)) {
		return { type: 'none' };
	}

	const type = value.type;
	const headerName = value.headerName;
	if (type === 'bearer' || type === 'apiKey') {
		return {
			type,
			headerName: typeof headerName === 'string' && headerName.length > 0 ? headerName : undefined,
		};
	}

	return { type: 'none' };
};

const computeExpiryIso = (generatedAt: string, ttlSeconds: number): string | null => {
	const generated = Date.parse(generatedAt);
	if (Number.isNaN(generated)) return null;
	const expiresAt = generated + Math.max(1, ttlSeconds) * 1000;
	return new Date(expiresAt).toISOString();
};

const statusLabelFor = (
	enabled: boolean,
	status: string | undefined,
	metadata: Record<string, unknown>,
): string => {
	if (typeof status === 'string' && status.length > 0) {
		return status;
	}
	const metadataStatus = metadata.status;
	if (typeof metadataStatus === 'string' && metadataStatus.length > 0) {
		return metadataStatus;
	}
	return enabled ? 'Enabled' : 'Disabled';
};

const normaliseConnector = (entry: Record<string, unknown>, generatedAt: string): ConnectorCard => {
	const id = typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : 'unknown-connector';
	const displayName =
		typeof entry.displayName === 'string' && entry.displayName.length > 0 ? entry.displayName : id;
	const version =
		typeof entry.version === 'string' && entry.version.length > 0 ? entry.version : '0.0.0';
	const endpoint = typeof entry.endpoint === 'string' ? entry.endpoint : '';
	const scopes = toStringArray(entry.scopes);
	const tags = toStringArray(entry.tags);
	const metadata = isRecord(entry.metadata) ? (entry.metadata as Record<string, unknown>) : {};
	const ttlSeconds =
		typeof entry.ttlSeconds === 'number' && Number.isFinite(entry.ttlSeconds)
			? entry.ttlSeconds
			: 0;
	const enabled = typeof entry.enabled === 'boolean' ? entry.enabled : true;
	const status = typeof entry.status === 'string' ? entry.status : undefined;
	const expiresAt = ttlSeconds > 0 ? computeExpiryIso(generatedAt, ttlSeconds) : null;

	return {
		id,
		displayName,
		version,
		endpoint,
		scopes,
		auth: toAuth(entry.auth),
		headers:
			Object.keys(toStringMap(entry.headers)).length > 0 ? toStringMap(entry.headers) : undefined,
		quotas: isRecord(entry.quotas) ? (entry.quotas as ConnectorServiceEntry['quotas']) : undefined,
		metadata,
		enabled,
		status: status as ConnectorServiceEntry['status'],
		ttlSeconds,
		tags,
		availability: isRecord(entry.availability)
			? (entry.availability as ConnectorServiceEntry['availability'])
			: undefined,
		timeouts: isRecord(entry.timeouts) ? (entry.timeouts as Record<string, number>) : undefined,
		statusLabel: statusLabelFor(enabled, status, metadata),
		expiresAt,
		description: typeof entry.description === 'string' ? entry.description : undefined,
	};
};

const normaliseMap = (value: unknown): NormalisedMap | null => {
	if (!isRecord(value)) return null;
	const signature = typeof value.signature === 'string' ? value.signature : undefined;
	const payload = isRecord(value.payload) ? value.payload : value;
	if (!isRecord(payload)) return null;

	const id = typeof payload.id === 'string' ? payload.id : 'unknown-map';
	const brand = typeof payload.brand === 'string' ? payload.brand : 'brAInwav';
	const generatedAt =
		typeof payload.generatedAt === 'string' ? payload.generatedAt : new Date().toISOString();
	const ttlSeconds =
		typeof payload.ttlSeconds === 'number' && Number.isFinite(payload.ttlSeconds)
			? payload.ttlSeconds
			: 60;
	const connectorsValue = payload.connectors;
	if (!Array.isArray(connectorsValue) || connectorsValue.length === 0) {
		return null;
	}

	const connectors = connectorsValue
		.filter((entry): entry is Record<string, unknown> => isRecord(entry))
		.map((entry) => normaliseConnector(entry, generatedAt));

	if (connectors.length === 0) return null;

	return {
		payload: {
			id,
			brand,
			generatedAt,
			ttlSeconds,
			connectors,
		},
		signature,
	};
};

const fetchViaAppsClient = async (client: AppsClientLike): Promise<NormalisedMap | null> => {
	const serviceMap = client.connectors?.serviceMap;
	if (typeof serviceMap !== 'function') return null;
	try {
		const response = await serviceMap();
		return normaliseMap(response);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (!message.includes('OpenAI Apps SDK runtime client is not available')) {
			throw error;
		}
	}
	return null;
};

const fetchViaHttp = async (signal: AbortSignal): Promise<NormalisedMap> => {
	const response = await fetch(CONNECTORS_ROUTE, {
		headers: { Accept: 'application/json' },
		signal,
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(
			`[brAInwav] Connectors manifest request failed (${response.status} ${body.slice(0, 120)})`,
		);
	}

	const json = await response.json();
	const normalised = normaliseMap(json);
	if (!normalised) {
		throw new Error('[brAInwav] Connectors manifest response missing payload');
	}
	return normalised;
};

const toMetadata = (map: NormalisedMap): ConnectorMetadata => {
	const expiresAt = computeExpiryIso(map.payload.generatedAt, map.payload.ttlSeconds);
	return {
		id: map.payload.id,
		brand: map.payload.brand,
		generatedAt: map.payload.generatedAt,
		expiresAt,
		ttlSeconds: map.payload.ttlSeconds,
		remainingSeconds: 0,
		signature: map.signature,
		count: map.payload.connectors.length,
	};
};

const ttlFromMetadata = (metadata: ConnectorMetadata | undefined): number => {
	if (!metadata?.expiresAt) return 0;
	const remaining = Math.floor((Date.parse(metadata.expiresAt) - Date.now()) / 1000);
	return Number.isFinite(remaining) ? Math.max(0, remaining) : 0;
};

const buildStateFromMap = (
	map: NormalisedMap,
): {
	connectors: ConnectorCard[];
	metadata: ConnectorMetadata;
} => {
	const metadata = toMetadata(map);
	const connectors = map.payload.connectors.map((connector) =>
		normaliseConnector(connector as Record<string, unknown>, map.payload.generatedAt),
	);
	return {
		connectors,
		metadata: { ...metadata, remainingSeconds: ttlFromMetadata(metadata) },
	};
};

export const useConnectorState = (): ConnectorState => {
	const [state, setState] = React.useState<Omit<ConnectorState, 'refresh'>>({
		connectors: [],
		metadata: undefined,
		loading: true,
		refreshing: false,
		error: undefined,
	});

	const timerRef = React.useRef<number | null>(null);
	const controllerRef = React.useRef<AbortController | null>(null);
	const mountedRef = React.useRef(true);
	const runFetchRef = React.useRef<((reason: FetchReason) => Promise<void>) | null>(null);

	const scheduleAutoRefresh = React.useCallback((metadata?: ConnectorMetadata) => {
		if (timerRef.current !== null) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		if (!metadata?.expiresAt) return;
		const delay = Math.max(0, Date.parse(metadata.expiresAt) - Date.now() - AUTO_REFRESH_BUFFER_MS);
		if (delay <= 0) return;
		timerRef.current = window.setTimeout(() => {
			runFetchRef.current?.('auto');
		}, delay);
	}, []);

	const runFetch = React.useCallback(
		async (reason: FetchReason) => {
			controllerRef.current?.abort();
			const controller = new AbortController();
			controllerRef.current = controller;

			setState((prev) => ({
				...prev,
				loading: reason === 'initial',
				refreshing: reason === 'manual' || reason === 'auto',
				error: reason === 'initial' ? undefined : prev.error,
			}));

			try {
				const client = (await ensureAppsClient()) as AppsClientLike | null;
				const viaClient = client ? await fetchViaAppsClient(client) : null;
				const map = viaClient ?? (await fetchViaHttp(controller.signal));
				if (!mountedRef.current) return;
				const next = buildStateFromMap(map);
				setState({
					connectors: next.connectors,
					metadata: next.metadata,
					loading: false,
					refreshing: false,
					error: undefined,
				});
				scheduleAutoRefresh(next.metadata);
			} catch (error) {
				if (!mountedRef.current || controller.signal.aborted) {
					return;
				}
				const message = error instanceof Error ? error.message : String(error);
				setState((prev) => ({
					...prev,
					loading: false,
					refreshing: false,
					error: message.startsWith('[brAInwav]') ? message : `[brAInwav] ${message}`,
				}));
			}
		},
		[scheduleAutoRefresh],
	);

	runFetchRef.current = runFetch;

	const refresh = React.useCallback(async () => {
		await runFetch('manual');
	}, [runFetch]);

	React.useEffect(() => {
		runFetch('initial');
		return () => {
			mountedRef.current = false;
			controllerRef.current?.abort();
			if (timerRef.current !== null) {
				window.clearTimeout(timerRef.current);
			}
		};
	}, [runFetch]);

	return React.useMemo<ConnectorState>(
		() => ({
			...state,
			refresh,
		}),
		[state, refresh],
	);
};

export type { ConnectorCard, ConnectorMetadata };
