import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signMock = vi.fn(async () => ({ signature: 'sig', bundle: { messageSignature: 'sig' } }));
const verifyMock = vi.fn(async () => undefined);

vi.mock('@sigstore/sign', () => ({ sign: signMock }));
vi.mock('@sigstore/verify', () => ({ verify: verifyMock }));

import { resolveProofTargets, runCreate, runSign, runVerify } from '../../src/cli/cortex-proofs.js';

const createFixtureArtifact = () => {
	const base = join(process.cwd(), 'test-temp');
	mkdirSync(base, { recursive: true });
	const dir = mkdtempSync(join(base, 'proof-cli-'));
	const artifactPath = join(dir, 'report.md');
	writeFileSync(artifactPath, '# CLI Test Artifact');
	return artifactPath;
};

describe('cortex-proofs CLI helpers', () => {
	beforeEach(() => {
		signMock.mockClear();
		verifyMock.mockClear();
	});
	it('creates, verifies, and signs proof envelopes', async () => {
		const artifactPath = createFixtureArtifact();
		runCreate({
			artifact: artifactPath,
			mime: 'text/markdown',
			context: JSON.stringify({ instruction: 'cli' }),
			runtime: JSON.stringify({ model: 'gpt-5-codex' }),
			evidence: '[]',
			policy: '[]',
		});

		const proofPath = `${artifactPath}.proof.json`;
		const envelope = JSON.parse(readFileSync(proofPath, 'utf-8'));
		expect(envelope.artifact.uri).toContain('file://');

		await runVerify([proofPath]);
		await runSign([proofPath], 'OIDC@GitHub', 'token');
		expect(signMock).toHaveBeenCalledTimes(1);
		expect(verifyMock).toHaveBeenCalledTimes(1);
	});

	it('resolves proof targets when scanning all files', async () => {
		const artifactPath = createFixtureArtifact();
		const proofPath = `${artifactPath}.proof.json`;
		runCreate({
			artifact: artifactPath,
			mime: 'text/markdown',
			context: JSON.stringify({ instruction: 'scan' }),
			runtime: JSON.stringify({ model: 'gpt-5-codex' }),
			evidence: '[]',
			policy: '[]',
		});

		const matches = await resolveProofTargets([], true);
		expect(matches).toContain(proofPath);
	});
});
