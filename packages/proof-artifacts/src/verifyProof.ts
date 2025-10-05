import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv, { type JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import proofSchema from './schema/proof.schema.json' with { type: 'json' };
import type { ProofEnvelope, ProofEvidenceFile } from './types.js';

const AjvConstructor = Ajv as unknown as typeof import('ajv').default;
const addFormatsFn = addFormats as unknown as (instance: import('ajv').default) => void;
const ajv = new AjvConstructor({ strict: true, allErrors: true });
addFormatsFn(ajv);
const validate = ajv.compile<ProofEnvelope>(
	proofSchema as unknown as JSONSchemaType<ProofEnvelope>,
);

const sha256Hex = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

const toReadableUrl = (value: string) => {
	if (value.startsWith('file://')) return new URL(value);
	const target = isAbsolute(value) ? value : resolvePath(value);
	return pathToFileURL(target);
};

const readBytes = (uri: string) => readFileSync(toReadableUrl(uri));

const verifyArtifactHash = (envelope: ProofEnvelope, issues: string[]) => {
	try {
		const bytes = readBytes(envelope.artifact.uri);
		const actual = sha256Hex(bytes);
		if (actual !== envelope.artifact.contentHash.hex) {
			issues.push('artifact-hash-mismatch');
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`artifact-read-error:${message}`);
	}
};

const verifyBundleHashes = (envelope: ProofEnvelope, issues: string[]) => {
	if (!envelope.bundle) return;
	envelope.bundle.files.forEach((file) => {
		try {
			const bytes = readBytes(file.uri);
			if (sha256Hex(bytes) !== file.sha256) {
				issues.push(`bundle-hash-mismatch:${file.uri}`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(`bundle-read-error:${file.uri}:${message}`);
		}
	});
};

const verifyFileEvidence = (evidence: ProofEvidenceFile, issues: string[]) => {
	try {
		const bytes = readBytes(evidence.path);
		const hash = sha256Hex(bytes);
		if (hash !== evidence.blobSha256) {
			issues.push(`evidence-hash-mismatch:${evidence.path}`);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`evidence-read-error:${evidence.path}:${message}`);
	}
};

const verifyEvidence = (envelope: ProofEnvelope, issues: string[]) => {
	for (const entry of envelope.evidence.filter(
		(entry): entry is ProofEvidenceFile => entry.type === 'file',
	)) {
		verifyFileEvidence(entry, issues);
	}
};

export interface VerificationResult {
	valid: boolean;
	issues: string[];
}

export const verifyProofEnvelope = (envelope: ProofEnvelope): VerificationResult => {
	const issues: string[] = [];
	if (!validate(envelope)) {
		const schemaIssues = (validate.errors ?? []).map(
			(error) => `schema:${error.instancePath}:${error.message}`,
		);
		return { valid: false, issues: schemaIssues };
	}
	verifyArtifactHash(envelope, issues);
	verifyBundleHashes(envelope, issues);
	verifyEvidence(envelope, issues);
	return { valid: issues.length === 0, issues };
};
