/**
 * Security Event Contracts for A2A Communication
 * Contract-first definitions for Security package events
 */
import { z } from 'zod';
export declare const SecurityEventTypes: {
    readonly ScanCompleted: "security.scan.completed";
    readonly ThreatDetected: "security.threat.detected";
    readonly CertificateExpiring: "security.certificate.expiring";
    readonly CertificateValidated: "security.certificate.validated";
    readonly AccessGranted: "security.access.granted";
    readonly AccessDenied: "security.access.denied";
    readonly AuditCompleted: "security.audit.completed";
    readonly PolicyViolation: "security.policy.violation";
};
export declare const securityScanCompletedSchema: z.ZodObject<{
    scanId: z.ZodString;
    target: z.ZodString;
    scanType: z.ZodEnum<["vulnerability", "compliance", "secrets", "all"]>;
    findings: z.ZodObject<{
        vulnerabilities: z.ZodNumber;
        warnings: z.ZodNumber;
        info: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        info: number;
        warnings: number;
        vulnerabilities: number;
    }, {
        info: number;
        warnings: number;
        vulnerabilities: number;
    }>;
    duration: z.ZodNumber;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    duration: number;
    scanId: string;
    target: string;
    scanType: "vulnerability" | "compliance" | "secrets" | "all";
    findings: {
        info: number;
        warnings: number;
        vulnerabilities: number;
    };
}, {
    timestamp: string;
    duration: number;
    scanId: string;
    target: string;
    scanType: "vulnerability" | "compliance" | "secrets" | "all";
    findings: {
        info: number;
        warnings: number;
        vulnerabilities: number;
    };
}>;
export declare const securityThreatDetectedSchema: z.ZodObject<{
    threatId: z.ZodString;
    type: z.ZodEnum<["malware", "intrusion", "data-breach", "unauthorized-access"]>;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    source: z.ZodString;
    description: z.ZodString;
    mitigated: z.ZodDefault<z.ZodBoolean>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "malware" | "intrusion" | "data-breach" | "unauthorized-access";
    timestamp: string;
    severity: "low" | "medium" | "high" | "critical";
    source: string;
    threatId: string;
    description: string;
    mitigated: boolean;
}, {
    type: "malware" | "intrusion" | "data-breach" | "unauthorized-access";
    timestamp: string;
    severity: "low" | "medium" | "high" | "critical";
    source: string;
    threatId: string;
    description: string;
    mitigated?: boolean | undefined;
}>;
export declare const securityCertificateExpiringSchema: z.ZodObject<{
    certificateId: z.ZodString;
    subject: z.ZodString;
    issuer: z.ZodString;
    expiresAt: z.ZodString;
    daysUntilExpiry: z.ZodNumber;
    purpose: z.ZodOptional<z.ZodEnum<["client", "server", "code-signing"]>>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    certificateId: string;
    subject: string;
    issuer: string;
    expiresAt: string;
    daysUntilExpiry: number;
    purpose?: "client" | "server" | "code-signing" | undefined;
}, {
    timestamp: string;
    certificateId: string;
    subject: string;
    issuer: string;
    expiresAt: string;
    daysUntilExpiry: number;
    purpose?: "client" | "server" | "code-signing" | undefined;
}>;
export declare const securityCertificateValidatedSchema: z.ZodObject<{
    certificateId: z.ZodString;
    valid: z.ZodBoolean;
    subject: z.ZodString;
    issuer: z.ZodString;
    purpose: z.ZodOptional<z.ZodEnum<["client", "server", "code-signing"]>>;
    validationErrors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    valid: boolean;
    timestamp: string;
    certificateId: string;
    subject: string;
    issuer: string;
    purpose?: "client" | "server" | "code-signing" | undefined;
    validationErrors?: string[] | undefined;
}, {
    valid: boolean;
    timestamp: string;
    certificateId: string;
    subject: string;
    issuer: string;
    purpose?: "client" | "server" | "code-signing" | undefined;
    validationErrors?: string[] | undefined;
}>;
export declare const securityAccessGrantedSchema: z.ZodObject<{
    sessionId: z.ZodString;
    userId: z.ZodString;
    resource: z.ZodString;
    permissions: z.ZodArray<z.ZodString, "many">;
    method: z.ZodEnum<["certificate", "token", "key", "spiffe"]>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    sessionId: string;
    method: "certificate" | "token" | "key" | "spiffe";
    userId: string;
    resource: string;
    permissions: string[];
}, {
    timestamp: string;
    sessionId: string;
    method: "certificate" | "token" | "key" | "spiffe";
    userId: string;
    resource: string;
    permissions: string[];
}>;
export declare const securityAccessDeniedSchema: z.ZodObject<{
    attemptId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    resource: z.ZodString;
    reason: z.ZodString;
    method: z.ZodEnum<["certificate", "token", "key", "spiffe"]>;
    sourceIp: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    method: "certificate" | "token" | "key" | "spiffe";
    reason: string;
    resource: string;
    attemptId: string;
    userId?: string | undefined;
    sourceIp?: string | undefined;
}, {
    timestamp: string;
    method: "certificate" | "token" | "key" | "spiffe";
    reason: string;
    resource: string;
    attemptId: string;
    userId?: string | undefined;
    sourceIp?: string | undefined;
}>;
export declare const securityAuditCompletedSchema: z.ZodObject<{
    auditId: z.ZodString;
    resourceId: z.ZodString;
    auditType: z.ZodEnum<["access", "permission", "activity"]>;
    timeRange: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    summary: z.ZodObject<{
        totalEvents: z.ZodNumber;
        successfulAccess: z.ZodNumber;
        failedAccess: z.ZodNumber;
        suspiciousActivity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalEvents: number;
        successfulAccess: number;
        failedAccess: number;
        suspiciousActivity: number;
    }, {
        totalEvents: number;
        successfulAccess: number;
        failedAccess: number;
        suspiciousActivity: number;
    }>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    summary: {
        totalEvents: number;
        successfulAccess: number;
        failedAccess: number;
        suspiciousActivity: number;
    };
    auditId: string;
    resourceId: string;
    auditType: "access" | "permission" | "activity";
    timeRange: {
        start: string;
        end: string;
    };
}, {
    timestamp: string;
    summary: {
        totalEvents: number;
        successfulAccess: number;
        failedAccess: number;
        suspiciousActivity: number;
    };
    auditId: string;
    resourceId: string;
    auditType: "access" | "permission" | "activity";
    timeRange: {
        start: string;
        end: string;
    };
}>;
export declare const securityPolicyViolationSchema: z.ZodObject<{
    violationId: z.ZodString;
    policyId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    resource: z.ZodOptional<z.ZodString>;
    action: z.ZodString;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    description: z.ZodString;
    remediated: z.ZodDefault<z.ZodBoolean>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    action: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    violationId: string;
    policyId: string;
    remediated: boolean;
    userId?: string | undefined;
    resource?: string | undefined;
}, {
    timestamp: string;
    action: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    violationId: string;
    policyId: string;
    userId?: string | undefined;
    resource?: string | undefined;
    remediated?: boolean | undefined;
}>;
export type SecurityScanCompletedEvent = z.infer<typeof securityScanCompletedSchema>;
export type SecurityThreatDetectedEvent = z.infer<typeof securityThreatDetectedSchema>;
export type SecurityCertificateExpiringEvent = z.infer<typeof securityCertificateExpiringSchema>;
export type SecurityCertificateValidatedEvent = z.infer<typeof securityCertificateValidatedSchema>;
export type SecurityAccessGrantedEvent = z.infer<typeof securityAccessGrantedSchema>;
export type SecurityAccessDeniedEvent = z.infer<typeof securityAccessDeniedSchema>;
export type SecurityAuditCompletedEvent = z.infer<typeof securityAuditCompletedSchema>;
export type SecurityPolicyViolationEvent = z.infer<typeof securityPolicyViolationSchema>;
export declare const SecurityEventSchemas: {
    readonly "security.scan.completed": z.ZodObject<{
        scanId: z.ZodString;
        target: z.ZodString;
        scanType: z.ZodEnum<["vulnerability", "compliance", "secrets", "all"]>;
        findings: z.ZodObject<{
            vulnerabilities: z.ZodNumber;
            warnings: z.ZodNumber;
            info: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            info: number;
            warnings: number;
            vulnerabilities: number;
        }, {
            info: number;
            warnings: number;
            vulnerabilities: number;
        }>;
        duration: z.ZodNumber;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        duration: number;
        scanId: string;
        target: string;
        scanType: "vulnerability" | "compliance" | "secrets" | "all";
        findings: {
            info: number;
            warnings: number;
            vulnerabilities: number;
        };
    }, {
        timestamp: string;
        duration: number;
        scanId: string;
        target: string;
        scanType: "vulnerability" | "compliance" | "secrets" | "all";
        findings: {
            info: number;
            warnings: number;
            vulnerabilities: number;
        };
    }>;
    readonly "security.threat.detected": z.ZodObject<{
        threatId: z.ZodString;
        type: z.ZodEnum<["malware", "intrusion", "data-breach", "unauthorized-access"]>;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
        source: z.ZodString;
        description: z.ZodString;
        mitigated: z.ZodDefault<z.ZodBoolean>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "malware" | "intrusion" | "data-breach" | "unauthorized-access";
        timestamp: string;
        severity: "low" | "medium" | "high" | "critical";
        source: string;
        threatId: string;
        description: string;
        mitigated: boolean;
    }, {
        type: "malware" | "intrusion" | "data-breach" | "unauthorized-access";
        timestamp: string;
        severity: "low" | "medium" | "high" | "critical";
        source: string;
        threatId: string;
        description: string;
        mitigated?: boolean | undefined;
    }>;
    readonly "security.certificate.expiring": z.ZodObject<{
        certificateId: z.ZodString;
        subject: z.ZodString;
        issuer: z.ZodString;
        expiresAt: z.ZodString;
        daysUntilExpiry: z.ZodNumber;
        purpose: z.ZodOptional<z.ZodEnum<["client", "server", "code-signing"]>>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        certificateId: string;
        subject: string;
        issuer: string;
        expiresAt: string;
        daysUntilExpiry: number;
        purpose?: "client" | "server" | "code-signing" | undefined;
    }, {
        timestamp: string;
        certificateId: string;
        subject: string;
        issuer: string;
        expiresAt: string;
        daysUntilExpiry: number;
        purpose?: "client" | "server" | "code-signing" | undefined;
    }>;
    readonly "security.certificate.validated": z.ZodObject<{
        certificateId: z.ZodString;
        valid: z.ZodBoolean;
        subject: z.ZodString;
        issuer: z.ZodString;
        purpose: z.ZodOptional<z.ZodEnum<["client", "server", "code-signing"]>>;
        validationErrors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        valid: boolean;
        timestamp: string;
        certificateId: string;
        subject: string;
        issuer: string;
        purpose?: "client" | "server" | "code-signing" | undefined;
        validationErrors?: string[] | undefined;
    }, {
        valid: boolean;
        timestamp: string;
        certificateId: string;
        subject: string;
        issuer: string;
        purpose?: "client" | "server" | "code-signing" | undefined;
        validationErrors?: string[] | undefined;
    }>;
    readonly "security.access.granted": z.ZodObject<{
        sessionId: z.ZodString;
        userId: z.ZodString;
        resource: z.ZodString;
        permissions: z.ZodArray<z.ZodString, "many">;
        method: z.ZodEnum<["certificate", "token", "key", "spiffe"]>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        sessionId: string;
        method: "certificate" | "token" | "key" | "spiffe";
        userId: string;
        resource: string;
        permissions: string[];
    }, {
        timestamp: string;
        sessionId: string;
        method: "certificate" | "token" | "key" | "spiffe";
        userId: string;
        resource: string;
        permissions: string[];
    }>;
    readonly "security.access.denied": z.ZodObject<{
        attemptId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        resource: z.ZodString;
        reason: z.ZodString;
        method: z.ZodEnum<["certificate", "token", "key", "spiffe"]>;
        sourceIp: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        method: "certificate" | "token" | "key" | "spiffe";
        reason: string;
        resource: string;
        attemptId: string;
        userId?: string | undefined;
        sourceIp?: string | undefined;
    }, {
        timestamp: string;
        method: "certificate" | "token" | "key" | "spiffe";
        reason: string;
        resource: string;
        attemptId: string;
        userId?: string | undefined;
        sourceIp?: string | undefined;
    }>;
    readonly "security.audit.completed": z.ZodObject<{
        auditId: z.ZodString;
        resourceId: z.ZodString;
        auditType: z.ZodEnum<["access", "permission", "activity"]>;
        timeRange: z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>;
        summary: z.ZodObject<{
            totalEvents: z.ZodNumber;
            successfulAccess: z.ZodNumber;
            failedAccess: z.ZodNumber;
            suspiciousActivity: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            totalEvents: number;
            successfulAccess: number;
            failedAccess: number;
            suspiciousActivity: number;
        }, {
            totalEvents: number;
            successfulAccess: number;
            failedAccess: number;
            suspiciousActivity: number;
        }>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        summary: {
            totalEvents: number;
            successfulAccess: number;
            failedAccess: number;
            suspiciousActivity: number;
        };
        auditId: string;
        resourceId: string;
        auditType: "access" | "permission" | "activity";
        timeRange: {
            start: string;
            end: string;
        };
    }, {
        timestamp: string;
        summary: {
            totalEvents: number;
            successfulAccess: number;
            failedAccess: number;
            suspiciousActivity: number;
        };
        auditId: string;
        resourceId: string;
        auditType: "access" | "permission" | "activity";
        timeRange: {
            start: string;
            end: string;
        };
    }>;
    readonly "security.policy.violation": z.ZodObject<{
        violationId: z.ZodString;
        policyId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        resource: z.ZodOptional<z.ZodString>;
        action: z.ZodString;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
        description: z.ZodString;
        remediated: z.ZodDefault<z.ZodBoolean>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        action: string;
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        violationId: string;
        policyId: string;
        remediated: boolean;
        userId?: string | undefined;
        resource?: string | undefined;
    }, {
        timestamp: string;
        action: string;
        severity: "low" | "medium" | "high" | "critical";
        description: string;
        violationId: string;
        policyId: string;
        userId?: string | undefined;
        resource?: string | undefined;
        remediated?: boolean | undefined;
    }>;
};
//# sourceMappingURL=security-events.d.ts.map