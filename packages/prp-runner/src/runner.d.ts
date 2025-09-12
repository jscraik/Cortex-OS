/**
 * @file packages/prp-runner/src/runner.ts
 * @description End-to-end PRP workflow runner using gate framework (G0→G1 for now)
 */
import type { HumanApproval, PRPState } from '@cortex-os/kernel';
import type { GateContext } from './gates/base.js';
export interface RepoInfo {
    owner: string;
    repo: string;
    branch: string;
    commitSha: string;
}
export interface RunOptions {
    workingDirectory: string;
    projectRoot: string;
    initialMdPath?: string;
    actor?: string;
    strictMode?: boolean;
    outputPath?: string;
}
export interface Blueprint {
    title: string;
    description: string;
    requirements: string[];
    metadata?: Record<string, unknown>;
}
export interface HumanApprovalProvider {
    requestApproval(input: {
        gateId: string;
        role: string;
        description: string;
        context: GateContext;
    }): Promise<HumanApproval>;
}
export declare function runPRPWorkflow(blueprint: Blueprint, repoInfo: RepoInfo, options: RunOptions, approvalProvider?: HumanApprovalProvider): Promise<{
    state: PRPState;
    prpPath: string;
    markdown: string;
}>;
//# sourceMappingURL=runner.d.ts.map