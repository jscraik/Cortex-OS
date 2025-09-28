import type {
	ExecutionSummary,
	RunInput,
} from '../../packages/orchestration/src/langgraph/executor.js';
import { runOnce } from '../../packages/orchestration/src/langgraph/executor.js';
import type {
	SpoolResult,
	SpoolRunOptions,
	SpoolTask,
} from '../../packages/orchestration/src/langgraph/spool.js';
import { runSpool } from '../../packages/orchestration/src/langgraph/spool.js';
import type { MockA2AEvent } from '../utils/a2a-bus.js';
import { createMockA2ABus } from '../utils/a2a-bus.js';
import type { MockWebSocketMessage } from '../utils/websocket.js';
import { createMockWebSocket } from '../utils/websocket.js';

type ThermalState = 'nominal' | 'warning' | 'critical';

export interface HarnessRunResult {
	output?: string;
	summary: ExecutionSummary;
	logs: string[];
	events: MockA2AEvent[];
	websocket: MockWebSocketMessage[];
}

export interface HarnessRunOptions {
	streaming?: boolean;
	thermalState?: ThermalState;
	onSummary?: (summary: ExecutionSummary) => void;
}

interface ThermalMock {
	state: ThermalState;
	history: ThermalState[];
	setState: (state: ThermalState) => void;
}

export interface LanggraphHarness {
	run: (input: string | RunInput, options?: HarnessRunOptions) => Promise<HarnessRunResult>;
	spool: <T>(tasks: SpoolTask<T>[], options?: SpoolRunOptions) => Promise<SpoolResult<T>[]>;
	thermal: ThermalMock;
	a2aBus: ReturnType<typeof createMockA2ABus>;
	websocket: ReturnType<typeof createMockWebSocket>;
	logs: string[];
	reset: () => void;
	failNext: (error?: Error) => void;
}

export function bootstrapLanggraphTestHarness(): LanggraphHarness {
	const logs: string[] = [];
	const websocket = createMockWebSocket();
	const a2aBus = createMockA2ABus();
	const thermalHistory: ThermalState[] = ['nominal'];
	const thermal: ThermalMock = {
		state: 'nominal',
		history: thermalHistory,
		setState(state: ThermalState) {
			this.state = state;
			thermalHistory.push(state);
		},
	};
	let pendingFailure: Error | null = null;

	function log(message: string, metadata?: Record<string, unknown>) {
		const suffix =
			metadata && Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
		logs.push(`brAInwav ${message}${suffix}`);
	}

	async function run(
		input: string | RunInput,
		options: HarnessRunOptions = {},
	): Promise<HarnessRunResult> {
		const runInput: RunInput = typeof input === 'string' ? { input } : input;
		const thermalState = options.thermalState ?? thermal.state;
		if (pendingFailure) {
			const error = pendingFailure;
			pendingFailure = null;
			log('executor failure injected', { error: error.message });
			throw error;
		}

		let capturedSummary: ExecutionSummary | undefined;
		const result = await runOnce(runInput, {
			streaming: options.streaming ?? false,
			thermalState,
			logger: { info: (msg, meta) => log(msg, meta) },
			onSummary: (summary) => {
				capturedSummary = summary;
				options.onSummary?.(summary);
			},
		});

		const summary: ExecutionSummary = result.summary ??
			capturedSummary ?? {
				input: runInput.input,
				output: result.output,
				selectedModel: undefined,
				streaming: options.streaming ?? false,
				thermalState,
			};

		if (summary.streaming) {
			websocket.broadcast('brAInwav.streaming.update', {
				output: summary.output,
				task: runInput.task ?? 'unspecified',
			});
		}

		a2aBus.emit('brAInwav.workflow.completed', {
			task: runInput.task ?? 'unspecified',
			thermalState: summary.thermalState,
		});

		return {
			output: result.output,
			summary,
			logs: [...logs],
			events: [...a2aBus.events],
			websocket: [...websocket.messages],
		};
	}

	async function spool<T>(
		tasks: SpoolTask<T>[],
		options: SpoolRunOptions = {},
	): Promise<SpoolResult<T>[]> {
		const integrationMetrics = options.integrationMetrics ?? {};
		return runSpool(tasks, {
			...options,
			integrationMetrics: {
				enabled: integrationMetrics.enabled ?? true,
				attributes: {
					channel: 'langgraph-harness',
					...(integrationMetrics.attributes ?? {}),
				},
				onRecord: integrationMetrics.onRecord,
			},
		});
	}

	function reset(): void {
		logs.length = 0;
		websocket.reset();
		a2aBus.reset();
		thermalHistory.length = 0;
		thermalHistory.push(thermal.state);
	}

	function failNext(error: Error = new Error('brAInwav simulated executor failure')): void {
		pendingFailure = error;
	}

	return {
		run,
		spool,
		thermal,
		a2aBus,
		websocket,
		logs,
		reset,
		failNext,
	};
}
