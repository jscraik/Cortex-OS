export interface CbomDocument {
	version: string;
	run: CbomRun;
	context: CbomContext;
	decisions: CbomDecision[];
	artifacts: CbomArtifact[];
	policies: CbomPolicyResult[];
	retention?: CbomRetention;
}

export interface CbomRun {
	id: string;
	startedAt: string;
	completedAt: string;
	digest: string;
	environment?: CbomEnvironment;
}

export interface CbomEnvironment {
	platform: string;
	nodeVersion: string;
	git?: {
		commit: string;
		branch: string;
	};
}

export interface CbomContext {
	tools: CbomToolCall[];
	rag: CbomRagRetrieval[];
	files: CbomFilePointer[];
}

export interface CbomToolCall {
	id: string;
	name: string;
	inputHash: string;
	outputPointer: string;
	evidenceIds?: string[];
}

export interface CbomRagRetrieval {
	id: string;
	index: string;
	queryHash: string;
	results: CbomRagResult[];
}

export interface CbomRagResult {
	pointer: string;
	score: number;
	chunkHash: string;
}

export interface CbomFilePointer {
	path: string;
	hash: string;
	redacted: boolean;
}

export interface CbomDecision {
	id: string;
	name: string;
	timestamp: string;
	spanId?: string;
	traceId?: string;
	model?: CbomModelDescriptor;
	inputs?: CbomEvidenceReference[];
	outputs?: CbomEvidenceReference[];
	determinism?: CbomDeterminism;
}

export interface CbomModelDescriptor {
	provider: string;
	name: string;
	version?: string;
	temperature?: number;
	topP?: number;
	digest: string | null;
	digestUnavailabilityReason?: string | null;
}

export interface CbomEvidenceReference {
	evidenceId: string;
}

export interface CbomArtifact {
	id: string;
	type: string;
	hash: string;
	pointer: string;
	redacted: boolean;
}

export interface CbomPolicyResult {
	id: string;
	name: string;
	status: 'pass' | 'fail' | 'waived';
	evidenceIds?: string[];
	notes?: string;
}

export interface CbomDeterminism {
	mode: 'deterministic' | 'best-effort' | 'non-deterministic';
	seed?: string | null;
	explanation?: string | null;
}

export interface CbomRetention {
	duration: string;
	policy: string;
}

export interface CbomEvidenceEnvelope {
	evidenceId: string;
	type: 'otel-span' | 'tool-call' | 'file-pointer' | 'policy-report' | 'attestation';
	hash: string;
	location?: string;
	redacted?: boolean;
	metadata?: Record<string, unknown>;
}
