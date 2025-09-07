/**
 * @file state.ts
 * @description Cortex Kernel State Management - Deterministic PRP State Schema
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */
import { z } from "zod";
/**
 * Evidence captured during PRP execution
 */
export declare const EvidenceSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["file", "command", "test", "analysis", "validation", "llm-generation", "coverage", "a11y", "security", "sbom"]>;
    source: z.ZodString;
    content: z.ZodString;
    timestamp: z.ZodString;
    phase: z.ZodEnum<["strategy", "build", "evaluation"]>;
    commitSha: z.ZodOptional<z.ZodString>;
    lineRange: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "validation" | "file" | "command" | "test" | "analysis" | "llm-generation" | "coverage" | "a11y" | "security" | "sbom";
    id: string;
    content: string;
    timestamp: string;
    source: string;
    phase: "strategy" | "build" | "evaluation";
    metadata?: Record<string, unknown> | undefined;
    commitSha?: string | undefined;
    lineRange?: string | undefined;
}, {
    type: "validation" | "file" | "command" | "test" | "analysis" | "llm-generation" | "coverage" | "a11y" | "security" | "sbom";
    id: string;
    content: string;
    timestamp: string;
    source: string;
    phase: "strategy" | "build" | "evaluation";
    metadata?: Record<string, unknown> | undefined;
    commitSha?: string | undefined;
    lineRange?: string | undefined;
}>;
/**
 * Human approval record for gates
 */
export declare const HumanApprovalSchema: z.ZodObject<{
    gateId: z.ZodEnum<["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]>;
    actor: z.ZodString;
    decision: z.ZodEnum<["approved", "rejected", "pending"]>;
    timestamp: z.ZodString;
    commitSha: z.ZodString;
    rationale: z.ZodString;
    signature: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    commitSha: string;
    gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
    actor: string;
    decision: "approved" | "rejected" | "pending";
    rationale: string;
    signature?: string | undefined;
}, {
    timestamp: string;
    commitSha: string;
    gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
    actor: string;
    decision: "approved" | "rejected" | "pending";
    rationale: string;
    signature?: string | undefined;
}>;
/**
 * Gate execution result
 */
export declare const GateResultSchema: z.ZodObject<{
    id: z.ZodEnum<["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]>;
    name: z.ZodString;
    status: z.ZodEnum<["pending", "running", "passed", "failed", "skipped"]>;
    requiresHumanApproval: z.ZodBoolean;
    humanApproval: z.ZodOptional<z.ZodObject<{
        gateId: z.ZodEnum<["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]>;
        actor: z.ZodString;
        decision: z.ZodEnum<["approved", "rejected", "pending"]>;
        timestamp: z.ZodString;
        commitSha: z.ZodString;
        rationale: z.ZodString;
        signature: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        commitSha: string;
        gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        actor: string;
        decision: "approved" | "rejected" | "pending";
        rationale: string;
        signature?: string | undefined;
    }, {
        timestamp: string;
        commitSha: string;
        gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        actor: string;
        decision: "approved" | "rejected" | "pending";
        rationale: string;
        signature?: string | undefined;
    }>>;
    automatedChecks: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        status: z.ZodEnum<["pass", "fail", "skip"]>;
        output: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "pass" | "fail" | "skip";
        name: string;
        output?: string | undefined;
        duration?: number | undefined;
    }, {
        status: "pass" | "fail" | "skip";
        name: string;
        output?: string | undefined;
        duration?: number | undefined;
    }>, "many">;
    artifacts: z.ZodArray<z.ZodString, "many">;
    evidence: z.ZodArray<z.ZodString, "many">;
    timestamp: z.ZodString;
    nextSteps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "running" | "passed" | "failed" | "skipped";
    id: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
    name: string;
    timestamp: string;
    requiresHumanApproval: boolean;
    automatedChecks: {
        status: "pass" | "fail" | "skip";
        name: string;
        output?: string | undefined;
        duration?: number | undefined;
    }[];
    artifacts: string[];
    evidence: string[];
    humanApproval?: {
        timestamp: string;
        commitSha: string;
        gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        actor: string;
        decision: "approved" | "rejected" | "pending";
        rationale: string;
        signature?: string | undefined;
    } | undefined;
    nextSteps?: string[] | undefined;
}, {
    status: "pending" | "running" | "passed" | "failed" | "skipped";
    id: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
    name: string;
    timestamp: string;
    requiresHumanApproval: boolean;
    automatedChecks: {
        status: "pass" | "fail" | "skip";
        name: string;
        output?: string | undefined;
        duration?: number | undefined;
    }[];
    artifacts: string[];
    evidence: string[];
    humanApproval?: {
        timestamp: string;
        commitSha: string;
        gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        actor: string;
        decision: "approved" | "rejected" | "pending";
        rationale: string;
        signature?: string | undefined;
    } | undefined;
    nextSteps?: string[] | undefined;
}>;
/**
 * Validation gate results for each phase
 */
export declare const ValidationGateSchema: z.ZodObject<{
    passed: z.ZodBoolean;
    blockers: z.ZodArray<z.ZodString, "many">;
    majors: z.ZodArray<z.ZodString, "many">;
    evidence: z.ZodArray<z.ZodString, "many">;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    passed: boolean;
    evidence: string[];
    blockers: string[];
    majors: string[];
}, {
    timestamp: string;
    passed: boolean;
    evidence: string[];
    blockers: string[];
    majors: string[];
}>;
/**
 * Cerebrum decision state
 */
export declare const CerebrumDecisionSchema: z.ZodObject<{
    decision: z.ZodEnum<["promote", "recycle", "pending"]>;
    reasoning: z.ZodString;
    confidence: z.ZodNumber;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    decision: "pending" | "promote" | "recycle";
    reasoning: string;
    confidence: number;
}, {
    timestamp: string;
    decision: "pending" | "promote" | "recycle";
    reasoning: string;
    confidence: number;
}>;
/**
 * Enforcement Profile from initial.md
 */
export declare const EnforcementProfileSchema: z.ZodObject<{
    budgets: z.ZodObject<{
        coverageLines: z.ZodDefault<z.ZodNumber>;
        coverageBranches: z.ZodDefault<z.ZodNumber>;
        performanceLCP: z.ZodDefault<z.ZodNumber>;
        performanceTBT: z.ZodDefault<z.ZodNumber>;
        a11yScore: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        coverageLines: number;
        coverageBranches: number;
        performanceLCP: number;
        performanceTBT: number;
        a11yScore: number;
    }, {
        coverageLines?: number | undefined;
        coverageBranches?: number | undefined;
        performanceLCP?: number | undefined;
        performanceTBT?: number | undefined;
        a11yScore?: number | undefined;
    }>;
    architecture: z.ZodObject<{
        allowedPackageBoundaries: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        namingConventions: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        repoLayout: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        crossBoundaryImports: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        allowedPackageBoundaries: string[];
        namingConventions: Record<string, string>;
        repoLayout: string[];
        crossBoundaryImports: string[];
    }, {
        allowedPackageBoundaries?: string[] | undefined;
        namingConventions?: Record<string, string> | undefined;
        repoLayout?: string[] | undefined;
        crossBoundaryImports?: string[] | undefined;
    }>;
    governance: z.ZodObject<{
        licensePolicy: z.ZodDefault<z.ZodString>;
        codeownersMapping: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        structureGuardExceptions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requiredChecks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        licensePolicy: string;
        codeownersMapping: Record<string, string[]>;
        structureGuardExceptions: string[];
        requiredChecks: string[];
    }, {
        licensePolicy?: string | undefined;
        codeownersMapping?: Record<string, string[]> | undefined;
        structureGuardExceptions?: string[] | undefined;
        requiredChecks?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    budgets: {
        coverageLines: number;
        coverageBranches: number;
        performanceLCP: number;
        performanceTBT: number;
        a11yScore: number;
    };
    architecture: {
        allowedPackageBoundaries: string[];
        namingConventions: Record<string, string>;
        repoLayout: string[];
        crossBoundaryImports: string[];
    };
    governance: {
        licensePolicy: string;
        codeownersMapping: Record<string, string[]>;
        structureGuardExceptions: string[];
        requiredChecks: string[];
    };
}, {
    budgets: {
        coverageLines?: number | undefined;
        coverageBranches?: number | undefined;
        performanceLCP?: number | undefined;
        performanceTBT?: number | undefined;
        a11yScore?: number | undefined;
    };
    architecture: {
        allowedPackageBoundaries?: string[] | undefined;
        namingConventions?: Record<string, string> | undefined;
        repoLayout?: string[] | undefined;
        crossBoundaryImports?: string[] | undefined;
    };
    governance: {
        licensePolicy?: string | undefined;
        codeownersMapping?: Record<string, string[]> | undefined;
        structureGuardExceptions?: string[] | undefined;
        requiredChecks?: string[] | undefined;
    };
}>;
/**
 * Core PRP State following the state machine diagram
 */
export declare const PRPStateSchema: z.ZodObject<{
    id: z.ZodString;
    runId: z.ZodString;
    phase: z.ZodEnum<["strategy", "build", "evaluation", "completed", "recycled"]>;
    blueprint: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        requirements: z.ZodArray<z.ZodString, "many">;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        title: string;
        requirements: string[];
        metadata?: Record<string, unknown> | undefined;
    }, {
        description: string;
        title: string;
        requirements: string[];
        metadata?: Record<string, unknown> | undefined;
    }>;
    enforcementProfile: z.ZodOptional<z.ZodObject<{
        budgets: z.ZodObject<{
            coverageLines: z.ZodDefault<z.ZodNumber>;
            coverageBranches: z.ZodDefault<z.ZodNumber>;
            performanceLCP: z.ZodDefault<z.ZodNumber>;
            performanceTBT: z.ZodDefault<z.ZodNumber>;
            a11yScore: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            coverageLines: number;
            coverageBranches: number;
            performanceLCP: number;
            performanceTBT: number;
            a11yScore: number;
        }, {
            coverageLines?: number | undefined;
            coverageBranches?: number | undefined;
            performanceLCP?: number | undefined;
            performanceTBT?: number | undefined;
            a11yScore?: number | undefined;
        }>;
        architecture: z.ZodObject<{
            allowedPackageBoundaries: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            namingConventions: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
            repoLayout: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            crossBoundaryImports: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            allowedPackageBoundaries: string[];
            namingConventions: Record<string, string>;
            repoLayout: string[];
            crossBoundaryImports: string[];
        }, {
            allowedPackageBoundaries?: string[] | undefined;
            namingConventions?: Record<string, string> | undefined;
            repoLayout?: string[] | undefined;
            crossBoundaryImports?: string[] | undefined;
        }>;
        governance: z.ZodObject<{
            licensePolicy: z.ZodDefault<z.ZodString>;
            codeownersMapping: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
            structureGuardExceptions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requiredChecks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            licensePolicy: string;
            codeownersMapping: Record<string, string[]>;
            structureGuardExceptions: string[];
            requiredChecks: string[];
        }, {
            licensePolicy?: string | undefined;
            codeownersMapping?: Record<string, string[]> | undefined;
            structureGuardExceptions?: string[] | undefined;
            requiredChecks?: string[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        budgets: {
            coverageLines: number;
            coverageBranches: number;
            performanceLCP: number;
            performanceTBT: number;
            a11yScore: number;
        };
        architecture: {
            allowedPackageBoundaries: string[];
            namingConventions: Record<string, string>;
            repoLayout: string[];
            crossBoundaryImports: string[];
        };
        governance: {
            licensePolicy: string;
            codeownersMapping: Record<string, string[]>;
            structureGuardExceptions: string[];
            requiredChecks: string[];
        };
    }, {
        budgets: {
            coverageLines?: number | undefined;
            coverageBranches?: number | undefined;
            performanceLCP?: number | undefined;
            performanceTBT?: number | undefined;
            a11yScore?: number | undefined;
        };
        architecture: {
            allowedPackageBoundaries?: string[] | undefined;
            namingConventions?: Record<string, string> | undefined;
            repoLayout?: string[] | undefined;
            crossBoundaryImports?: string[] | undefined;
        };
        governance: {
            licensePolicy?: string | undefined;
            codeownersMapping?: Record<string, string[]> | undefined;
            structureGuardExceptions?: string[] | undefined;
            requiredChecks?: string[] | undefined;
        };
    }>>;
    gates: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodEnum<["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]>;
        name: z.ZodString;
        status: z.ZodEnum<["pending", "running", "passed", "failed", "skipped"]>;
        requiresHumanApproval: z.ZodBoolean;
        humanApproval: z.ZodOptional<z.ZodObject<{
            gateId: z.ZodEnum<["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]>;
            actor: z.ZodString;
            decision: z.ZodEnum<["approved", "rejected", "pending"]>;
            timestamp: z.ZodString;
            commitSha: z.ZodString;
            rationale: z.ZodString;
            signature: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            commitSha: string;
            gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
            actor: string;
            decision: "approved" | "rejected" | "pending";
            rationale: string;
            signature?: string | undefined;
        }, {
            timestamp: string;
            commitSha: string;
            gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
            actor: string;
            decision: "approved" | "rejected" | "pending";
            rationale: string;
            signature?: string | undefined;
        }>>;
        automatedChecks: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            status: z.ZodEnum<["pass", "fail", "skip"]>;
            output: z.ZodOptional<z.ZodString>;
            duration: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            status: "pass" | "fail" | "skip";
            name: string;
            output?: string | undefined;
            duration?: number | undefined;
        }, {
            status: "pass" | "fail" | "skip";
            name: string;
            output?: string | undefined;
            duration?: number | undefined;
        }>, "many">;
        artifacts: z.ZodArray<z.ZodString, "many">;
        evidence: z.ZodArray<z.ZodString, "many">;
        timestamp: z.ZodString;
        nextSteps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "running" | "passed" | "failed" | "skipped";
        id: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        name: string;
        timestamp: string;
        requiresHumanApproval: boolean;
        automatedChecks: {
            status: "pass" | "fail" | "skip";
            name: string;
            output?: string | undefined;
            duration?: number | undefined;
        }[];
        artifacts: string[];
        evidence: string[];
        humanApproval?: {
            timestamp: string;
            commitSha: string;
            gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
            actor: string;
            decision: "approved" | "rejected" | "pending";
            rationale: string;
            signature?: string | undefined;
        } | undefined;
        nextSteps?: string[] | undefined;
    }, {
        status: "pending" | "running" | "passed" | "failed" | "skipped";
        id: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        name: string;
        timestamp: string;
        requiresHumanApproval: boolean;
        automatedChecks: {
            status: "pass" | "fail" | "skip";
            name: string;
            output?: string | undefined;
            duration?: number | undefined;
        }[];
        artifacts: string[];
        evidence: string[];
        humanApproval?: {
            timestamp: string;
            commitSha: string;
            gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
            actor: string;
            decision: "approved" | "rejected" | "pending";
            rationale: string;
            signature?: string | undefined;
        } | undefined;
        nextSteps?: string[] | undefined;
    }>>>;
    approvals: z.ZodDefault<z.ZodArray<z.ZodObject<{
        gateId: z.ZodEnum<["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]>;
        actor: z.ZodString;
        decision: z.ZodEnum<["approved", "rejected", "pending"]>;
        timestamp: z.ZodString;
        commitSha: z.ZodString;
        rationale: z.ZodString;
        signature: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        commitSha: string;
        gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        actor: string;
        decision: "approved" | "rejected" | "pending";
        rationale: string;
        signature?: string | undefined;
    }, {
        timestamp: string;
        commitSha: string;
        gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        actor: string;
        decision: "approved" | "rejected" | "pending";
        rationale: string;
        signature?: string | undefined;
    }>, "many">>;
    outputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    validationResults: z.ZodObject<{
        strategy: z.ZodOptional<z.ZodObject<{
            passed: z.ZodBoolean;
            blockers: z.ZodArray<z.ZodString, "many">;
            majors: z.ZodArray<z.ZodString, "many">;
            evidence: z.ZodArray<z.ZodString, "many">;
            timestamp: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        }, {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        }>>;
        build: z.ZodOptional<z.ZodObject<{
            passed: z.ZodBoolean;
            blockers: z.ZodArray<z.ZodString, "many">;
            majors: z.ZodArray<z.ZodString, "many">;
            evidence: z.ZodArray<z.ZodString, "many">;
            timestamp: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        }, {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        }>>;
        evaluation: z.ZodOptional<z.ZodObject<{
            passed: z.ZodBoolean;
            blockers: z.ZodArray<z.ZodString, "many">;
            majors: z.ZodArray<z.ZodString, "many">;
            evidence: z.ZodArray<z.ZodString, "many">;
            timestamp: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        }, {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        strategy?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
        build?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
        evaluation?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
    }, {
        strategy?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
        build?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
        evaluation?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
    }>;
    evidence: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["file", "command", "test", "analysis", "validation", "llm-generation", "coverage", "a11y", "security", "sbom"]>;
        source: z.ZodString;
        content: z.ZodString;
        timestamp: z.ZodString;
        phase: z.ZodEnum<["strategy", "build", "evaluation"]>;
        commitSha: z.ZodOptional<z.ZodString>;
        lineRange: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "validation" | "file" | "command" | "test" | "analysis" | "llm-generation" | "coverage" | "a11y" | "security" | "sbom";
        id: string;
        content: string;
        timestamp: string;
        source: string;
        phase: "strategy" | "build" | "evaluation";
        metadata?: Record<string, unknown> | undefined;
        commitSha?: string | undefined;
        lineRange?: string | undefined;
    }, {
        type: "validation" | "file" | "command" | "test" | "analysis" | "llm-generation" | "coverage" | "a11y" | "security" | "sbom";
        id: string;
        content: string;
        timestamp: string;
        source: string;
        phase: "strategy" | "build" | "evaluation";
        metadata?: Record<string, unknown> | undefined;
        commitSha?: string | undefined;
        lineRange?: string | undefined;
    }>, "many">;
    cerebrum: z.ZodOptional<z.ZodObject<{
        decision: z.ZodEnum<["promote", "recycle", "pending"]>;
        reasoning: z.ZodString;
        confidence: z.ZodNumber;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        decision: "pending" | "promote" | "recycle";
        reasoning: string;
        confidence: number;
    }, {
        timestamp: string;
        decision: "pending" | "promote" | "recycle";
        reasoning: string;
        confidence: number;
    }>>;
    metadata: z.ZodObject<{
        startTime: z.ZodString;
        endTime: z.ZodOptional<z.ZodString>;
        currentNeuron: z.ZodOptional<z.ZodString>;
        llmConfig: z.ZodOptional<z.ZodObject<{
            provider: z.ZodOptional<z.ZodEnum<["mlx", "ollama"]>>;
            model: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            provider?: "mlx" | "ollama" | undefined;
            model?: string | undefined;
        }, {
            provider?: "mlx" | "ollama" | undefined;
            model?: string | undefined;
        }>>;
        executionContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        deterministic: z.ZodOptional<z.ZodBoolean>;
        validationAdjustments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        gateModifications: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        workflowAlterations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        startTime: string;
        endTime?: string | undefined;
        currentNeuron?: string | undefined;
        llmConfig?: {
            provider?: "mlx" | "ollama" | undefined;
            model?: string | undefined;
        } | undefined;
        executionContext?: Record<string, unknown> | undefined;
        deterministic?: boolean | undefined;
        validationAdjustments?: Record<string, unknown> | undefined;
        gateModifications?: Record<string, unknown> | undefined;
        workflowAlterations?: Record<string, unknown> | undefined;
        error?: string | undefined;
    }, {
        startTime: string;
        endTime?: string | undefined;
        currentNeuron?: string | undefined;
        llmConfig?: {
            provider?: "mlx" | "ollama" | undefined;
            model?: string | undefined;
        } | undefined;
        executionContext?: Record<string, unknown> | undefined;
        deterministic?: boolean | undefined;
        validationAdjustments?: Record<string, unknown> | undefined;
        gateModifications?: Record<string, unknown> | undefined;
        workflowAlterations?: Record<string, unknown> | undefined;
        error?: string | undefined;
    }>;
    checkpoints: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        timestamp: z.ZodString;
        phase: z.ZodEnum<["strategy", "build", "evaluation", "completed", "recycled"]>;
        state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        timestamp: string;
        phase: "strategy" | "build" | "evaluation" | "completed" | "recycled";
        state: Record<string, unknown>;
    }, {
        id: string;
        timestamp: string;
        phase: "strategy" | "build" | "evaluation" | "completed" | "recycled";
        state: Record<string, unknown>;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    metadata: {
        startTime: string;
        endTime?: string | undefined;
        currentNeuron?: string | undefined;
        llmConfig?: {
            provider?: "mlx" | "ollama" | undefined;
            model?: string | undefined;
        } | undefined;
        executionContext?: Record<string, unknown> | undefined;
        deterministic?: boolean | undefined;
        validationAdjustments?: Record<string, unknown> | undefined;
        gateModifications?: Record<string, unknown> | undefined;
        workflowAlterations?: Record<string, unknown> | undefined;
        error?: string | undefined;
    };
    phase: "strategy" | "build" | "evaluation" | "completed" | "recycled";
    evidence: {
        type: "validation" | "file" | "command" | "test" | "analysis" | "llm-generation" | "coverage" | "a11y" | "security" | "sbom";
        id: string;
        content: string;
        timestamp: string;
        source: string;
        phase: "strategy" | "build" | "evaluation";
        metadata?: Record<string, unknown> | undefined;
        commitSha?: string | undefined;
        lineRange?: string | undefined;
    }[];
    runId: string;
    blueprint: {
        description: string;
        title: string;
        requirements: string[];
        metadata?: Record<string, unknown> | undefined;
    };
    gates: Record<string, {
        status: "pending" | "running" | "passed" | "failed" | "skipped";
        id: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        name: string;
        timestamp: string;
        requiresHumanApproval: boolean;
        automatedChecks: {
            status: "pass" | "fail" | "skip";
            name: string;
            output?: string | undefined;
            duration?: number | undefined;
        }[];
        artifacts: string[];
        evidence: string[];
        humanApproval?: {
            timestamp: string;
            commitSha: string;
            gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
            actor: string;
            decision: "approved" | "rejected" | "pending";
            rationale: string;
            signature?: string | undefined;
        } | undefined;
        nextSteps?: string[] | undefined;
    }>;
    approvals: {
        timestamp: string;
        commitSha: string;
        gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        actor: string;
        decision: "approved" | "rejected" | "pending";
        rationale: string;
        signature?: string | undefined;
    }[];
    outputs: Record<string, unknown>;
    validationResults: {
        strategy?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
        build?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
        evaluation?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
    };
    enforcementProfile?: {
        budgets: {
            coverageLines: number;
            coverageBranches: number;
            performanceLCP: number;
            performanceTBT: number;
            a11yScore: number;
        };
        architecture: {
            allowedPackageBoundaries: string[];
            namingConventions: Record<string, string>;
            repoLayout: string[];
            crossBoundaryImports: string[];
        };
        governance: {
            licensePolicy: string;
            codeownersMapping: Record<string, string[]>;
            structureGuardExceptions: string[];
            requiredChecks: string[];
        };
    } | undefined;
    cerebrum?: {
        timestamp: string;
        decision: "pending" | "promote" | "recycle";
        reasoning: string;
        confidence: number;
    } | undefined;
    checkpoints?: {
        id: string;
        timestamp: string;
        phase: "strategy" | "build" | "evaluation" | "completed" | "recycled";
        state: Record<string, unknown>;
    }[] | undefined;
}, {
    id: string;
    metadata: {
        startTime: string;
        endTime?: string | undefined;
        currentNeuron?: string | undefined;
        llmConfig?: {
            provider?: "mlx" | "ollama" | undefined;
            model?: string | undefined;
        } | undefined;
        executionContext?: Record<string, unknown> | undefined;
        deterministic?: boolean | undefined;
        validationAdjustments?: Record<string, unknown> | undefined;
        gateModifications?: Record<string, unknown> | undefined;
        workflowAlterations?: Record<string, unknown> | undefined;
        error?: string | undefined;
    };
    phase: "strategy" | "build" | "evaluation" | "completed" | "recycled";
    evidence: {
        type: "validation" | "file" | "command" | "test" | "analysis" | "llm-generation" | "coverage" | "a11y" | "security" | "sbom";
        id: string;
        content: string;
        timestamp: string;
        source: string;
        phase: "strategy" | "build" | "evaluation";
        metadata?: Record<string, unknown> | undefined;
        commitSha?: string | undefined;
        lineRange?: string | undefined;
    }[];
    runId: string;
    blueprint: {
        description: string;
        title: string;
        requirements: string[];
        metadata?: Record<string, unknown> | undefined;
    };
    outputs: Record<string, unknown>;
    validationResults: {
        strategy?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
        build?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
        evaluation?: {
            timestamp: string;
            passed: boolean;
            evidence: string[];
            blockers: string[];
            majors: string[];
        } | undefined;
    };
    enforcementProfile?: {
        budgets: {
            coverageLines?: number | undefined;
            coverageBranches?: number | undefined;
            performanceLCP?: number | undefined;
            performanceTBT?: number | undefined;
            a11yScore?: number | undefined;
        };
        architecture: {
            allowedPackageBoundaries?: string[] | undefined;
            namingConventions?: Record<string, string> | undefined;
            repoLayout?: string[] | undefined;
            crossBoundaryImports?: string[] | undefined;
        };
        governance: {
            licensePolicy?: string | undefined;
            codeownersMapping?: Record<string, string[]> | undefined;
            structureGuardExceptions?: string[] | undefined;
            requiredChecks?: string[] | undefined;
        };
    } | undefined;
    gates?: Record<string, {
        status: "pending" | "running" | "passed" | "failed" | "skipped";
        id: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        name: string;
        timestamp: string;
        requiresHumanApproval: boolean;
        automatedChecks: {
            status: "pass" | "fail" | "skip";
            name: string;
            output?: string | undefined;
            duration?: number | undefined;
        }[];
        artifacts: string[];
        evidence: string[];
        humanApproval?: {
            timestamp: string;
            commitSha: string;
            gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
            actor: string;
            decision: "approved" | "rejected" | "pending";
            rationale: string;
            signature?: string | undefined;
        } | undefined;
        nextSteps?: string[] | undefined;
    }> | undefined;
    approvals?: {
        timestamp: string;
        commitSha: string;
        gateId: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
        actor: string;
        decision: "approved" | "rejected" | "pending";
        rationale: string;
        signature?: string | undefined;
    }[] | undefined;
    cerebrum?: {
        timestamp: string;
        decision: "pending" | "promote" | "recycle";
        reasoning: string;
        confidence: number;
    } | undefined;
    checkpoints?: {
        id: string;
        timestamp: string;
        phase: "strategy" | "build" | "evaluation" | "completed" | "recycled";
        state: Record<string, unknown>;
    }[] | undefined;
}>;
export type PRPState = z.infer<typeof PRPStateSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type ValidationGate = z.infer<typeof ValidationGateSchema>;
export type CerebrumDecision = z.infer<typeof CerebrumDecisionSchema>;
export type HumanApproval = z.infer<typeof HumanApprovalSchema>;
export type GateResult = z.infer<typeof GateResultSchema>;
export type EnforcementProfile = z.infer<typeof EnforcementProfileSchema>;
/**
 * State transition validation
 */
export declare const validateStateTransition: (fromState: PRPState, toState: PRPState) => boolean;
/**
 * Create initial PRP state
 */
export declare const createInitialPRPState: (blueprint: PRPState["blueprint"], options?: {
    id?: string;
    runId?: string;
    llmConfig?: PRPState["metadata"]["llmConfig"];
    deterministic?: boolean;
    enforcementProfile?: EnforcementProfile;
}) => PRPState;
//# sourceMappingURL=state.d.ts.map