import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { runPRPWorkflow } from '../../src/index.js';

describe('PRP Runner workflow (G0→G1)', () => {
    it('runs gates, records approvals, and writes prp.md', async () => {
    const projectRoot = resolve(process.cwd());
    const tmpDir = await fs.mkdtemp(join(tmpdir(), 'prp-runner-'));
    const outputPath = resolve(tmpDir, 'prp.md');

        const { state, prpPath, markdown } = await runPRPWorkflow(
            {
                title: 'Search performance uplift',
                description:
                    'Improve search endpoint latency and accessibility to WCAG 2.2 AA',
                requirements: ['LCP <= 2500ms', 'TBT <= 300ms', 'A11y score >= 95%'],
            },
            {
                owner: 'test',
                repo: 'cortex-os',
                branch: 'test-branch',
                commitSha: 'deadbeefdeadbeef',
            },
            {
                workingDirectory: projectRoot,
                projectRoot,
                outputPath,
                actor: 'test-runner',
                strictMode: false,
            },
        );

        expect(state.gates.G0).toBeDefined();
        expect(state.gates.G1).toBeDefined();
        expect(state.gates.G2).toBeDefined();
        expect(state.gates.G3).toBeDefined();
        expect(state.gates.G4).toBeDefined();
        expect(state.gates.G5).toBeDefined();
        expect(state.gates.G6).toBeDefined();
        expect(state.gates.G7).toBeDefined();
        expect(state.evidence.length).toBeGreaterThan(0);
        expect(state.approvals.length).toBeGreaterThan(0);
        expect(markdown).toContain('# PRP Document');
        // If everything passed, document status should be ready-for-release
        expect(markdown).toMatch(/\*\*Status:\*\* (ready-for-release|in-progress)/);
        expect(prpPath).toBe(outputPath);

        const fileExists = await fs
            .access(prpPath)
            .then(() => true)
            .catch(() => false);
        expect(fileExists).toBe(true);
    });
});
