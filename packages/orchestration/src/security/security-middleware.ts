/**
 * nO Master Agent Loop - Security Middleware Suite
 * Part of brAInwav's production-ready nO implementation
 *
 * Comprehensive security middleware for production deployment including
 * CORS, security headers, rate limiting, input validation, and audit logging
 *
 * Co-authored-by: brAInwav Development Team
 */

import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { securityMetrics } from '../monitoring/prometheus-metrics.js';

export interface SecurityConfig {
    cors: {
        enabled: boolean;
        origins: string[];
        credentials: boolean;
        maxAge?: number;
    };
    headers: {
        csp: {
            enabled: boolean;
            policy?: string;
        };
        hsts: {
            enabled: boolean;
            maxAge: number;
            includeSubDomains: boolean;
        };
        referrerPolicy: string;
    };
    rateLimiting: {
        windowMs: number;
        maxRequests: number;
        skipSuccessfulRequests: boolean;
        skipFailedRequests: boolean;
        standardHeaders: boolean;
        legacyHeaders: boolean;
    };
    inputValidation: {
        maxBodySize: string;
        sanitizeHtml: boolean;
        validateJson: boolean;
        maxDepth: number;
    };
    audit: {
        enabled: boolean;
        sensitiveFields: string[];
        maxLogSize: number;
    };
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
    cors: {
        enabled: true,
        origins: ['http://localhost:3000', 'https://*.brainwav.ai'],
        credentials: true,
        maxAge: 86400, // 24 hours
    },
    headers: {
        csp: {
            enabled: true,
            policy:
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.brainwav.ai;",
        },
        hsts: {
            enabled: true,
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
        },
        referrerPolicy: 'strict-origin-when-cross-origin',
    },
    rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // requests per window per IP
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        standardHeaders: true,
        legacyHeaders: false,
    },
    inputValidation: {
        maxBodySize: '10mb',
        sanitizeHtml: true,
        validateJson: true,
        maxDepth: 10,
    },
    audit: {
        enabled: true,
        sensitiveFields: ['password', 'token', 'apiKey', 'secret', 'authorization'],
        maxLogSize: 1000,
    },
};

/**
 * Request validation schemas
 */
export const RequestValidationSchemas = {
    health: z.object({
        query: z.object({}).optional(),
        body: z.object({}).optional(),
    }),

    admin: z.object({
        headers: z.object({
            authorization: z.string().min(1, 'Authorization header required'),
        }),
        body: z
            .object({
                reason: z.string().max(200).optional(),
            })
            .optional(),
    }),

    shutdown: z.object({
        body: z.object({
            reason: z.string().min(1).max(200, 'Reason must be under 200 characters'),
            force: z.boolean().optional(),
        }),
    }),

    healthCheck: z.object({
        params: z.object({
            name: z
                .string()
                .min(1)
                .max(50)
                .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid health check name'),
        }),
    }),
};

/**
 * Security Middleware Suite
 */
export class SecurityMiddleware {
    private config: SecurityConfig;
    private auditLog: any[] = [];
    private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

    constructor(config: Partial<SecurityConfig> = {}) {
        this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    }

    /**
     * Get security headers middleware
     */
    getSecurityHeaders() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Set basic security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('X-Powered-By', 'brAInwav nO Master Agent Loop');

            if (this.config.headers.hsts.enabled) {
                res.setHeader(
                    'Strict-Transport-Security',
                    `max-age=${this.config.headers.hsts.maxAge}${this.config.headers.hsts.includeSubDomains ? '; includeSubDomains' : ''}`,
                );
            }

            if (this.config.headers.csp.enabled && this.config.headers.csp.policy) {
                res.setHeader('Content-Security-Policy', this.config.headers.csp.policy);
            }

            res.setHeader('Referrer-Policy', this.config.headers.referrerPolicy);
            next();
        };
    }

    /**
     * Get CORS middleware
     */
    getCORS() {
        if (!this.config.cors.enabled) {
            return (_req: Request, _res: Response, next: NextFunction) => next();
        }

        return (req: Request, res: Response, next: NextFunction) => {
            const origin = req.headers.origin;

            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) {
                this.setCORSHeaders(res, '*');
                return next();
            }

            const isAllowed = this.config.cors.origins.some((allowedOrigin) => {
                if (allowedOrigin.includes('*')) {
                    const pattern = allowedOrigin.replace(/\*/g, '.*');
                    return new RegExp(pattern).test(origin);
                }
                return allowedOrigin === origin;
            });

            if (isAllowed) {
                this.setCORSHeaders(res, origin);
                next();
            } else {
                securityMetrics.corsViolations.inc({ origin });
                res.status(403).json({
                    error: 'CORS policy violation',
                    message: `Origin ${origin} not allowed`,
                    company: 'brAInwav',
                });
            }
        };
    }

    private setCORSHeaders(res: Response, origin: string): void {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

        if (this.config.cors.credentials) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }

        if (this.config.cors.maxAge) {
            res.setHeader('Access-Control-Max-Age', this.config.cors.maxAge.toString());
        }
    }

    /**
     * Get rate limiting middleware
     */
    getRateLimit() {
        return (req: Request, res: Response, next: NextFunction) => {
            const clientId = this.getClientId(req);
            const now = Date.now();

            const clientData = this.rateLimitStore.get(clientId);

            if (!clientData || now > clientData.resetTime) {
                // Reset or initialize counter
                this.rateLimitStore.set(clientId, {
                    count: 1,
                    resetTime: now + this.config.rateLimiting.windowMs,
                });
                return next();
            }

            if (clientData.count >= this.config.rateLimiting.maxRequests) {
                const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);

                securityMetrics.rateLimitHits.inc({
                    client_id: clientId,
                    endpoint: req.path,
                });

                this.logSecurityEvent({
                    type: 'rate_limit_exceeded',
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    endpoint: req.path,
                    timestamp: new Date(),
                });

                res.status(429).json({
                    error: 'Too Many Requests',
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter,
                    company: 'brAInwav',
                });
                return;
            }

            clientData.count++;
            next();
        };
    }

    private getClientId(req: Request): string {
        return req.ip || req.connection.remoteAddress || 'unknown';
    }

    /**
     * Input validation middleware factory
     */
    validateInput(schema: z.ZodSchema) {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                // Sanitize HTML content if enabled
                if (this.config.inputValidation.sanitizeHtml) {
                    req.body = this.sanitizeHtmlRecursive(req.body);
                    req.query = this.sanitizeHtmlRecursive(req.query);
                }

                // Validate request structure
                const validationData = {
                    body: req.body,
                    query: req.query,
                    params: req.params,
                    headers: req.headers,
                };

                const result = await schema.parseAsync(validationData);

                // Replace request data with validated data
                req.body = result.body || req.body;
                req.query = result.query || req.query;
                req.params = result.params || req.params;

                securityMetrics.inputValidationSuccess.inc({ endpoint: req.path });
                next();
            } catch (error) {
                securityMetrics.inputValidationFailures.inc({
                    endpoint: req.path,
                    error_type: error instanceof z.ZodError ? 'validation' : 'unknown',
                });

                this.logSecurityEvent({
                    type: 'input_validation_failed',
                    ip: req.ip,
                    endpoint: req.path,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date(),
                });

                res.status(400).json({
                    error: 'Input Validation Failed',
                    message: 'Invalid request data',
                    details: error instanceof z.ZodError ? error.errors : undefined,
                    company: 'brAInwav',
                });
            }
        };
    }

    /**
     * Security audit middleware
     */
    auditRequest() {
        return (req: Request, res: Response, next: NextFunction) => {
            if (!this.config.audit.enabled) {
                return next();
            }

            const startTime = Date.now();
            const originalSend = res.send.bind(res);
            const logSecurityEvent = this.logSecurityEvent.bind(this);

            // Capture response
            res.send = (data: any) => {
                const responseTime = Date.now() - startTime;

                // Log audit event
                logSecurityEvent({
                    type: 'request_audit',
                    method: req.method,
                    endpoint: req.path,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    statusCode: res.statusCode,
                    responseTime,
                    requestSize: JSON.stringify(req.body || {}).length,
                    responseSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
                    timestamp: new Date(),
                });

                return originalSend(data);
            };

            next();
        };
    }

    /**
     * Sanitize HTML content recursively (basic implementation)
     */
    private sanitizeHtmlRecursive(obj: any): any {
        if (typeof obj === 'string') {
            // Basic HTML sanitization - remove script tags and dangerous attributes
            return obj
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.sanitizeHtmlRecursive(item));
        }

        if (obj && typeof obj === 'object') {
            const sanitized: any = {};
            for (const key in obj) {
                if (Object.hasOwn(obj, key)) {
                    sanitized[key] = this.sanitizeHtmlRecursive(obj[key]);
                }
            }
            return sanitized;
        }

        return obj;
    }

    /**
     * Log security event
     */
    private logSecurityEvent(event: any): void {
        // Redact sensitive fields
        const redactedEvent = this.redactSensitiveData(event);

        // Add to audit log (implement proper logging system in production)
        this.auditLog.push({
            ...redactedEvent,
            id: createHash('sha256').update(JSON.stringify(redactedEvent)).digest('hex').slice(0, 16),
        });

        // Keep audit log size manageable
        if (this.auditLog.length > this.config.audit.maxLogSize) {
            this.auditLog.shift();
        }

        // Emit security metric
        securityMetrics.securityEvents.inc({ type: event.type });
    }

    /**
     * Redact sensitive data from logs
     */
    private redactSensitiveData(data: any): any {
        const redacted = JSON.parse(JSON.stringify(data));

        const redactRecursive = (obj: any): any => {
            if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    if (
                        this.config.audit.sensitiveFields.some((field) =>
                            key.toLowerCase().includes(field.toLowerCase()),
                        )
                    ) {
                        obj[key] = '[REDACTED]';
                    } else if (typeof obj[key] === 'object') {
                        redactRecursive(obj[key]);
                    }
                }
            }
            return obj;
        };

        return redactRecursive(redacted);
    }

    /**
     * Get audit log (for monitoring/admin purposes)
     */
    getAuditLog(): any[] {
        return this.auditLog.slice(); // Return copy
    }

    /**
     * Clear audit log
     */
    clearAuditLog(): void {
        this.auditLog = [];
    }
}

/**
 * Factory function to create security middleware with brAInwav defaults
 */
export function createSecurityMiddleware(config?: Partial<SecurityConfig>): SecurityMiddleware {
    return new SecurityMiddleware(config);
}

/**
 * Express middleware for brAInwav security headers
 */
export function brAInwavSecurityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
        res.setHeader('X-Powered-By', 'brAInwav nO Master Agent Loop');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        next();
    };
}
