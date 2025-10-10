import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ensureAppsClient, type ServiceMapPayload } from '../sdk/appsClient';

interface HookState {
	loading: boolean;
	error?: Error;
	data?: ServiceMapPayload;
}

const DEFAULT_POLL_INTERVAL = 30_000;

async function fetchViaAppsSdk(): Promise<ServiceMapPayload | null> {
	const client = await ensureAppsClient();
	if (!client) {
		return null;
	}

	const connectors = (client as any)?.connectors;
	if (connectors && typeof connectors.serviceMap === 'function') {
		const response = await connectors.serviceMap();
		return response as ServiceMapPayload;
	}

	return null;
}

async function fetchViaHttp(signal: AbortSignal): Promise<ServiceMapPayload> {
	const response = await fetch('/v1/connectors/service-map', {
		method: 'GET',
		signal,
		headers: {
			Accept: 'application/json',
		},
	});
	if (!response.ok) {
		throw new Error(`Failed to fetch service map: ${response.status}`);
	}
	return (await response.json()) as ServiceMapPayload;
}

export function useConnectorState(pollIntervalMs: number = DEFAULT_POLL_INTERVAL) {
	const [state, setState] = useState<HookState>({ loading: true });
	const controllerRef = useRef<AbortController | null>(null);
	const ttlRef = useRef<number | undefined>(undefined);

	const fetchMap = useCallback(async () => {
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setState((prev) => ({ ...prev, loading: true, error: undefined }));
		try {
			const sdkResult = await fetchViaAppsSdk();
			if (sdkResult) {
				ttlRef.current = sdkResult.ttlSeconds;
				setState({ data: sdkResult, loading: false });
				return;
			}
			const httpResult = await fetchViaHttp(controller.signal);
			ttlRef.current = httpResult.ttlSeconds;
			setState({ data: httpResult, loading: false });
		} catch (error) {
			if ((error as Error).name === 'AbortError') {
				return;
			}
			setState({ error: error as Error, loading: false });
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		let timeoutId: number | null = null;

		const scheduleNext = (ttlSeconds: number | undefined) => {
			if (cancelled) {
				return;
			}
			const delay = Math.max((ttlSeconds ?? pollIntervalMs / 1000) * 1000, pollIntervalMs);
			timeoutId = window.setTimeout(() => {
				void performFetch();
			}, delay);
		};

		const performFetch = async () => {
			await fetchMap();
			scheduleNext(ttlRef.current);
		};

		void performFetch();

		return () => {
			cancelled = true;
			if (timeoutId !== null) {
				window.clearTimeout(timeoutId);
			}
			controllerRef.current?.abort();
		};
	}, [fetchMap, pollIntervalMs]);

	const refresh = useCallback(() => {
		void fetchMap();
	}, [fetchMap]);

	const connectors = useMemo(() => state.data?.connectors ?? [], [state.data]);

	return {
		loading: state.loading,
		error: state.error,
		serviceMap: state.data,
		connectors,
		refresh,
	};
}
