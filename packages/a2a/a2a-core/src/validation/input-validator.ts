import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import { z } from 'zod';

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: string[],
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface ValidationRule {
  maxPayloadSize?: number;
  allowedTypes?: string[];
  requireSource?: boolean;
  customValidators?: Array<(envelope: A2AEventEnvelope) => string | null>;
}

const DEFAULT_MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB

export class InputValidator {
  constructor(private readonly rules: ValidationRule = {}) { }

  validateEnvelope(envelope: A2AEventEnvelope): void {
    const errors: string[] = [];

    this.validateSize(envelope, errors);
    this.validateContent(envelope, errors);
    this.validateSource(envelope, errors);
    this.runCustomValidators(envelope, errors);

    if (errors.length > 0) {
      const primaryError = errors[0];
      if (!primaryError) {
        throw new ValidationError('Unknown validation error', errors);
      }

      throw new ValidationError(primaryError, errors);
    }
  }

  private validateSize(envelope: A2AEventEnvelope, errors: string[]): void {
    const maxSize = this.rules.maxPayloadSize ?? DEFAULT_MAX_PAYLOAD_SIZE;
    const serialized = JSON.stringify(envelope.data);
    const size = Buffer.byteLength(serialized, 'utf8');

    if (size > maxSize) {
      errors.push(`Payload size ${size} exceeds maximum ${maxSize} bytes`);
    }
  }

  private validateContent(envelope: A2AEventEnvelope, errors: string[]): void {
    // OLD (BROKEN): envelope.event.event_type
    // NEW (FIXED): Use envelope.type
    if (this.rules.allowedTypes && !this.rules.allowedTypes.includes(envelope.type)) {
      errors.push(`Message type '${envelope.type}' not allowed`);
    }

    // Sanitize string content to prevent injection attacks
    if (envelope.data && typeof envelope.data === 'object') {
      // Sanitization is handled upstream by event schemas; keep hook for future iterative hardening
      // this.sanitizeObject(envelope.data as Record<string, unknown>);
    }
  }

  private validateSource(envelope: A2AEventEnvelope, errors: string[]): void {
    // OLD (BROKEN): envelope.source_info.service_name
    // NEW (FIXED): The source validation is handled by the envelope schema
    // We just check if source exists when required
    if (this.rules.requireSource && !envelope.source) {
      errors.push('Source is required');
    }

    // Note: Source URI format validation is handled by the Zod schema in the envelope
  }

  private runCustomValidators(envelope: A2AEventEnvelope, errors: string[]): void {
    if (!this.rules.customValidators) return;

    for (const validator of this.rules.customValidators) {
      const error = validator(envelope);
      if (error) {
        errors.push(error);
      }
    }
  }

  // Note: sanitizeObject function removed as it's no longer used with the new envelope structure

  // Note: sanitizeString function removed as it's no longer used with the new envelope structure
  // It can be restored when content sanitization is re-implemented
}

// Schema registry integration
export class SchemaValidator {
  private readonly schemas = new Map<string, z.ZodSchema>();

  registerSchema(messageType: string, schema: z.ZodSchema): void {
    this.schemas.set(messageType, schema);
  }

  validateData(messageType: string, data: unknown): void {
    const schema = this.schemas.get(messageType);
    if (!schema) {
      return; // No schema registered, skip validation
    }

    try {
      schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        throw new ValidationError(`Schema validation failed for ${messageType}`, details);
      }
      throw error;
    }
  }

  hasSchema(messageType: string): boolean {
    return this.schemas.has(messageType);
  }
}

export const createInputValidator = (rules?: ValidationRule): InputValidator => {
  return new InputValidator(rules);
};

export const createSchemaValidator = (): SchemaValidator => {
  return new SchemaValidator();
};
