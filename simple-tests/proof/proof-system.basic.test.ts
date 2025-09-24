import { describe, expect, it } from 'vitest';
import {
    createProofSession,
    finalizeProof,
    verifyProof,
} from '../../packages/kernel/src/proof/proofSystem.js';

/**
 * Module B – Proof System (Initial Failing Spec)
 * Goals:
 * 1. Start a proof session capturing deterministic scheduler result metadata.
 * 2. Attach arbitrary claims (key/value) + cryptographic digest of execution record canonical form.
 * 3. Finalize proof producing immutable proof artifact { id, seed, executionHash, claims, digest, timestamp }.
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
        session.addClaim('totalTasks', records.length.toString());
        session.addClaim('allSucceeded', 'true');

        const artifact = await finalizeProof(session);

        expect(artifact.id).toMatch(/^proof_/);
        expect(artifact.seed).toBe(seed);
        expect(artifact.executionHash).toBe(executionHash);
        expect(artifact.claims.totalTasks).toBe('2');
        expect(artifact.digest).toMatch(/^[0-9a-f]{8}$/); // simple fnv digest placeholder

        const verification = verifyProof(artifact);
        expect(verification.valid).toBe(true);
        expect(verification.issues).toHaveLength(0);
    });

    it('detects tampered digest', async () => {
        const seed = 'proof-seed-2';
        const executionHash = 'beadfeed';
        const records = [
            { id: 'a', success: true, value: 42 },
        ];
        const session = createProofSession({ seed, executionHash, records });
        session.addClaim('totalTasks', '1');
        session.addClaim('allSucceeded', 'true');
        const artifact = await finalizeProof(session);
        // Tamper
        artifact.claims.allSucceeded = 'false';
        const verification = verifyProof(artifact);
        expect(verification.valid).toBe(false);
        expect(verification.issues).toContain('digest-mismatch');
    });

    it('flags missing required claim (totalTasks)', async () => {
        const seed = 'proof-seed-3';
        const executionHash = 'cafebabe';
        const records = [
            { id: 'x', success: true, value: 1 },
            { id: 'y', success: true, value: 2 },
        ];
        const session = createProofSession({ seed, executionHash, records });
        // Deliberately omit totalTasks
        session.addClaim('allSucceeded', 'true');
        const artifact = await finalizeProof(session);
        const verification = verifyProof(artifact);
        expect(verification.valid).toBe(false);
        expect(verification.issues).toContain('missing-claim:totalTasks');
    });
});
