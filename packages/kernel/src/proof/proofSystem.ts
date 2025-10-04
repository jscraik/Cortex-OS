import { createProofEnvelope } from '@cortex-os/proof-artifacts';
import type { ProofEnvelope as ExecutionProofEnvelope, ProofEvidence, ProofPolicyReceipt, ProofRuntime, ProofTrace } from '@cortex-os/proof-artifacts';

/**
 * Proof System (Module B)
 * Provides creation, finalization, verification, and persistence of execution proofs.
 * Design goals: deterministic hashing, minimal surface, pluggable signing.
 */

export interface ProofSessionInit<T = unknown> {
	seed: string;
	executionHash: string;
	records: Array<{ id: string; success: boolean; value?: T; error?: string }>;
}

export interface ProofSession<T = unknown> {
	seed: string;
	executionHash: string;
	records: ProofSessionInit<T>['records'];
	claims: Record<string, string>;
	addClaim: (key: string, value: string) => void;
}

export interface ProofDigestMeta {
	algo: 'fnv1a32' | 'sha256';
	value: string;
	length: number; // hex length of value
}

export interface ProofArtifact<T = unknown> {
	id: string;
	version: '1.0.0';
	seed: string;
	executionHash: string;
	claims: Record<string, string>; // namespaced keys e.g. core.totalTasks
	digest: ProofDigestMeta; // canonical digest metadata
	timestamp: number;
	records: ProofSessionInit<T>['records'];
	signature?: string; // optional detached signature over digest.value
	signerId?: string; // identifies signer implementation
}

export interface ProofVerification {
	valid: boolean;
	issues: string[];
}

// Pluggable signer interface (placeholder for cryptographic implementation)
export interface ProofSigner {
	id: string; // stable identifier (e.g., key fingerprint)
	sign: (digest: string) => Promise<string> | string;
	verify?: (digest: string, signature: string) => Promise<boolean> | boolean;
}

export interface FinalizeOptions {
	signer?: ProofSigner;
}

// ---- Key Registry (Ed25519) ----
export interface RotatingKey {
	keyId: string; // e.g. hmac256:20250924:001
	createdAt: number;
	secretKey: string; // base64
	algorithm: 'hmac-sha256';
	active: boolean;
}

export interface KeyRegistry {
	list: () => RotatingKey[];
	getActive: () => RotatingKey | undefined;
	rotate: () => Promise<RotatingKey>;
	find: (keyId: string) => RotatingKey | undefined;
}

const toBase64 = (buf: ArrayBuffer | Uint8Array) => {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return typeof btoa !== 'undefined' ? btoa(binary) : binary;
};

const randomBytes = (len: number): Uint8Array => {
	if (!globalThis.crypto?.getRandomValues) throw new Error('secure random unavailable');
	const arr = new Uint8Array(len);
	globalThis.crypto.getRandomValues(arr);
	return arr;
};

export const createInMemoryKeyRegistry = (): KeyRegistry => {
	const keys: RotatingKey[] = [];
	const generate = async (): Promise<RotatingKey> => {
		const keyMaterial = randomBytes(32);
		const keyId = `hmac256:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}:${(keys.length + 1).toString().padStart(3, '0')}`;
		return {
			keyId,
			createdAt: Date.now(),
			secretKey: toBase64(keyMaterial),
			algorithm: 'hmac-sha256',
			active: true,
		};
	};
	return {
		list: () => [...keys],
		getActive: () => keys.find((k) => k.active),
		rotate: async () => {
			for (const k of keys) k.active = false;
			const next = await generate();
			keys.push(next);
			return next;
		},
		find: (id: string) => keys.find((k) => k.keyId === id),
	};
};

const hmacSha256 = async (keyB64: string, data: string): Promise<string> => {
	if (globalThis.crypto?.subtle) {
		const keyBytes =
			typeof Buffer !== 'undefined'
				? Buffer.from(keyB64, 'base64')
				: Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
		const key = await globalThis.crypto.subtle.importKey(
			'raw',
			keyBytes,
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign'],
		);
		const sig = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
		return toBase64(sig);
	}
	// Fallback: insecure XOR-based digest (clearly marked) – not for production but avoids runtime crash
	const raw = typeof Buffer !== 'undefined' ? Buffer.from(keyB64, 'base64') : new Uint8Array();
	let acc = 0;
	for (const b of raw) acc ^= b;
	for (const ch of data) acc ^= ch.charCodeAt(0);
	return `insecure-${acc.toString(16)}`;
};

export const createRegistrySigner = (registry: KeyRegistry): ProofSigner => ({
	id: 'key-registry',
	sign: async (digest: string) => {
		const active = registry.getActive() || (await registry.rotate());
		const mac = await hmacSha256(active.secretKey, digest);
		return `${active.keyId}:${mac}`;
	},
	verify: async (digest: string, signature: string) => {
		const parts = signature.split(':');
		if (parts.length !== 2) return false;
		const key = registry.find(parts[0]);
		if (!key) return false;
		const expected = await hmacSha256(key.secretKey, digest);
		return expected === parts[1];
	},
});

// ---- Claim Registry ----
import type { ZodTypeAny } from 'zod';

type ClaimSchema = ZodTypeAny;
const claimSchemas = new Map<string, ClaimSchema>();
export const registerClaimSchema = (key: string, schema: ClaimSchema) => {
	claimSchemas.set(key, schema);
};
const validateClaimValues = (claims: Record<string, string>): string[] => {
	const issues: string[] = [];
	for (const [k, v] of Object.entries(claims)) {
		const schema = claimSchemas.get(k);
		if (schema) {
			const res = schema.safeParse(v);
			if (!res.success) issues.push(`claim-invalid:${k}`);
		}
	}
	return issues;
};

export const createProofSession = <T>(init: ProofSessionInit<T>): ProofSession<T> => {
	const claims: Record<string, string> = {};
	return {
		seed: init.seed,
		executionHash: init.executionHash,
		records: init.records,
		claims,
		addClaim: (k: string, v: string) => {
			claims[k] = v;
		},
	};
};

// Simple FNV-1a (duplicate minimal inline to avoid cross-file dependency at stub stage)
const fnv1a = (input: string): string => {
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = (hash * 0x01000193) >>> 0;
	}
	return (hash >>> 0).toString(16).padStart(8, '0');
};

const REQUIRED_CLAIMS = ['core.totalTasks'];
const CORE_NAMESPACE = 'core';

const namespaceClaimKey = (key: string): string =>
	key.includes('.') ? key : `${CORE_NAMESPACE}.${key}`;

const computeFNV = (input: string): string => fnv1a(input);

// sha256 lazy loaded via global crypto (Node 19+ or Web Crypto); fallback to FNV if unavailable
const computeSHA256 = async (input: string): Promise<string> => {
	if (typeof globalThis.crypto?.subtle === 'undefined') return computeFNV(input);
	const data = new TextEncoder().encode(input);
	const hash = await globalThis.crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
};

const canonicalize = <T>(
	records: ProofSessionInit<T>['records'],
	claims: Record<string, string>,
): string => {
	const canonical = records
		.map(
			(r) =>
				`${r.id}|${r.success ? '1' : '0'}|${r.success ? JSON.stringify(r.value) : r.error || ''}`,
		)
		.join('\n');
	return `${canonical}\n--claims--\n${JSON.stringify(claims)}`;
};

const computeDigest = async <T>(
	records: ProofSessionInit<T>['records'],
	claims: Record<string, string>,
	algo: 'fnv1a32' | 'sha256',
): Promise<ProofDigestMeta> => {
	const input = canonicalize(records, claims);
	if (algo === 'sha256') {
		const value = await computeSHA256(input);
		return { algo, value, length: value.length };
	}
	const value = computeFNV(input);
	return { algo: 'fnv1a32', value, length: value.length };
};

export interface FinalizeExtendedOptions extends FinalizeOptions {
	digestAlgo?: 'fnv1a32' | 'sha256';
}

export const finalizeProof = async <T>(
	session: ProofSession<T>,
	options: FinalizeExtendedOptions = {},
): Promise<ProofArtifact<T>> => {
	// normalize claim namespaces
	const normalizedClaims: Record<string, string> = {};
	for (const [k, v] of Object.entries(session.claims)) {
		normalizedClaims[namespaceClaimKey(k)] = v;
	}
	const algo =
		options.digestAlgo ||
		(process.env.CORTEX_PROOF_DIGEST_ALGO === 'sha256' ? 'sha256' : 'fnv1a32');
	const digest = await computeDigest(session.records, normalizedClaims, algo);
	const artifact: ProofArtifact<T> = {
		id: `proof_${Date.now().toString(36)}`,
		version: '1.0.0',
		seed: session.seed,
		executionHash: session.executionHash,
		claims: Object.freeze({ ...normalizedClaims }),
		digest,
		timestamp: Date.now(),
		records: session.records,
	};
	if (options.signer) {
		const signature = await options.signer.sign(digest.value);
		artifact.signature = signature;
		artifact.signerId = options.signer.id;
	}
	return artifact;
};

export const verifyProof = <T>(
	artifact: ProofArtifact<T>,
	signer?: ProofSigner,
): ProofVerification => {
	const issues: string[] = [];
	// recompute using recorded algo (sync wrapper for fnv; async for sha256 handled via promise hazard - simplified: skip async sha256 re-hash if not available)
	const syncRecompute = (): string => {
		if (artifact.digest.algo === 'fnv1a32') {
			const input = canonicalize(artifact.records, artifact.claims);
			return computeFNV(input);
		}
		// best-effort: if crypto.subtle not present, mark unverifiable
		if (typeof globalThis.crypto?.subtle === 'undefined') return 'UNAVAILABLE';
		// NOTE: For simplicity in current sync interface we cannot await; flag for future async verify
		return 'ASYNC_SHA256_UNVERIFIED';
	};
	const recomputed = syncRecompute();
	if (recomputed !== artifact.digest.value) {
		if (recomputed === 'ASYNC_SHA256_UNVERIFIED') issues.push('sha256-unverified');
		else issues.push('digest-mismatch');
	}
	for (const c of REQUIRED_CLAIMS) {
		if (artifact.claims[c] === undefined) issues.push(`missing-claim:${c}`);
	}
	const claimIssues = validateClaimValues(artifact.claims);
	issues.push(...claimIssues);
	if (artifact.signature && signer?.verify) {
		const ok = signer.verify(artifact.digest.value, artifact.signature);
		if (!ok) issues.push('signature-invalid');
	}
	return { valid: issues.length === 0, issues };
};

// In-memory persistence (simple array store)
export interface ProofStore {
	save: (artifact: ProofArtifact) => void;
	get: (id: string) => ProofArtifact | undefined;
	list: () => ProofArtifact[];
	clear: () => void;
}

export const createInMemoryProofStore = (): ProofStore => {
	const artifacts: ProofArtifact[] = [];
	return {
		save: (a) => {
			artifacts.push(a);
		},
		get: (id) => artifacts.find((a) => a.id === id),
		list: () => [...artifacts],
		clear: () => {
			artifacts.length = 0;
		},
	};
};

// Adapter: produce proof from scheduler schedule() output
export interface ScheduleLikeRecord {
	id: string;
	success: boolean;
	value?: unknown;
	error?: string;
}
export interface ScheduleLikeResult {
	seed: string;
	executionHash: string;
	records: ScheduleLikeRecord[];
}

export const produceProofFromScheduleResult = async (
	result: ScheduleLikeResult,
	options: {
		signer?: ProofSigner;
		store?: ProofStore;
		emit?: (event: ProofGeneratedEvent | ProofIndexedEvent) => Promise<void> | void;
	} = {},
) => {
	const session = createProofSession({
		seed: result.seed,
		executionHash: result.executionHash,
		records: result.records,
	});
	session.addClaim('core.totalTasks', String(result.records.length));
	const allSucceeded = result.records.every((r) => r.success);
	session.addClaim('core.allSucceeded', allSucceeded ? 'true' : 'false');
	const artifact = await finalizeProof(session, {
		signer: options.signer,
		digestAlgo: process.env.CORTEX_PROOF_DIGEST_ALGO === 'sha256' ? 'sha256' : 'fnv1a32',
	});
	if (options.store) options.store.save(artifact);
	if (options.emit) {
		const generated = createProofGeneratedEvent(artifact);
		await options.emit(generated);
		const indexed = createProofIndexedEvent(artifact, generated.id);
		await options.emit(indexed);
	}
	return artifact;
};

// Audit query API over a provided store
export interface ProofQueryOptions {
	from?: number;
	to?: number;
	claimEquals?: Record<string, string>;
}
export const queryProofs = (store: ProofStore, opts: ProofQueryOptions = {}): ProofArtifact[] => {
	return store.list().filter((a) => {
		if (opts.from && a.timestamp < opts.from) return false;
		if (opts.to && a.timestamp > opts.to) return false;
		if (opts.claimEquals) {
			for (const [k, v] of Object.entries(opts.claimEquals)) {
				if (a.claims[k] !== v) return false;
			}
		}
		return true;
	});
};

// Governance summary helper
export interface ExportExecutionProofEnvelopeOptions {
        artifactPath: string;
        artifactMime?: string;
        publicContext: Record<string, unknown>;
        sealedContextRef?: { uri: string; sha256: string };
        evidence?: ProofEvidence[];
        runtime: ProofRuntime;
        trace?: ProofTrace;
        policyReceipts?: ProofPolicyReceipt[];
        bundlePaths?: string[];
}

export const exportExecutionProofEnvelope = (
        artifact: ProofArtifact,
        options: ExportExecutionProofEnvelopeOptions,
): ExecutionProofEnvelope => {
        return createProofEnvelope({
                artifactPath: options.artifactPath,
                artifactMime: options.artifactMime ?? 'application/json',
                publicContext: {
                        ...options.publicContext,
                        kernelProofId: artifact.id,
                        kernelDigest: artifact.digest.value,
                        kernelDigestAlgo: artifact.digest.algo,
                        kernelTimestamp: artifact.timestamp,
                },
                sealedContextRef: options.sealedContextRef,
                evidence: options.evidence ?? [],
                runtime: options.runtime,
                trace: options.trace,
                policyReceipts: options.policyReceipts,
                bundlePaths: options.bundlePaths,
        });
};

export const summarizeProof = (artifact: ProofArtifact) => ({
	id: artifact.id,
	seed: artifact.seed,
	executionHash: artifact.executionHash,
	totalTasks: artifact.claims['core.totalTasks'],
	allSucceeded: artifact.claims['core.allSucceeded'] === 'true',
	signed: Boolean(artifact.signature),
	digestAlgo: artifact.digest.algo,
});

// CloudEvent helper for proof.generated
export interface ProofGeneratedEvent {
	specversion: '1.0';
	type: 'proof.generated';
	source: 'urn:cortex:kernel:proof';
	id: string;
	time: string;
	data: {
		artifact: Omit<ProofArtifact, 'records'> & { recordCount: number };
	};
}

export const createProofGeneratedEvent = (artifact: ProofArtifact): ProofGeneratedEvent => ({
	specversion: '1.0',
	type: 'proof.generated',
	source: 'urn:cortex:kernel:proof',
	id: artifact.id,
	time: new Date(artifact.timestamp).toISOString(),
	data: {
		artifact: {
			id: artifact.id,
			version: artifact.version,
			seed: artifact.seed,
			executionHash: artifact.executionHash,
			claims: artifact.claims,
			digest: artifact.digest,
			timestamp: artifact.timestamp,
			signature: artifact.signature,
			signerId: artifact.signerId,
			recordCount: artifact.records.length,
		},
	},
});

export interface ProofIndexedEvent {
	specversion: '1.0';
	type: 'proof.indexed';
	source: 'urn:cortex:kernel:proof';
	id: string;
	time: string;
	data: { proofId: string; digestAlgo: ProofDigestMeta['algo']; signerId?: string };
	related: { generatedEventId: string };
}

export const createProofIndexedEvent = (
	artifact: ProofArtifact,
	generatedEventId: string,
): ProofIndexedEvent => ({
	specversion: '1.0',
	type: 'proof.indexed',
	source: 'urn:cortex:kernel:proof',
	id: artifact.id,
	time: new Date().toISOString(),
	data: { proofId: artifact.id, digestAlgo: artifact.digest.algo, signerId: artifact.signerId },
	related: { generatedEventId },
});

// Async verification supporting sha256 recomputation
export const verifyProofAsync = async <T>(
	artifact: ProofArtifact<T>,
	signer?: ProofSigner,
): Promise<ProofVerification> => {
	const issues: string[] = [];
	let recomputed: string;
	if (artifact.digest.algo === 'sha256') {
		const input = canonicalize(artifact.records, artifact.claims);
		recomputed = await computeSHA256(input);
	} else {
		const input = canonicalize(artifact.records, artifact.claims);
		recomputed = computeFNV(input);
	}
	if (recomputed !== artifact.digest.value) issues.push('digest-mismatch');
	for (const c of REQUIRED_CLAIMS)
		if (artifact.claims[c] === undefined) issues.push(`missing-claim:${c}`);
	const claimIssues = validateClaimValues(artifact.claims);
	issues.push(...claimIssues);
	if (artifact.signature && signer?.verify) {
		const ok = await signer.verify(artifact.digest.value, artifact.signature);
		if (!ok) issues.push('signature-invalid');
	}
	return { valid: issues.length === 0, issues };
};

// Convenience wrapper selecting sync or async verification based on digest algorithm
export const verifyProofAuto = async <T>(
	artifact: ProofArtifact<T>,
	signer?: ProofSigner,
): Promise<ProofVerification> => {
	if (artifact.digest.algo === 'sha256') return verifyProofAsync(artifact, signer);
	return verifyProof(artifact, signer);
};
