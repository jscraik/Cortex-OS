import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Envelope } from '@cortex-os/a2a-contracts/envelope.js';
import type { Router } from '@cortex-os/a2a-core/router.js';
import type { Context, Span } from '@opentelemetry/api';
import { trace } from '@opentelemetry/api';
import type { ReadableSpan, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { CbomRedactor, hashContent } from './redactor.js';
import type {
	CbomArtifact,
	CbomDecision,
	CbomDocument,
	CbomEnvironment,
	CbomEvidenceEnvelope,
	CbomModelDescriptor,
	CbomToolCall,
} from './types.js';

export interface CbomEmitterOptions {
	redactor?: CbomRedactor;
}

const reportsDirectory = path.resolve('reports/cbom');

export class CbomEmitter {
	private readonly document: CbomDocument;
	private readonly evidence = new Map<string, CbomEvidenceEnvelope>();
	private readonly redactor: CbomRedactor;

	constructor(document: CbomDocument, options: CbomEmitterOptions = {}) {
		this.document = document;
		this.redactor = options.redactor ?? new CbomRedactor();
		this.registerSpanProcessor();
	}

	instrumentRouter(router: Router): Router {
		const original = router.dispatch.bind(router);
		router.dispatch = async (envelope: Envelope) => {
			this.recordToolCall(envelope);
			return original(envelope);
		};
		return router;
	}

	recordToolCall(envelope: Envelope): void {
		const serialized = JSON.stringify(envelope);
		const redacted = this.redactor.redactText('tool-call', serialized);
		const evidenceId = this.registerEvidence('tool-call', serialized);
		const tool: CbomToolCall = {
			id: `tool:${envelope.id ?? hashContent(serialized).slice(-12)}`,
			name: envelope.type ?? 'unknown',
			inputHash: redacted.hash,
			outputPointer: redacted.pointer,
			evidenceIds: [evidenceId],
		};
		this.document.context.tools.push(tool);
	}

	recordArtifact(artifact: CbomArtifact): void {
		this.document.artifacts.push(artifact);
	}

	addPolicyResult(policy: CbomDocument['policies'][number]): void {
		this.document.policies.push(policy);
	}

	snapshot(): CbomDocument {
		return JSON.parse(JSON.stringify(this.document));
	}

	listEvidence(): CbomEvidenceEnvelope[] {
		return Array.from(this.evidence.values());
	}

	async flushToFile(targetPath: string): Promise<void> {
		await fs.mkdir(path.dirname(targetPath), { recursive: true });
		this.document.run.completedAt = new Date().toISOString();
		await fs.writeFile(targetPath, JSON.stringify(this.document, null, 2), 'utf8');
	}

	private registerSpanProcessor(): void {
		const provider = trace.getTracerProvider();
		if (!isSpanProcessorHost(provider)) {
			return;
		}
		const processor: SpanProcessor = {
			onStart: (_span: Span, _context: Context) => {
				// noop
			},
			onEnd: (span) => {
				this.recordSpan(span);
			},
			shutdown: async () => {},
			forceFlush: async () => {},
		};
		provider.addSpanProcessor(processor);
	}

	captureSpan(span: ReadableSpan): void {
		this.recordSpan(span);
	}

	private recordSpan(span: ReadableSpan): void {
		const decision = this.createDecisionFromSpan(span);
		if (!decision) {
			return;
		}
		const serialized = JSON.stringify({
			name: span.name,
			attributes: span.attributes,
			events: span.events,
			status: span.status,
		});
		const evidenceId = this.registerEvidence('otel-span', serialized, {
			spanId: decision.spanId,
			traceId: decision.traceId,
		});
		decision.outputs = [{ evidenceId }];
		this.upsertDecision(decision);
	}

	private createDecisionFromSpan(span: ReadableSpan): CbomDecision | null {
		const provider = span.attributes['gen_ai.system'];
		if (typeof provider !== 'string') {
			return null;
		}
		const spanContext = span.spanContext();
		const decisionId = `dec:${spanContext.spanId}`;
		const timestamp = hrTimeToIso(span.endTime ?? span.startTime);
		const model = this.extractModel(span, provider);
		return {
			id: decisionId,
			name: span.name,
			timestamp,
			spanId: spanContext.spanId,
			traceId: spanContext.traceId,
			model,
		};
	}

	private extractModel(span: ReadableSpan, provider: string): CbomModelDescriptor {
		const name =
			(span.attributes['gen_ai.request.model'] as string | undefined) ??
			(span.attributes['gen_ai.model_id'] as string | undefined) ??
			'unknown-model';
		const temperature = span.attributes['gen_ai.request.temperature'] as number | undefined;
		const topP = span.attributes['gen_ai.request.top_p'] as number | undefined;
		const digestAttr = span.attributes['gen_ai.model.digest'];
		const digest =
			typeof digestAttr === 'string' && digestAttr.startsWith('sha256:') ? digestAttr : null;
		const digestUnavailabilityReason = digest ? null : 'provider-did-not-supply-digest';
		const version = span.attributes['gen_ai.model_version'] as string | undefined;
		return {
			provider,
			name,
			version,
			temperature,
			topP,
			digest,
			digestUnavailabilityReason,
		};
	}

	private upsertDecision(decision: CbomDecision): void {
		const index = this.document.decisions.findIndex((entry) => entry.id === decision.id);
		if (index >= 0) {
			this.document.decisions[index] = {
				...this.document.decisions[index],
				...decision,
			};
		} else {
			this.document.decisions.push(decision);
		}
	}

	private registerEvidence(
		type: CbomEvidenceEnvelope['type'],
		content: string,
		metadata?: Record<string, unknown>,
	): string {
		const hash = hashContent(content);
		const evidenceId = `evid:${hash.slice(-12)}`;
		const envelope: CbomEvidenceEnvelope = {
			evidenceId,
			type,
			hash,
			metadata,
			redacted: true,
		};
		this.evidence.set(evidenceId, envelope);
		return evidenceId;
	}
}

export interface CreateCbomEmitterOptions {
	runId?: string;
	redactor?: CbomRedactor;
}

export function createCbomEmitter(options: CreateCbomEmitterOptions = {}): CbomEmitter {
	const startedAt = new Date();
	const runDigest = hashContent(`${startedAt.toISOString()}-${process.pid}`);
	const runId = options.runId ?? `run:${runDigest.slice(-12)}`;
	const document: CbomDocument = {
		version: '1.0.0',
		run: {
			id: runId,
			startedAt: startedAt.toISOString(),
			completedAt: startedAt.toISOString(),
			digest: hashContent(`${runId}:${os.hostname()}`),
			environment: {
				platform: os.platform(),
				nodeVersion: process.version,
				git: detectGitContext(),
			},
		},
		context: {
			tools: [],
			rag: [],
			files: [],
		},
		decisions: [
			{
				id: `dec:${hashContent(runId).slice(-12)}`,
				name: 'cbom.record',
				timestamp: startedAt.toISOString(),
				determinism: { mode: 'deterministic', seed: null, explanation: 'bootstrap-capture' },
			},
		],
		artifacts: [],
		policies: [],
		retention: {
			duration: 'P6M',
			policy: 'default-eu-ai-act',
		},
	};
	return new CbomEmitter(document, { redactor: options.redactor });
}

export async function writeDefaultCbom(emitter: CbomEmitter): Promise<string> {
	await fs.mkdir(reportsDirectory, { recursive: true });
	const outputPath = path.join(reportsDirectory, 'latest.cbom.json');
	await emitter.flushToFile(outputPath);
	return outputPath;
}

function detectGitContext(): CbomEnvironment['git'] {
	try {
		const commit = runGitCommand(['rev-parse', 'HEAD']);
		const branch = runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']);
		if (commit && branch) {
			return { commit: commit.trim(), branch: branch.trim() };
		}
	} catch (_error) {
		// intentionally ignored
	}
	return undefined;
}

function runGitCommand(args: string[]): string | undefined {
	const result = spawnSync('git', args, { encoding: 'utf8', cwd: process.cwd() });
	if (result.status === 0 && result.stdout) {
		return result.stdout;
	}
	return undefined;
}

function hrTimeToIso(time: ReadableSpan['startTime']): string {
	const millis = time[0] * 1_000 + time[1] / 1_000_000;
	return new Date(millis).toISOString();
}

function isSpanProcessorHost(
	provider: unknown,
): provider is { addSpanProcessor(processor: SpanProcessor): void } {
	if (typeof provider !== 'object' || provider === null) {
		return false;
	}
	if (!('addSpanProcessor' in provider)) {
		return false;
	}
	const candidate = provider as { addSpanProcessor?: unknown };
	return typeof candidate.addSpanProcessor === 'function';
}
