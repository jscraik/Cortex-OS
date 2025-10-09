import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export type AttentionBridgeEngine = 'retroinfer' | 'retrievalattention' | 'none';

export interface AttentionBridgeBudgets {
	maxSegmentBytes?: number;
	maxOverheadMs?: number;
}

export interface AttentionBridgeConfig {
	enabled?: boolean;
	engine?: AttentionBridgeEngine;
	outputDir?: string;
	budgets?: AttentionBridgeBudgets;
}

export interface AttentionCapturePayload {
	tokensCaptured?: number;
	bytesCaptured?: number;
	source?: string;
	metadata?: Record<string, unknown>;
	captureDurationMs?: number;
}

export interface AttentionCaptureStep {
	step: string;
	role?: string;
}

export interface AttentionBridgeSegment {
	step: string;
	role?: string;
	tokensCaptured: number;
	bytesCaptured: number;
	source?: string;
	metadata?: Record<string, unknown>;
}

export interface AttentionBridgeReceipt {
	runId: string;
	engine: AttentionBridgeEngine;
	createdAt: string;
	totalTokens: number;
	tapSizeBytes: number;
	segments: AttentionBridgeSegment[];
	warnings?: string[];
}

interface AttentionBridgeHandle {
	readonly runId: string;
	readonly engine: AttentionBridgeEngine;
	readonly enabled: boolean;
	readonly startTime: number;
	readonly segments: AttentionBridgeSegment[];
	readonly warnings: string[];
	readonly budgets: Required<AttentionBridgeBudgets>;
	totalTokens: number;
	totalBytes: number;
	metadata?: Record<string, unknown>;
}

export interface AttentionBridgeRun {
	readonly handle: AttentionBridgeHandle;
}

export interface AttentionBridge {
	prepareRun(runId: string, metadata?: Record<string, unknown>): Promise<AttentionBridgeRun>;
	captureKV(
		step: AttentionCaptureStep,
		run: AttentionBridgeRun,
		payload: AttentionCapturePayload,
	): Promise<void>;
	emitReceipt(run: AttentionBridgeRun): Promise<AttentionBridgeReceipt | null>;
	close(): Promise<void>;
}

const DEFAULT_SEGMENT_BYTES = 512 * 1024;
/**
 * Default maximum allowed overhead in milliseconds for attention bridge operations.
 * This value sets a soft upper bound on the time (in ms) that auxiliary processing
 * (such as logging or capturing attention data) is permitted to take per segment.
 * The value 10 was chosen as a conservative default to minimize impact on overall latency.
 */
const DEFAULT_OVERHEAD_MS = 10;

const readEnvBoolean = (value: string | undefined): boolean => value === '1' || value === 'true';

const resolveEngine = (engine?: string): AttentionBridgeEngine => {
	switch ((engine ?? '').toLowerCase()) {
		case 'retroinfer':
			return 'retroinfer';
		case 'retrievalattention':
			return 'retrievalattention';
		default:
			return 'none';
	}
};

const ensureBudgets = (budgets?: AttentionBridgeBudgets): Required<AttentionBridgeBudgets> => ({
	maxSegmentBytes: budgets?.maxSegmentBytes ?? DEFAULT_SEGMENT_BYTES,
	maxOverheadMs: budgets?.maxOverheadMs ?? DEFAULT_OVERHEAD_MS,
});

const buildReceiptPath = (outputDir: string, runId: string): string =>
	join(outputDir, `${runId}-attention_taps.json`);

const writeReceiptIfNeeded = async (
	receipt: AttentionBridgeReceipt,
	config: AttentionBridgeConfig,
): Promise<void> => {
	if (!config.outputDir) return;
	try {
		await fs.mkdir(config.outputDir, { recursive: true });
		await fs.writeFile(
			buildReceiptPath(config.outputDir, receipt.runId),
			JSON.stringify(receipt, null, 2),
			'utf8',
		);
	} catch (error) {
		console.warn('brAInwav AttentionBridge: failed to write receipt', error);
	}
};

const createHandle = (
	config: Required<AttentionBridgeConfig>,
	runId: string,
	metadata?: Record<string, unknown>,
): AttentionBridgeHandle => ({
	runId,
	engine: config.engine,
	enabled: config.enabled && config.engine !== 'none',
	startTime: Date.now(),
	segments: [],
	warnings: [],
	budgets: config.budgets,
	totalTokens: 0,
	totalBytes: 0,
	metadata,
});

const captureSegment = (
	step: AttentionCaptureStep,
	payload: AttentionCapturePayload,
	handle: AttentionBridgeHandle,
) => {
	const tokens = Math.max(0, Math.floor(payload.tokensCaptured ?? 0));
	const bytes = Math.max(0, Math.floor(payload.bytesCaptured ?? 0));
	const duration = Math.max(0, Math.floor(payload.captureDurationMs ?? 0));

	if (bytes > handle.budgets.maxSegmentBytes) {
		handle.warnings.push(
			`Segment ${step.step} skipped: ${bytes} bytes exceeds budget ${handle.budgets.maxSegmentBytes}`,
		);
		return;
	}

	if (duration > handle.budgets.maxOverheadMs) {
		handle.warnings.push(
			`Segment ${step.step} captured in ${duration}ms exceeding budget ${handle.budgets.maxOverheadMs}ms`,
		);
	}

	handle.segments.push({
		step: step.step,
		role: step.role,
		tokensCaptured: tokens,
		bytesCaptured: bytes,
		source: payload.source,
		metadata: payload.metadata,
	});
	handle.totalTokens += tokens;
	handle.totalBytes += bytes;
};

const finalizeReceipt = (handle: AttentionBridgeHandle): AttentionBridgeReceipt => ({
	runId: handle.runId,
	engine: handle.engine,
	createdAt: new Date().toISOString(),
	totalTokens: handle.totalTokens,
	tapSizeBytes: handle.totalBytes,
	segments: handle.segments,
	warnings: handle.warnings.length ? handle.warnings : undefined,
});

const createDisabledBridge = (): AttentionBridge => ({
	async prepareRun(runId: string) {
		return {
			handle: {
				runId,
				engine: 'none',
				enabled: false,
				startTime: Date.now(),
				segments: [],
				warnings: [],
				budgets: ensureBudgets(),
				totalTokens: 0,
				totalBytes: 0,
			},
		};
	},
	async captureKV() {
		return;
	},
	async emitReceipt() {
		return null;
	},
	async close() {
		return;
	},
});

export const createAttentionBridge = (config?: AttentionBridgeConfig): AttentionBridge => {
	const resolved: Required<AttentionBridgeConfig> = {
		enabled: config?.enabled ?? readEnvBoolean(process.env.ATTENTION_KV_TAP),
		engine: resolveEngine(config?.engine ?? process.env.ATTENTION_KV_ENGINE),
		outputDir: config?.outputDir ?? process.env.ATTENTION_KV_OUTPUT_DIR,
		budgets: ensureBudgets(config?.budgets),
	};

	if (!resolved.enabled || resolved.engine === 'none') {
		return createDisabledBridge();
	}

	const prepareRun = async (runId: string, metadata?: Record<string, unknown>) => ({
		handle: createHandle(resolved, runId, metadata),
	});

	const captureKV = async (
		step: AttentionCaptureStep,
		run: AttentionBridgeRun,
		payload: AttentionCapturePayload,
	) => {
		if (!run.handle.enabled) return;
		captureSegment(step, payload, run.handle);
	};

	const emitReceipt = async (run: AttentionBridgeRun): Promise<AttentionBridgeReceipt | null> => {
		if (!run.handle.enabled) return null;
		const receipt = finalizeReceipt(run.handle);
		await writeReceiptIfNeeded(receipt, resolved);
		console.log(
			'brAInwav AttentionBridge:',
			JSON.stringify({
				runId: receipt.runId,
				engine: receipt.engine,
				totalSegments: receipt.segments.length,
				tapSizeBytes: receipt.tapSizeBytes,
				totalTokens: receipt.totalTokens,
			}),
		);
		return receipt;
	};

	const close = async () => {
		return;
	};

	return {
		prepareRun,
		captureKV,
		emitReceipt,
		close,
	};
};

export const createAttentionBridgeFromEnv = (): AttentionBridge => createAttentionBridge({});
