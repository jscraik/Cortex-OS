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

export interface ProofArtifact<T = unknown> {
    id: string;
    seed: string;
    executionHash: string;
    claims: Record<string, string>;
    digest: string; // hash over canonical records + claims
    timestamp: number;
    records: ProofSessionInit<T>['records'];
    signature?: string; // optional detached signature over digest
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

export const createProofSession = <T>(init: ProofSessionInit<T>): ProofSession<T> => {
    const claims: Record<string, string> = {};
    return {
        seed: init.seed,
        executionHash: init.executionHash,
        records: init.records,
        claims,
        addClaim: (k: string, v: string) => { claims[k] = v; }
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

const REQUIRED_CLAIMS = ['totalTasks'];

const computeDigest = <T>(records: ProofSessionInit<T>['records'], claims: Record<string, string>): string => {
    const canonical = records
        .map(r => `${r.id}|${r.success ? '1' : '0'}|${r.success ? JSON.stringify(r.value) : r.error || ''}`)
        .join('\n');
    return fnv1a(canonical + JSON.stringify(claims));
};

export const finalizeProof = async <T>(session: ProofSession<T>, options: FinalizeOptions = {}): Promise<ProofArtifact<T>> => {
    const missing = REQUIRED_CLAIMS.filter(c => session.claims[c] === undefined);
    // compute digest even if missing so artifact is still generated but verification will flag issues
    const digest = computeDigest(session.records, session.claims);
    const artifact: ProofArtifact<T> = {
        id: `proof_${Date.now().toString(36)}`,
        seed: session.seed,
        executionHash: session.executionHash,
        claims: { ...session.claims },
        digest,
        timestamp: Date.now(),
        records: session.records
    };
    if (options.signer) {
        const signature = await options.signer.sign(digest);
        artifact.signature = signature;
        artifact.signerId = options.signer.id;
    }
    // embed a soft marker claim for missing required claims (optional) - not altering test expectations yet
    if (missing.length > 0) {
        // no mutation of claims post-digest (immutability) – rely on verify step to surface issues
    }
    return artifact;
};

export const verifyProof = <T>(artifact: ProofArtifact<T>, signer?: ProofSigner): ProofVerification => {
    const issues: string[] = [];
    const recomputed = computeDigest(artifact.records, artifact.claims);
    if (recomputed !== artifact.digest) issues.push('digest-mismatch');
    for (const c of REQUIRED_CLAIMS) {
        if (artifact.claims[c] === undefined) issues.push(`missing-claim:${c}`);
    }
    if (artifact.signature && signer?.verify) {
        const ok = signer.verify(artifact.digest, artifact.signature);
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
        save: (a) => { artifacts.push(a); },
        get: (id) => artifacts.find(a => a.id === id),
        list: () => [...artifacts],
        clear: () => { artifacts.length = 0; }
    };
};

// Adapter: produce proof from scheduler schedule() output
export interface ScheduleLikeRecord { id: string; success: boolean; value?: unknown; error?: string }
export interface ScheduleLikeResult { seed: string; executionHash: string; records: ScheduleLikeRecord[] }

export const produceProofFromScheduleResult = async (
    result: ScheduleLikeResult,
    options: { signer?: ProofSigner; store?: ProofStore } = {}
) => {
    const session = createProofSession({ seed: result.seed, executionHash: result.executionHash, records: result.records });
    session.addClaim('totalTasks', String(result.records.length));
    const allSucceeded = result.records.every(r => r.success);
    session.addClaim('allSucceeded', allSucceeded ? 'true' : 'false');
    const artifact = await finalizeProof(session, { signer: options.signer });
    if (options.store) options.store.save(artifact);
    return artifact;
};
