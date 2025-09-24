import { describe, expect, it } from 'vitest';
import {
	createInMemoryKeyRegistry,
	createProofSession,
	createRegistrySigner,
	finalizeProof,
	verifyProofAuto,
} from '../../packages/kernel/src/index';

// Helper to finalize with signing
async function generateSignedProof(registry: ReturnType<typeof createInMemoryKeyRegistry>) {
	const signer = createRegistrySigner(registry);
	const session = createProofSession({ seed: 'seed', executionHash: 'exec', records: [] });
	session.addClaim('core.totalTasks', '0');
	const artifact = await finalizeProof(session, { signer });
	return { artifact, signer };
}

describe('key rotation', () => {
	it('verifies old signature after rotation', async () => {
		const registry = createInMemoryKeyRegistry();
		const { artifact: first, signer } = await generateSignedProof(registry);
		// rotate key
		await registry.rotate();
		// produce second artifact with new key to ensure rotation worked
		const { artifact: second } = await generateSignedProof(registry);
		expect(first.signature).toBeDefined();
		expect(second.signature).toBeDefined();
		// verify first artifact still valid with signer (which resolves keys from registry)
		const res = await verifyProofAuto(first, signer);
		expect(res.valid).toBe(true);
	});
});
