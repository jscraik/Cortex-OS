import { z } from 'zod';
import type { Envelope } from '../../../a2a-contracts/src/envelope.js';

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
	customValidators?: Array<(envelope: Envelope) => string | null>;
}

const DEFAULT_MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB

export class InputValidator {
	constructor(private readonly rules: ValidationRule = {}) {}

	validateEnvelope(envelope: Envelope): void {
		const errors: string[] = [];

		this.validateSize(envelope, errors);
		this.validateContent(envelope, errors);
		this.validateSource(envelope, errors);
		this.runCustomValidators(envelope, errors);

		if (errors.length > 0) {
			throw new ValidationError('Envelope validation failed', errors);
		}
	}

	private validateSize(envelope: Envelope, errors: string[]): void {
		const maxSize = this.rules.maxPayloadSize ?? DEFAULT_MAX_PAYLOAD_SIZE;
		const serialized = JSON.stringify(envelope.data);
		const size = Buffer.byteLength(serialized, 'utf8');

		if (size > maxSize) {
			errors.push(`Payload size ${size} exceeds maximum ${maxSize} bytes`);
		}
	}

	private validateContent(envelope: Envelope, errors: string[]): void {
		if (this.rules.allowedTypes && !this.rules.allowedTypes.includes(envelope.type)) {
			errors.push(`Message type '${envelope.type}' not allowed`);
		}

		// Sanitize string content to prevent injection attacks
		if (envelope.data && typeof envelope.data === 'object') {
			this.sanitizeObject(envelope.data as Record<string, unknown>);
		}
	}

	private validateSource(envelope: Envelope, errors: string[]): void {
		if (this.rules.requireSource && !envelope.source) {
			errors.push('Source is required');
		}

		// Validate source URI format
		if (envelope.source) {
			try {
				new URL(envelope.source);
			} catch {
				errors.push(`Invalid source URI: ${envelope.source}`);
			}
		}
	}

	private runCustomValidators(envelope: Envelope, errors: string[]): void {
		if (!this.rules.customValidators) return;

		for (const validator of this.rules.customValidators) {
			const error = validator(envelope);
			if (error) {
				errors.push(error);
			}
		}
	}

	private sanitizeObject(obj: Record<string, unknown>): void {
		for (const [key, value] of Object.entries(obj)) {
			if (typeof value === 'string') {
				obj[key] = this.sanitizeString(value);
			} else if (value && typeof value === 'object') {
				this.sanitizeObject(value as Record<string, unknown>);
			}
		}
	}

	private sanitizeString(input: string): string {
		// Remove potential SQL injection patterns
		let sanitized = input
			.replace(/('|(\\'))/g, '') // Remove single quotes
			.replace(/(;|--|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/gi, '') // Remove SQL keywords
			.replace(/(<script[^>]*>.*?<\/script>)/gi, '') // Remove script tags
			.replace(/javascript:/gi, ''); // Remove javascript: protocols

		// Limit string length to prevent DoS
		if (sanitized.length > 10000) {
			sanitized = sanitized.substring(0, 10000);
		}

		return sanitized;
	}
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
