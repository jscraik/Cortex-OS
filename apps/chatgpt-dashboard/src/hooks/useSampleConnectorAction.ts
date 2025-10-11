import * as React from 'react';

interface SampleCallResponse {
	readonly brand: string;
	readonly connectorId: string;
	readonly action: string;
	readonly timestamp: string;
	readonly summary: string;
	readonly metadata: Record<string, unknown>;
	readonly sample?: Record<string, unknown>;
	readonly echo: Record<string, unknown>;
}

interface RunSampleParams {
	readonly connectorId: string;
	readonly action: string;
	readonly payload: Record<string, unknown>;
}

interface SampleActionState {
	readonly loading: boolean;
	readonly result?: SampleCallResponse;
	readonly error?: string;
	readonly lastAction?: RunSampleParams;
}

interface UseSampleConnectorActionResult extends SampleActionState {
	readonly runSample: (params: RunSampleParams) => Promise<void>;
	readonly reset: () => void;
}

const SAMPLE_ENDPOINT = '/v1/connectors/sample-call';

const normaliseError = (error: unknown): string => {
	if (error instanceof DOMException && error.name === 'AbortError') {
		return '[brAInwav] Sample invocation cancelled';
	}
	if (error instanceof Error) {
		return error.message.startsWith('[brAInwav]') ? error.message : `[brAInwav] ${error.message}`;
	}
	return `[brAInwav] ${String(error)}`;
};

export function useSampleConnectorAction(): UseSampleConnectorActionResult {
	const [state, setState] = React.useState<SampleActionState>({ loading: false });
	const abortRef = React.useRef<AbortController | null>(null);

	const reset = React.useCallback(() => {
		abortRef.current?.abort();
		setState({ loading: false });
	}, []);

	const runSample = React.useCallback(async (params: RunSampleParams) => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setState({ loading: true, error: undefined, result: undefined, lastAction: params });

		try {
			const response = await fetch(SAMPLE_ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					connectorId: params.connectorId,
					action: params.action,
					input: params.payload,
				}),
				signal: controller.signal,
			});

			if (!response.ok) {
				const body = await response.text().catch(() => '');
				throw new Error(
					`[brAInwav] Sample connector call failed (${response.status} ${response.statusText}) ${body.slice(0, 140)}`,
				);
			}

			const json = (await response.json()) as SampleCallResponse;
			setState({ loading: false, result: json, error: undefined, lastAction: params });
		} catch (error) {
			if (controller.signal.aborted) {
				setState({
					loading: false,
					error: '[brAInwav] Sample invocation cancelled',
					lastAction: params,
				});
				return;
			}
			setState({ loading: false, error: normaliseError(error), lastAction: params });
		}
	}, []);

	React.useEffect(() => () => abortRef.current?.abort(), []);

	return React.useMemo(
		() => ({
			loading: state.loading,
			result: state.result,
			error: state.error,
			lastAction: state.lastAction,
			runSample,
			reset,
		}),
		[state, runSample, reset],
	);
}
