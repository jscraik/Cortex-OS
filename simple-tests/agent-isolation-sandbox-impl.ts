/**
 * Agent Isolation Sandbox (worker-based) – first TDD pass.
 * NOTE: Provides cooperative isolation via a worker thread (not a full OS sandbox).
 */

import { performance } from 'node:perf_hooks';
import { Worker } from 'node:worker_threads';

export interface SandboxOptions {
	allowedReadPaths: string[];
	networkAllowlist: string[];
	maxExecutionMs: number;
	onAuditEvent?: (evt: AuditEvent) => void;
	memorySoftLimitBytes?: number;
	virtualFiles?: Record<string, string>; // provided from test harness
	maxViolations?: number; // abort run after reaching this many violations
}

export interface AuditEvent {
	type: string;
	severity: 'low' | 'medium' | 'high';
	message: string;
	meta?: Record<string, unknown>;
	code?: ViolationCode;
}

export interface SandboxResult {
	success: boolean;
	error?: Error;
	violations: AuditEvent[];
	durationMs: number;
}

export enum ViolationCode {
	DynamicCode = 'DYNAMIC_CODE',
	FsDenied = 'FS_DENIED',
	FsTraversal = 'FS_TRAVERSAL',
	NetDenied = 'NET_DENIED',
	MemorySoftLimit = 'MEMORY_SOFT_LIMIT',
	Timeout = 'TIMEOUT',
	SerializeError = 'SERIALIZE_ERROR',
	ThresholdExceeded = 'VIOLATION_THRESHOLD',
}

export interface SandboxApi {
	readFile(path: string): string;
	listFiles(prefix: string): string[];
	fetch(url: string): Promise<{ status: number }>;
	alloc(bytes: number): void;
}

export interface AgentSandbox {
	run<T = unknown>(
		code: (api: SandboxApi) => T | Promise<T>,
	): Promise<SandboxResult & { returnValue?: T }>;
	dispose(): Promise<void>;
}

interface InternalState {
	options: SandboxOptions;
	violations: AuditEvent[];
	memoryAllocated: number;
	disposed: boolean;
	thresholdEmitted?: boolean;
}

function emit(state: InternalState, evt: AuditEvent) {
	state.violations.push(evt);
	state.options.onAuditEvent?.(evt);
	// Inline threshold check so fast-completing user code still records threshold event synchronously.
	const { maxViolations } = state.options;
	if (
		maxViolations &&
		!state.thresholdEmitted &&
		state.violations.length === maxViolations
	) {
		const already = state.violations.some(
			(v) => v.code === ViolationCode.ThresholdExceeded,
		);
		if (!already) {
			state.thresholdEmitted = true;
			const thresholdEvent = makeAuditEvent({
				type: 'sandbox.violation.threshold',
				severity: 'medium',
				message: `Violation threshold ${maxViolations} reached`,
				code: ViolationCode.ThresholdExceeded,
			});
			state.violations.push(thresholdEvent);
			state.options.onAuditEvent?.(thresholdEvent);
		}
	}
}

// Central helper to ensure consistent prefix + shape for synthetic (main-thread) audit events.
function makeAuditEvent(
	partial: Omit<AuditEvent, 'type'> & { type: string },
): AuditEvent {
	const ensuredType = partial.type.startsWith('sandbox.')
		? partial.type
		: `sandbox.${partial.type}`;
	return { ...partial, type: ensuredType };
}

function emitSynthetic(
	state: InternalState,
	partial: Omit<AuditEvent, 'type'> & { type: string },
) {
	emit(state, makeAuditEvent(partial));
}

// Specialized helpers for common violation patterns
function emitTimeout(state: InternalState, maxMs: number) {
	emitSynthetic(state, {
		type: 'sandbox.timeout',
		severity: 'high',
		message: `Execution exceeded ${maxMs}ms`,
		code: ViolationCode.Timeout,
	});
}

function emitSerializationError(
	state: InternalState,
	context?: { originalFnSource?: string; error?: string },
) {
	emitSynthetic(state, {
		type: 'sandbox.serialize.error',
		severity: 'medium',
		message: context?.error
			? 'Serialization or closure capture error'
			: 'Value not serializable',
		meta: context,
		code: ViolationCode.SerializeError,
	});
}

function emitThresholdExceeded(state: InternalState, maxViolations: number) {
	emitSynthetic(state, {
		type: 'sandbox.violation.threshold',
		severity: 'medium',
		message: `Violation threshold ${maxViolations} reached`,
		code: ViolationCode.ThresholdExceeded,
	});
}

// All policy enforcement occurs inside the worker (fs/network/memory/dynamic code)

function buildWorkerCode(injected: unknown) {
	return `
    const { parentPort } = require('node:worker_threads');
    const path = require('node:path');
    const opts = ${JSON.stringify(injected)};
    const violation = (v) => parentPort.postMessage({ type: 'violation', violation: v });
    const realEval = eval;
    const guard = function(){
      violation({ type: 'sandbox.dynamic-code', severity: 'high', message: 'Dynamic code execution blocked', code: 'DYNAMIC_CODE' });
      throw new Error('dynamic code execution denied');
    };
    global.eval = guard; global.Function = guard;
    let memoryAllocated = 0;
    function readFile(p){
      const original = p;
      const normalized = path.posix.normalize(p);
      const traversalAttempt = original.includes('..');
      const allowed = opts.allowedReadPaths.some(a => normalized === a || normalized.startsWith(a + '/'));
      if(traversalAttempt && !allowed){
        violation({ type: 'sandbox.fs.traversal', severity: 'medium', message: 'Path traversal denied for ' + original, meta: { original, normalized }, code: 'FS_TRAVERSAL' });
        throw new Error('path traversal denied');
      }
      if(!allowed){
        violation({ type: 'sandbox.fs.denied', severity: 'medium', message: 'Access denied for ' + original, meta: { original, normalized }, code: 'FS_DENIED' });
        throw new Error('filesystem access denied');
      }
      if(!Object.prototype.hasOwnProperty.call(opts.virtualFiles, normalized)) throw new Error('ENOENT');
      return opts.virtualFiles[normalized];
    }
    function listFiles(prefix){ return Object.keys(opts.virtualFiles).filter(p => p.startsWith(prefix)); }
    async function fetchUrl(u){
      let host = '';
      try { host = new URL(u).host; } catch {}
      if(!opts.networkAllowlist.includes(host)){
        violation({ type: 'sandbox.net.denied', severity: 'medium', message: 'Network egress denied for host ' + host, code: 'NET_DENIED' });
        throw new Error('network access denied');
      }
      return { status: 200 };
    }
    function alloc(bytes){
      memoryAllocated += bytes;
      if(opts.memorySoftLimitBytes && memoryAllocated > opts.memorySoftLimitBytes){
        violation({ type: 'sandbox.memory.softlimit', severity: 'medium', message: 'Memory soft limit exceeded ('+memoryAllocated+' > '+opts.memorySoftLimitBytes+')', code: 'MEMORY_SOFT_LIMIT' });
        throw new Error('memory limit exceeded');
      }
    }
    parentPort.on('message', async (m) => {
      if(m.type === 'start'){
        try {
          const userFn = realEval('(' + m.fn + ')');
            const api = { readFile, listFiles, fetch: fetchUrl, alloc };
            const val = await Promise.resolve(userFn(api));
            let serializable = true;
            try { structuredClone(val); } catch { serializable = false; }
            if(serializable){
              try { JSON.stringify(val); } catch { serializable = false; }
            }
            if(!serializable){
              violation({ type: 'sandbox.serialize.error', severity: 'medium', message: 'Value not serializable', code: 'SERIALIZE_ERROR' });
              parentPort.postMessage({ type: 'error', error: 'serialization error' });
            } else {
              parentPort.postMessage({ type: 'return', value: val });
            }
        } catch (e){
          parentPort.postMessage({ type: 'error', error: e && e.message ? e.message : String(e) });
        }
      }
    });
  `;
}

type WorkerMessage =
	| { type: 'violation'; violation: AuditEvent }
	| { type: 'return'; value: unknown }
	| { type: 'error'; error: string };

async function executeInWorker<T>(
	code: (api: SandboxApi) => T | Promise<T>,
	injected: unknown,
	deadlineMs: number,
	state: InternalState,
	options: SandboxOptions,
): Promise<{ value?: T; error?: Error; durationMs: number }> {
	const start = performance.now();
	const worker = new Worker(buildWorkerCode(injected), { eval: true });
	let finished = false;
	let returnValue: T | undefined;
	let runError: Error | undefined;
	const originalFnSource = code.toString();
	worker.on('message', (msg: WorkerMessage) => {
		if (msg.type === 'violation') {
			emit(state, msg.violation);
		} else if (msg.type === 'return') {
			finished = true;
			returnValue = msg.value as T;
			void worker.terminate();
		} else if (msg.type === 'error') {
			finished = true;
			runError = new Error(msg.error);
			if (/is not defined/.test(msg.error)) {
				const exists = state.violations.some(
					(v) => v.type === 'sandbox.serialize.error',
				);
				if (!exists) {
					emitSerializationError(state, { originalFnSource, error: msg.error });
				}
			}
			void worker.terminate();
		}
	});
	worker.on('error', (err) => {
		if (!finished) {
			runError = err;
			finished = true;
		}
	});
	worker.on('exit', (code) => {
		if (!finished && code !== 0) {
			runError = new Error('worker exited abnormally');
			finished = true;
		}
	});
	worker.postMessage({ type: 'start', fn: code.toString() });
	while (!finished) {
		const elapsed = performance.now() - start;
		if (elapsed > deadlineMs && !runError) {
			worker.terminate();
			emitTimeout(state, options.maxExecutionMs);
			runError = new Error('timeout exceeded');
			finished = true;
			break;
		}
		// early abort if maxViolations reached
		if (
			options.maxViolations &&
			state.violations.length >= options.maxViolations &&
			!runError
		) {
			worker.terminate();
			// Threshold event may have already been emitted synchronously in emit(); avoid duplication.
			const hasThreshold = state.violations.some(
				(v) => v.code === ViolationCode.ThresholdExceeded,
			);
			if (!hasThreshold) {
				emitThresholdExceeded(state, options.maxViolations);
			}
			runError = new Error('violation threshold reached');
			finished = true;
			break;
		}
		await new Promise((r) => setImmediate(r));
	}
	const durationMs = performance.now() - start;
	if (runError) return { error: runError, durationMs };
	return { value: returnValue as T, durationMs };
}

export function createAgentSandbox(options: SandboxOptions): AgentSandbox {
	const state: InternalState = {
		options,
		violations: [],
		memoryAllocated: 0,
		disposed: false,
	};

	const files = options.virtualFiles || {};

	return {
		async run<T = unknown>(code: (api: SandboxApi) => T | Promise<T>) {
			if (state.disposed) throw new Error('sandbox disposed');
			state.violations.length = 0;
			state.memoryAllocated = 0;
			const injected = {
				allowedReadPaths: options.allowedReadPaths,
				networkAllowlist: options.networkAllowlist,
				virtualFiles: files,
				memorySoftLimitBytes: options.memorySoftLimitBytes ?? null,
			};
			const { value, error, durationMs } = await executeInWorker(
				code,
				injected,
				options.maxExecutionMs,
				state,
				options,
			);
			if (error) {
				return {
					success: false,
					error,
					violations: [...state.violations],
					durationMs,
				} as SandboxResult & { returnValue?: T };
			}
			// escalate high severity violations to failure even if no thrown error (e.g., dynamic code attempt caught by user code)
			const high = state.violations.find((v) => v.severity === 'high');
			if (high) {
				return {
					success: false,
					error: new Error(`policy violation: ${high.type}`),
					violations: [...state.violations],
					durationMs,
				} as SandboxResult & { returnValue?: T };
			}
			return {
				success: true,
				returnValue: value as T,
				violations: [...state.violations],
				durationMs,
			} as SandboxResult & { returnValue?: T };
		},
		async dispose() {
			state.disposed = true;
		},
	};
}
