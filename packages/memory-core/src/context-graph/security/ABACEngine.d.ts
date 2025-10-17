import type { AccessContext, AccessDecisionResult, ComplianceValidationResult, PolicyEvaluationResult, PolicyName, RiskLevel, SecurityScanInput, SecurityScanResult } from '../evidence/types.js';
export declare class ABACEngine {
    checkAccess(context: AccessContext): Promise<AccessDecisionResult>;
    evaluatePolicy(policy: PolicyName, context: AccessContext): PolicyEvaluationResult;
    getUserAttributes(context: AccessContext): Record<string, unknown>;
    validateCompliance(context: AccessContext, complianceResult?: Record<string, {
        compliant: boolean;
        riskLevel: RiskLevel;
        mitigations: string[];
    }>): ComplianceValidationResult;
    performSecurityScan(context: AccessContext, securityScan: SecurityScanInput): SecurityScanResult;
    private evaluatePolicies;
    private evaluateRolePolicy;
    private evaluateClearancePolicy;
    private evaluateDepartmentPolicy;
    private evaluateOwnershipPolicy;
    private evaluateClassificationPolicy;
    private resolveRequiredClearance;
    private composeEvidence;
    private composeReason;
    private buildMetadata;
    private buildViolationDetail;
    private calculateRisk;
    private deriveSecurityRisk;
    private describeCompliance;
    private describeSecurity;
}
