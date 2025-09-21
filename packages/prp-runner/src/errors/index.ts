export type ErrorCode =
    | 'VALIDATION_ERROR'
    | 'AUTH_ERROR'
    | 'RATE_LIMITED'
    | 'SERVICE_UNAVAILABLE'
    | 'INTERNAL_ERROR';

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    constructor(message: string, code: ErrorCode = 'INTERNAL_ERROR', statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', 400);
    }
}

export class AuthError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 'AUTH_ERROR', 401);
    }
}

export class RateLimitError extends AppError {
    public readonly retryAfter?: number;
    constructor(message = 'Too Many Requests', retryAfter?: number) {
        super(message, 'RATE_LIMITED', 429);
        this.retryAfter = retryAfter;
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable') {
        super(message, 'SERVICE_UNAVAILABLE', 503);
    }
}
