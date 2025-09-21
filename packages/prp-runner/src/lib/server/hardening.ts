import compression from 'compression';
import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';

export interface HardeningOptions {
    jsonLimit?: string;
}

interface RequestWithDanger extends Request {
    _dangerousPayload?: boolean;
}

// Very small sanitization: reject body containing dangerous keys like __proto__ or constructor
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isDangerousKeyName(name: string): boolean {
    return DANGEROUS_KEYS.has(name);
}

function containsScriptString(values: unknown[]): boolean {
    for (const v of values) {
        if (typeof v === 'string' && /<\s*script/i.test(v)) return true;
    }
    return false;
}

function hasDangerousKeys(obj: unknown): boolean {
    // Arrays: check elements
    if (Array.isArray(obj)) return obj.some((item) => hasDangerousKeys(item));
    // Non-objects are safe
    if (obj === null || typeof obj !== 'object') return false;
    // Prototype deviation suggests pollution attempt
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) return true;
    // Only plain objects proceed further
    if (!isPlainObject(obj)) return false;
    const rec: Record<string, unknown> = obj;
    // Direct key checks on own properties only and by name
    for (const k of Object.keys(rec)) {
        if (Object.hasOwn(rec, k) && isDangerousKeyName(k)) return true;
    }
    // Simple pattern-based content check for obvious script tags
    if (containsScriptString(Object.values(rec))) return true;
    // Recurse
    for (const key of Object.keys(rec)) {
        if (hasDangerousKeys(rec[key])) return true;
    }
    return false;
}

export function applyServerHardening(app: Express, opts: HardeningOptions = {}): void {
    const { jsonLimit = '100kb' } = opts;

    // Disable x-powered-by
    app.disable('x-powered-by');

    // CORS - allow only configured origins
    const allowed = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const corsOptions: cors.CorsOptions = {
        origin: (
            origin: string | undefined,
            callback: (err: Error | null, allow?: boolean) => void,
        ) => {
            if (!origin) return callback(null, false);
            if (allowed.includes(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'x-request-id'],
        maxAge: 600,
    };
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    // Compression early
    app.use(compression({ threshold: 0 }));

    // Security headers (after CORS)
    app.use(helmet());

    // Request ID middleware
    app.use((req: Request, res: Response, next: NextFunction): void => {
        const existing = req.header('x-request-id');
        const id = existing && existing.trim() !== '' ? existing : randomUUID();
        res.setHeader('x-request-id', id);
        next();
    });

    // JSON parser with limit + raw payload verify hook to flag dangerous keys pre-parse
    app.use(
        express.json({
            limit: jsonLimit,
            verify: (req, _res, buf) => {
                try {
                    const raw = buf.toString('utf8');
                    if (
                        raw.includes('__proto__') ||
                        raw.includes('constructor') ||
                        raw.includes('prototype')
                    ) {
                        (req as RequestWithDanger)._dangerousPayload = true;
                        throw new Error('Invalid input: dangerous keys present');
                    }
                } catch {
                    /* noop */
                }
            },
        }),
    );

    // Simple input sanitization gate
    app.use((req: Request, res: Response, next: NextFunction): void => {
        const body = req.body;
        if ((req as RequestWithDanger)._dangerousPayload || hasDangerousKeys(body)) {
            res.status(400).json({ error: 'Invalid input: dangerous keys present' });
            return;
        }
        next();
    });

    // Global error handler to ensure body parser/sanitization errors return 400 JSON
    // Must be registered after JSON parser and sanitization checks
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
        // body-parser emits 'entity.too.large'
        const msg = err instanceof Error ? err.message : String(err);
        if (/entity too large|request entity too large/i.test(msg)) {
            res.status(413).json({ error: 'Payload too large' });
            return;
        }
        if (/prototype|__proto__|constructor/i.test(msg)) {
            res.status(400).json({ error: 'Invalid input: dangerous keys present' });
            return;
        }
        // Fallback: pass through
        res.status(400).json({ error: 'Bad request' });
    });
}
