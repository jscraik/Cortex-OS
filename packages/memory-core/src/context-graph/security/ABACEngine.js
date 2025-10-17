const ROLE_PERMISSIONS = {
    developer: ['graph_slice', 'context_pack', 'model_route'],
    senior_developer: ['graph_slice', 'context_pack', 'model_route', 'admin_access'],
    qa_engineer: ['graph_slice', 'context_pack'],
    intern: ['graph_slice'],
    admin: ['graph_slice', 'context_pack', 'model_route', 'admin_access', 'system_config'],
    system: ['context_slice'],
};
// Clearance levels are now externalized to configuration for maintainability.
// If equivalence between levels is intentional, document in the config file.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const CLEARANCE_LEVELS = require('../config/clearance-levels.json');
const DEFAULT_COMPLIANCE = {
    llm01: { riskLevel: 'medium', mitigations: ['input-sanitization'] },
    llm02: { riskLevel: 'medium', mitigations: ['output-validation'] },
    llm03: { riskLevel: 'medium', mitigations: ['source-verification'] },
};
export class ABACEngine {
    async checkAccess(context) {
        const timestamp = context.timestamp ?? new Date().toISOString();
        const evaluations = this.evaluatePolicies(context);
        const policiesApplied = evaluations.map((result) => result.policy);
        const violations = evaluations.filter((result) => !result.passed);
        const allowed = violations.length === 0;
        const evidence = this.composeEvidence(evaluations);
        evidence.brainwavCompliant = true;
        if (!allowed && violations.length !== evaluations.length) {
            evidence.policyConflict = true;
        }
        const reason = this.composeReason(violations);
        const metadata = this.buildMetadata(timestamp, allowed, evaluations, violations);
        const violation = this.buildViolationDetail(context, violations);
        const riskLevel = violation?.riskLevel ?? (allowed ? 'low' : 'medium');
        const requiresEscalation = violation?.requiresEscalation ?? false;
        return {
            allowed,
            policiesApplied,
            reason,
            evidence,
            metadata,
            violation,
            riskLevel,
            requiresEscalation,
        };
    }
    evaluatePolicy(policy, context) {
        const mapper = {
            'role-based': () => this.evaluateRolePolicy(context),
            'clearance-level': () => this.evaluateClearancePolicy(context),
            'department-access': () => this.evaluateDepartmentPolicy(context),
            ownership: () => this.evaluateOwnershipPolicy(context),
            classification: () => this.evaluateClassificationPolicy(context),
        };
        const result = mapper[policy]?.();
        return (result || {
            policy,
            passed: true,
            evidence: {},
        });
    }
    getUserAttributes(context) {
        return {
            id: context.user.id,
            role: context.user.role,
            permissions: context.user.permissions ?? [],
            department: context.user.department ?? 'unknown',
            clearanceLevel: context.user.clearanceLevel ?? 0,
        };
    }
    validateCompliance(context, complianceResult = {}) {
        const checks = context.complianceChecks ?? Object.keys({ ...DEFAULT_COMPLIANCE, ...complianceResult });
        const summary = {};
        for (const check of checks) {
            const provided = complianceResult[check];
            const defaults = DEFAULT_COMPLIANCE[check] ?? {
                riskLevel: 'medium',
                mitigations: [],
            };
            const detail = provided ?? {
                compliant: false,
                riskLevel: defaults.riskLevel,
                mitigations: defaults.mitigations,
            };
            summary[check] = {
                compliant: detail.compliant,
                riskLevel: detail.riskLevel,
                mitigations: detail.mitigations,
                summary: this.describeCompliance(check, detail.compliant, detail.riskLevel),
            };
        }
        const compliant = Object.values(summary).every((check) => check.compliant);
        return {
            compliant,
            owaspLLMTop10: summary,
            brainwavComplianceValidated: true,
            metadata: {
                requestId: context.requestId,
                evaluatedAt: new Date().toISOString(),
            },
        };
    }
    performSecurityScan(context, securityScan) {
        const flags = new Set(securityScan.brainwavSecurityFlags ?? []);
        if (securityScan.sqlInjectionRisk === 'high') {
            flags.add('sql-pattern');
        }
        if (securityScan.sqlInjectionRisk === 'medium') {
            flags.add('sql-suspect');
        }
        if (securityScan.piiDetected) {
            flags.add('pii-pattern');
        }
        if (securityScan.exfiltrationRisk === 'high') {
            flags.add('exfiltration-risk');
        }
        const riskLevel = this.deriveSecurityRisk(securityScan);
        const blocked = flags.size > 0;
        const requiresHumanReview = blocked && (riskLevel === 'high' || flags.has('sql-pattern'));
        return {
            blocked,
            securityFlags: Array.from(flags),
            riskLevel,
            requiresHumanReview,
            brainwavSecurityBlocked: blocked,
            summary: this.describeSecurity(context, Array.from(flags), riskLevel),
        };
    }
    evaluatePolicies(context) {
        const policies = [];
        const evaluators = [
            this.evaluateRolePolicy(context),
            this.evaluateClearancePolicy(context),
            this.evaluateDepartmentPolicy(context),
            this.evaluateOwnershipPolicy(context),
            this.evaluateClassificationPolicy(context),
        ];
        for (const evaluation of evaluators) {
            if (evaluation) {
                policies.push(evaluation);
            }
        }
        return policies;
    }
    evaluateRolePolicy(context) {
        const requiredRoles = context.resource.requiredRoles;
        const permitted = ROLE_PERMISSIONS[context.user.role] ?? [];
        const roleMatch = requiredRoles
            ? requiredRoles.includes(context.user.role)
            : permitted.includes(context.resource.type);
        return {
            policy: 'role-based',
            passed: roleMatch,
            reason: roleMatch ? undefined : 'Role not authorized for resource type',
            evidence: {
                userRole: context.user.role,
                requiredRoles: requiredRoles ?? permitted,
                roleMatch,
            },
        };
    }
    evaluateClearancePolicy(context) {
        const required = this.resolveRequiredClearance(context);
        const userClearance = context.user.clearanceLevel ?? 0;
        const clearanceSufficient = userClearance >= required;
        return {
            policy: 'clearance-level',
            passed: clearanceSufficient,
            reason: clearanceSufficient ? undefined : 'Insufficient clearance level',
            evidence: {
                userClearance,
                requiredClearance: required,
                clearanceSufficient,
            },
        };
    }
    evaluateDepartmentPolicy(context) {
        if (!context.user.department && !context.resource.owner) {
            return undefined;
        }
        const departmentAuthorized = context.user.department === 'engineering' ||
            context.user.department === context.resource.owner ||
            context.resource.owner === 'shared';
        return {
            policy: 'department-access',
            passed: departmentAuthorized,
            reason: departmentAuthorized ? undefined : 'Department not authorized for resource owner',
            evidence: {
                userDepartment: context.user.department,
                resourceOwner: context.resource.owner,
                departmentAuthorized,
            },
        };
    }
    evaluateOwnershipPolicy(context) {
        if (!context.resource.owner) {
            return undefined;
        }
        const ownershipAuthorized = context.resource.owner === 'shared' || context.resource.owner === context.user.id;
        return {
            policy: 'ownership',
            passed: ownershipAuthorized,
            reason: ownershipAuthorized ? undefined : 'Ownership policy denied access',
            evidence: {
                ownershipAuthorized,
                resourceOwner: context.resource.owner,
            },
        };
    }
    evaluateClassificationPolicy(context) {
        if (!context.resource.classification) {
            return undefined;
        }
        const allowedClassifications = ['internal', 'public'];
        const classificationAllowed = allowedClassifications.includes(context.resource.classification);
        return {
            policy: 'classification',
            passed: classificationAllowed,
            reason: classificationAllowed ? undefined : 'Classification level restricted',
            evidence: {
                classification: context.resource.classification,
                classificationAllowed,
            },
        };
    }
    resolveRequiredClearance(context) {
        if (context.resource.requiredClearance) {
            return context.resource.requiredClearance;
        }
        if (context.resource.sensitivity) {
            return CLEARANCE_LEVELS[context.resource.sensitivity] ?? 1;
        }
        return 1;
    }
    composeEvidence(evaluations) {
        return evaluations.reduce((accumulator, evaluation) => {
            return { ...accumulator, ...evaluation.evidence };
        }, {});
    }
    composeReason(violations) {
        if (violations.length === 0) {
            return undefined;
        }
        return violations
            .map((violation) => violation.reason)
            .filter((reason) => Boolean(reason))
            .join('; ');
    }
    buildMetadata(timestamp, allowed, evaluations, violations) {
        const hasConflict = !allowed && violations.length !== evaluations.length;
        const metadata = {
            brainwavValidated: true,
            evaluationTimestamp: timestamp,
        };
        if (hasConflict) {
            metadata.conflictResolution = 'deny-by-default';
        }
        if (!allowed) {
            metadata.additionalNotes = 'Access denied by ABAC engine';
        }
        return metadata;
    }
    buildViolationDetail(context, violations) {
        if (violations.length === 0) {
            return undefined;
        }
        const [primary] = violations;
        const riskLevel = this.calculateRisk(primary.policy);
        const requiresEscalation = primary.policy === 'clearance-level' &&
            (context.user.clearanceLevel ?? 0) < this.resolveRequiredClearance(context);
        return {
            type: primary.policy,
            details: primary.reason ?? 'Policy violation detected',
            riskLevel,
            requiresEscalation,
        };
    }
    calculateRisk(policy) {
        if (policy === 'clearance-level' || policy === 'classification') {
            return 'high';
        }
        if (policy === 'ownership') {
            return 'medium';
        }
        return 'medium';
    }
    deriveSecurityRisk(scan) {
        if (scan.sqlInjectionRisk === 'high' || scan.exfiltrationRisk === 'high') {
            return 'high';
        }
        if (scan.piiDetected || scan.sqlInjectionRisk === 'medium') {
            return 'medium';
        }
        return 'low';
    }
    describeCompliance(check, compliant, riskLevel) {
        if (compliant) {
            return `OWASP ${check} check compliant with ${riskLevel} residual risk`;
        }
        return `OWASP ${check} violation detected (risk: ${riskLevel})`;
    }
    describeSecurity(context, flags, riskLevel) {
        const base = `Security scan for ${context.resource.id} assessed at ${riskLevel} risk`;
        if (flags.length === 0) {
            return `${base}; no actionable flags`;
        }
        return `${base}; flags: ${flags.join(', ')}`;
    }
}
