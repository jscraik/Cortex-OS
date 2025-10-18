/**
 * @file packages/prp-runner/src/gates/chain-io-profiles.ts
 * @description Chain I/O persona and deliverable metadata mapped to PRP gates.
 */

import type { GateId } from './base.js';

export type ChainIoDeliverableDefinition = {
        name: string;
        description: string;
        planPathKey?: string;
        artifactMatch?: string;
};

export type GateChainIoProfile = {
        gateId: GateId;
        persona: string;
        chainRole: string;
        description: string;
        requiredArtifacts: ChainIoDeliverableDefinition[];
        batonCheckpoints?: string[];
};

const profiles: Record<GateId, GateChainIoProfile> = {
        G0: {
                gateId: 'G0',
                persona: 'Product Manager',
                chainRole: 'Product-manager',
                description:
                        'Defines the problem, measurable outcomes, and scope so downstream roles can execute.',
                requiredArtifacts: [
                        {
                                name: 'feature.prp.md',
                                description: 'Problem/Goals/Scope feature spec drafted in the repo.',
                                planPathKey: 'spec_md',
                        },
                ],
                batonCheckpoints: ['spec_md'],
        },
        G1: {
                gateId: 'G1',
                persona: 'Systems Architect',
                chainRole: 'Systems-architect',
                description: 'Produces architecture notes and diagrams that frame integration boundaries and SLAs.',
                requiredArtifacts: [
                        {
                                name: 'architecture-plan.md',
                                description: 'Architecture handshake or implementation plan shared with engineering.',
                                planPathKey: 'implementation_plan_md',
                        },
                ],
                batonCheckpoints: ['implementation_plan_md'],
        },
        G2: {
                gateId: 'G2',
                persona: 'QA Lead',
                chainRole: 'Quality-lead',
                description: 'Designs the TDD strategy, coverage targets, and acceptance evaluation hooks.',
                requiredArtifacts: [
                        {
                                name: 'tdd-plan.md',
                                description: 'TDD or validation plan documenting unit/integration/eval hooks.',
                                planPathKey: 'tdd_plan_md',
                        },
                ],
                batonCheckpoints: ['tdd_plan_md'],
        },
        G3: {
                gateId: 'G3',
                persona: 'Code Reviewer',
                chainRole: 'Code-reviewer',
                description: 'Ensures adapters/tests land with complete code-review checklist evidence.',
                requiredArtifacts: [
                        {
                                name: 'code-review-checklist.md',
                                description: 'Completed code review checklist with evidence links.',
                                planPathKey: 'checklist_md',
                        },
                ],
                batonCheckpoints: ['checklist_md'],
        },
        G4: {
                gateId: 'G4',
                persona: 'Security Analyst',
                chainRole: 'Security-analyst',
                description: 'Maps threats to guards and captures verification evidence and SBOM references.',
                requiredArtifacts: [
                        {
                                name: 'security-verification-report.md',
                                description: 'Verification report summarising threat mitigations and guard coverage.',
                                artifactMatch: 'verification-report',
                        },
                ],
                batonCheckpoints: [],
        },
        G5: {
                gateId: 'G5',
                persona: 'Comms Specialist',
                chainRole: 'Comms-specialist',
                description: 'Aggregates change notes, stakeholder messaging, and rollout comms.',
                requiredArtifacts: [
                        {
                                name: 'rollout-notes.md',
                                description: 'Rollout/change notes shared with stakeholders.',
                                planPathKey: 'summary_md',
                        },
                ],
                batonCheckpoints: ['summary_md'],
        },
        G6: {
                gateId: 'G6',
                persona: 'Automation Engineer',
                chainRole: 'Automation-engineer',
                description: 'Confirms CI hooks, SBOM wiring, and runbook automation readiness.',
                requiredArtifacts: [
                        {
                                name: 'automation-runbook.md',
                                description: 'Operational runbook or scheduler plan for deployment automation.',
                        },
                ],
                batonCheckpoints: [],
        },
        G7: {
                gateId: 'G7',
                persona: 'Product Specialist',
                chainRole: 'Product-specialist',
                description: 'Collects final evidence bundle and signs off acceptance versus measurable goals.',
                requiredArtifacts: [
                        {
                                name: 'evidence-bundle.json',
                                description: 'Signed evidence manifest linking run manifest, SBOM, and acceptance proof.',
                                artifactMatch: 'run-manifest',
                        },
                ],
                batonCheckpoints: [],
        },
};

export const GATE_CHAIN_IO_PROFILES: Readonly<Record<GateId, GateChainIoProfile>> = profiles;

export function getGateChainIoProfile(gateId: GateId): GateChainIoProfile {
        return profiles[gateId];
}
