import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
	createProofSession,
	finalizeProof,
	registerClaimSchema,
	verifyProof,
	verifyProofAsync,
} from '../../packages/kernel/src/index.js';

// Register schemas
registerClaimSchema('core.totalTasks', z.string().regex(/^\d+$/));
registerClaimSchema('core.allSucceeded', z.enum(['true', 'false']));
registerClaimSchema('custom.score', z.string().regex(/^\d+(\.\d+)?$/));

describe('claim schema validation', () => {
	it('accepts valid claims', async () => {
		const session = createProofSession({ seed: 's', executionHash: 'h', records: [] });
		session.addClaim('core.totalTasks', '0');
		session.addClaim('core.allSucceeded', 'true');
		session.addClaim('custom.score', '12.5');
		const artifact = await finalizeProof(session, {});
		const sync = verifyProof(artifact);
		expect(sync.issues).toEqual([]);
		const asyncRes = await verifyProofAsync(artifact);
		expect(asyncRes.issues).toEqual([]);
	});

	it('flags invalid claim values', async () => {
		const session = createProofSession({ seed: 's2', executionHash: 'h2', records: [] });
		session.addClaim('core.totalTasks', 'NaN'); // invalid
		session.addClaim('core.allSucceeded', 'maybe'); // invalid
		const artifact = await finalizeProof(session, {});
		const result = verifyProof(artifact);
		expect(result.issues).toContain('claim-invalid:core.totalTasks');
		expect(result.issues).toContain('claim-invalid:core.allSucceeded');
	});
});
