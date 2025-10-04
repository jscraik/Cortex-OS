import { describe, expect, it } from 'vitest';
import {
        createProofSession,
        exportExecutionProofEnvelope,
        finalizeProof,
        verifyProof,
} from '../../packages/kernel/src/proof/proofSystem.js';
import { verifyProofEnvelope } from '@cortex-os/proof-artifacts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Module B – Proof System (Initial Failing Spec)
 * Goals:
 * 1. Start a proof session capturing deterministic scheduler result metadata.
 * 2. Attach arbitrary claims (key/value) + cryptographic digest of execution record canonical form.
 * 3. Finalize proof producing immutable proof artifact { id, seed, executionHash, claims, digest, timestamp, version }.
 * 4. verifyProof(artifact) returns { valid: boolean, issues: string[] }.
 *
 * This initial red test defines the contract before implementation.
 */

describe('Proof System (Module B)', () => {
	it('creates, finalizes, and verifies a proof artifact', async () => {
		// Arrange: minimal deterministic scheduler output shape we care about
		const seed = 'proof-seed-1';
		const executionHash = 'deadbeef';
		const records = [
			{ id: 't1', success: true, value: 1 },
			{ id: 't2', success: true, value: 2 },
		];

		const session = createProofSession({ seed, executionHash, records });
		session.addClaim('core.totalTasks', records.length.toString());
		session.addClaim('core.allSucceeded', 'true');

		const artifact = await finalizeProof(session);

		expect(artifact.id).toMatch(/^proof_/);
		expect(artifact.seed).toBe(seed);
		expect(artifact.executionHash).toBe(executionHash);
		expect(artifact.claims['core.totalTasks']).toBe('2');
		expect(artifact.digest.value).toMatch(/^[0-9a-f]+$/); // fnv or sha hex
		expect(['fnv1a32', 'sha256']).toContain(artifact.digest.algo);
		expect(artifact.version).toBe('1.0.0');

		const verification = verifyProof(artifact);
		expect(verification.valid).toBe(true);
		expect(verification.issues).toHaveLength(0);
	});

	it('detects tampered digest', async () => {
		const seed = 'proof-seed-2';
		const executionHash = 'beadfeed';
		const records = [{ id: 'a', success: true, value: 42 }];
		const session = createProofSession({ seed, executionHash, records });
		session.addClaim('core.totalTasks', '1');
		session.addClaim('core.allSucceeded', 'true');
		const artifact = await finalizeProof(session);
		// Tamper (claims frozen so create mutated copy to test digest mismatch by altering internal field via cast)
		// @ts-expect-error intentional unsafe for test
		artifact.claims = { ...artifact.claims, 'core.allSucceeded': 'false' };
		const verification = verifyProof(artifact);
		expect(verification.valid).toBe(false);
		expect(verification.issues).toContain('digest-mismatch');
	});

	it('flags missing required claim (core.totalTasks)', async () => {
		const seed = 'proof-seed-3';
		const executionHash = 'cafebabe';
		const records = [
			{ id: 'x', success: true, value: 1 },
			{ id: 'y', success: true, value: 2 },
		];
		const session = createProofSession({ seed, executionHash, records });
		// Deliberately omit core.totalTasks
		session.addClaim('core.allSucceeded', 'true');
		const artifact = await finalizeProof(session);
		const verification = verifyProof(artifact);
		expect(verification.valid).toBe(false);
		expect(verification.issues).toContain('missing-claim:core.totalTasks');
	});
        it('creates a proof envelope referencing kernel digest', async () => {
                const session = createProofSession({
                        seed: 'proof-envelope',
                        executionHash: 'hash',
                        records: [],
                });
                session.addClaim('core.totalTasks', '0');
                const artifact = await finalizeProof(session);
                const baseDir = join(process.cwd(), 'test-temp');
                mkdirSync(baseDir, { recursive: true });
                const artifactPath = join(baseDir, 'simple-proof.json');
                writeFileSync(artifactPath, JSON.stringify({ ok: true }));
                const envelope = exportExecutionProofEnvelope(artifact, {
                        artifactPath,
                        artifactMime: 'application/json',
                        publicContext: { instruction: 'simple' },
                        evidence: [],
                        runtime: { model: 'gpt-5-codex' },
                });
                const verification = verifyProofEnvelope(envelope);
                expect(verification.valid).toBe(true);
        });
});
