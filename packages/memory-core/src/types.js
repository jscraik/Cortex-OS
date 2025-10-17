// Error types
export class MemoryProviderError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'MemoryProviderError';
    }
}
