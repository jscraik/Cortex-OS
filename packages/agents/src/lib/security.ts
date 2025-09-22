/**
 * Security Module - Input Sanitization and Log Redaction
 * Following TDD plan requirements for security vulnerability fixes
 */

import { z } from 'zod';
import { AgentError, ErrorCategory, ErrorSeverity } from './error-handling.js';

// Regular expressions for sensitive data detection
const SENSITIVE_PATTERNS = {
    API_KEY: /(?:api[_-]?key|apikey)[:\s=]["']?([a-z0-9]{8,})/gi,
    PASSWORD: /(?:password|passwd|pwd)[:\s=]["']?([^\s"',;]{8,})/gi,
    TOKEN: /(?:token|auth)[:\s=]["']?([a-z0-9+/]{20,})/gi,
    SECRET: /(?:secret|private)[:\s=]["']?([a-z0-9+/]{16,})/gi,
    BEARER: /bearer\s+([a-z0-9+/]{20,})/gi,
    BASIC_AUTH: /basic\s+([a-z0-9+/=]{16,})/gi,
    SSH_KEY: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/gi,
    DATABASE_URL: /(?:postgres|mysql|mongodb):\/\/[^\s"']+/gi,
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    PHONE: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/gi,
    SSN: /\b\d{3}-?\d{2}-?\d{4}\b/gi,
    CREDIT_CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/gi,
};

// XSS and injection patterns
const XSS_PATTERNS = {
    SCRIPT_TAG: /<script[^>]*>.*?<\/script>/gi,
    JAVASCRIPT_PROTOCOL: /javascript:/gi,
    ON_EVENT: /on\w+\s*=/gi,
    DATA_URL: /data:[^;]*;base64/gi,
    STYLE_EXPRESSION: /expression\s*\(/gi,
    VBSCRIPT: /vbscript:/gi,
    OBJECT_EMBED: /<(object|embed|applet|iframe)[^>]*>/gi,
    META_REFRESH: /<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi,
};

// SQL injection patterns
const SQL_INJECTION_PATTERNS = {
    UNION_SELECT: /union\s+select/gi,
    OR_1_EQUALS_1: /or\s+1\s*=\s*1/gi,
    DROP_TABLE: /drop\s+table/gi,
    DELETE_FROM: /delete\s+from/gi,
    INSERT_INTO: /insert\s+into/gi,
    UPDATE_SET: /update\s+.+\s+set/gi,
    EXEC_SP: /exec\s*\(/gi,
    SINGLE_QUOTE_COMMENT: /'\s*--/gi,
    SEMICOLON_COMMENT: /;\s*--/gi,
};

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = {
    PIPE: /[|&;`]/g,
    BACKTICK: /`[^`]*`/g,
    DOLLAR_PAREN: /\$\([^)]*\)/g,
    REDIRECT: /[<>]/g,
};

/**
 * Input sanitization configuration
 */
export interface SanitizationConfig {
    enableXSSProtection: boolean;
    enableSQLInjectionProtection: boolean;
    enableCommandInjectionProtection: boolean;
    enableSensitiveDataRedaction: boolean;
    maxInputLength: number;
    allowedTags: string[];
    allowedAttributes: string[];
    customPatterns?: RegExp[];
}

/**
 * Default sanitization configuration
 */
export const DEFAULT_SANITIZATION_CONFIG: SanitizationConfig = {
    enableXSSProtection: true,
    enableSQLInjectionProtection: true,
    enableCommandInjectionProtection: true,
    enableSensitiveDataRedaction: true,
    maxInputLength: 10000,
    allowedTags: ['b', 'i', 'em', 'strong', 'code', 'pre'],
    allowedAttributes: ['class', 'id'],
    customPatterns: [],
};

/**
 * Sanitization result
 */
export interface SanitizationResult {
    sanitized: string;
    blocked: boolean;
    violations: string[];
    originalLength: number;
    sanitizedLength: number;
    redactedFields?: string[];
}

/**
 * Input sanitizer class
 */
export class InputSanitizer {
    private config: SanitizationConfig;

    constructor(config: Partial<SanitizationConfig> = {}) {
        this.config = { ...DEFAULT_SANITIZATION_CONFIG, ...config };
    }

    /**
     * Sanitize string input
     */
    sanitizeString(input: string): SanitizationResult {
        if (typeof input !== 'string') {
            throw new AgentError(
                'Input must be a string',
                ErrorCategory.VALIDATION,
                ErrorSeverity.MEDIUM
            );
        }

        const result: SanitizationResult = {
            sanitized: input,
            blocked: false,
            violations: [],
            originalLength: input.length,
            sanitizedLength: 0,
        };

        // Check length limit
        if (input.length > this.config.maxInputLength) {
            result.violations.push(`Input exceeds maximum length: ${this.config.maxInputLength}`);
            result.sanitized = input.substring(0, this.config.maxInputLength);
        }

        // XSS protection
        if (this.config.enableXSSProtection) {
            const xssResult = this.detectAndRemoveXSS(result.sanitized);
            result.sanitized = xssResult.sanitized;
            result.violations.push(...xssResult.violations);
        }

        // SQL injection protection
        if (this.config.enableSQLInjectionProtection) {
            const sqlResult = this.detectSQLInjection(result.sanitized);
            if (sqlResult.detected) {
                result.violations.push(...sqlResult.violations);
                result.blocked = true;
            }
        }

        // Command injection protection
        if (this.config.enableCommandInjectionProtection) {
            const cmdResult = this.detectCommandInjection(result.sanitized);
            if (cmdResult.detected) {
                result.violations.push(...cmdResult.violations);
                result.blocked = true;
            }
        }

        // Custom pattern checking
        if (this.config.customPatterns) {
            for (const pattern of this.config.customPatterns) {
                if (pattern.test(result.sanitized)) {
                    result.violations.push(`Custom pattern violation: ${pattern.source}`);
                }
            }
        }

        result.sanitizedLength = result.sanitized.length;

        // Block if violations found AND if any protection is enabled
        if (result.violations.length > 0 &&
            (this.config.enableXSSProtection || this.config.enableSQLInjectionProtection || this.config.enableCommandInjectionProtection)) {
            result.blocked = true;
        }

        return result;
    }

    /**
     * Sanitize object input
     */
    sanitizeObject(input: Record<string, unknown>): {
        sanitized: Record<string, unknown>;
        violations: string[];
        redactedFields: string[];
    } {
        const result = {
            sanitized: {} as Record<string, unknown>,
            violations: [] as string[],
            redactedFields: [] as string[],
        };

        for (const [key, value] of Object.entries(input)) {
            if (typeof value === 'string') {
                const sanitized = this.sanitizeString(value);
                result.sanitized[key] = sanitized.sanitized;
                result.violations.push(...sanitized.violations.map(v => `${key}: ${v}`));
            } else if (typeof value === 'object' && value !== null) {
                const nestedResult = this.sanitizeObject(value as Record<string, unknown>);
                result.sanitized[key] = nestedResult.sanitized;
                result.violations.push(...nestedResult.violations);
                result.redactedFields.push(...nestedResult.redactedFields.map(f => `${key}.${f}`));
            } else {
                result.sanitized[key] = value;
            }
        }

        return result;
    }

    /**
     * Detect and remove XSS attempts
     */
    private detectAndRemoveXSS(input: string): { sanitized: string; violations: string[] } {
        let sanitized = input;
        const violations: string[] = [];

        for (const [name, pattern] of Object.entries(XSS_PATTERNS)) {
            if (pattern.test(sanitized)) {
                violations.push(`XSS attempt detected: ${name}`);
                sanitized = sanitized.replace(pattern, '[REMOVED_XSS]');
            }
        }

        // HTML entity encoding for remaining special characters
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');

        return { sanitized, violations };
    }

    /**
     * Detect SQL injection attempts
     */
    private detectSQLInjection(input: string): { detected: boolean; violations: string[] } {
        const violations: string[] = [];

        for (const [name, pattern] of Object.entries(SQL_INJECTION_PATTERNS)) {
            if (pattern.test(input)) {
                violations.push(`SQL injection attempt detected: ${name}`);
            }
        }

        return { detected: violations.length > 0, violations };
    }

    /**
     * Detect command injection attempts
     */
    private detectCommandInjection(input: string): { detected: boolean; violations: string[] } {
        const violations: string[] = [];

        for (const [name, pattern] of Object.entries(COMMAND_INJECTION_PATTERNS)) {
            if (pattern.test(input)) {
                violations.push(`Command injection attempt detected: ${name}`);
            }
        }

        return { detected: violations.length > 0, violations };
    }
}

/**
 * Log redaction utility
 */
export class LogRedactor {
    /**
     * Redact sensitive data from logs (handle arrays)
     */
    static redactSensitiveData(data: unknown): unknown {
        if (typeof data === 'string') {
            return LogRedactor.redactString(data);
        }

        if (Array.isArray(data)) {
            return data.map(item => LogRedactor.redactSensitiveData(item));
        }

        if (typeof data === 'object' && data !== null) {
            return LogRedactor.redactObject(data as Record<string, unknown>);
        }

        return data;
    }

    /**
     * Redact sensitive patterns from string
     */
    private static redactString(input: string): string {
        let redacted = input;

        for (const [, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
            redacted = redacted.replace(pattern, (match, sensitive) => {
                const replacement = '[REDACTED]';
                return match.replace(sensitive, replacement);
            });
        }

        return redacted;
    }

    /**
     * Redact sensitive fields from object
     */
    private static redactObject(obj: Record<string, unknown>): Record<string, unknown> {
        const redacted: Record<string, unknown> = {};
        const sensitiveKeys = [
            'password', 'passwd', 'pwd', 'secret', 'token', 'api_key', 'apikey',
            'private_key', 'privatekey', 'auth', 'authorization', 'credential',
            'ssn', 'social_security_number', 'credit_card', 'creditcard'
        ];

        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();

            if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
                redacted[key] = '[REDACTED]';
            } else if (typeof value === 'string') {
                redacted[key] = LogRedactor.redactString(value);
            } else if (typeof value === 'object' && value !== null) {
                redacted[key] = LogRedactor.redactObject(value as Record<string, unknown>);
            } else {
                redacted[key] = value;
            }
        }

        return redacted;
    }
}

/**
 * Security middleware for HTTP requests
 */
export function createSecurityMiddleware(config?: Partial<SanitizationConfig>) {
    const sanitizer = new InputSanitizer(config);

    return {
        /**
         * Sanitize request body
         */
        sanitizeBody: (body: unknown) => {
            if (typeof body === 'string') {
                return sanitizer.sanitizeString(body);
            }

            if (typeof body === 'object' && body !== null) {
                return sanitizer.sanitizeObject(body as Record<string, unknown>);
            }

            return { sanitized: body, violations: [], redactedFields: [] };
        },

        /**
         * Validate and sanitize query parameters
         */
        sanitizeQuery: (query: Record<string, unknown>) => {
            return sanitizer.sanitizeObject(query);
        },

        /**
         * Redact sensitive data for logging
         */
        redactForLogging: (data: unknown) => {
            return LogRedactor.redactSensitiveData(data);
        },
    };
}

/**
 * Validation schemas for security
 */
export const SecuritySchemas = {
    SafeString: z.string().max(10000).refine(
        (val) => {
            const sanitizer = new InputSanitizer();
            const result = sanitizer.sanitizeString(val);
            return !result.blocked;
        },
        { message: 'String contains unsafe content' }
    ),

    SafeObject: z.record(z.unknown()).refine(
        (val) => {
            const sanitizer = new InputSanitizer();
            const result = sanitizer.sanitizeObject(val);
            return result.violations.length === 0;
        },
        { message: 'Object contains unsafe content' }
    ),
};

/**
 * Export main security utilities
 */
export {
    COMMAND_INJECTION_PATTERNS, SENSITIVE_PATTERNS, SQL_INJECTION_PATTERNS, XSS_PATTERNS
};

