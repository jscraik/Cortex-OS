export const errorCodes = {
  INVALID_INPUT: 'E1000',
  RESOURCE_LIMIT: 'E1001',
  TIMEOUT: 'E1002',
  UPSTREAM_FAILURE: 'E1003',
  CONTRACT_VIOLATION: 'E1004',
  UNKNOWN_ERROR: 'E1999',
} as const;

export class StructuredError extends Error {
  code: string;
  details?: Record<string, unknown>;
  constructor(
    codeKey: keyof typeof errorCodes,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'StructuredError';
    this.code = errorCodes[codeKey];
    this.details = details;
  }
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
      timestamp: new Date().toISOString(),
    };
  }
}
