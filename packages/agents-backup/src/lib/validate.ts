import { z } from 'zod';
import type { ExecutionContext } from './types.js';

// ValidationError used by validation utilities (distinct from lib/types ValidationError)
export class ValidationError extends Error {
	constructor(
		message: string,
		public schema?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'ValidationError';
	}
}

// Execution context expected by tests: all fields optional, stricter when present
export const executionContextSchema = z
	.object({
		agentId: z.string().uuid().optional(),
		modelPreference: z.enum(['mlx', 'ollama', 'frontier']).optional(),
		maxLatencyMs: z.number().int().positive().optional(),
		costBudget: z.number().nonnegative().optional(),
	})
	.strict();

// createValidator returns a reusable function (schema-first) that throws ValidationError
export function createValidator<T>(schema: z.ZodSchema<T>, name?: string) {
	return (data: unknown): T => {
		const res = schema.safeParse(data);
		if (res.success) return res.data;
		const issues = res.error?.issues?.map((i) => i.message).join('; ');
		throw new ValidationError(
			`Validation failed${name ? ` for ${name}` : ''}${issues ? `: ${issues}` : ''}`,
			name,
			res.error,
		);
	};
}

export function parseAndValidateJSON<T>(
	jsonString: string,
	schema: z.ZodSchema<T>,
): T {
	try {
		const parsed = JSON.parse(jsonString);
		const res = schema.safeParse(parsed);
		if (res.success) return res.data;
		throw new ValidationError('JSON validation failed', undefined, res.error);
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new ValidationError(`Invalid JSON: ${error.message}`);
		}
		throw error;
	}
}

export function validateExecutionContext(context: unknown): ExecutionContext {
	// The ExecutionContext type here mirrors what tests assert: passthrough
	const res = executionContextSchema.safeParse(context);
	if (res.success) return res.data as unknown as ExecutionContext;
	throw new ValidationError(
		'Validation failed',
		'execution-context',
		res.error,
	);
}

// Accept both (schema, data, capability) and (data, schema, capability)
export function validateInput(
	a: unknown,
	b?: unknown,
	capability?: string,
): any {
	const [schema, data] = isZodSchema(a)
		? [a as z.ZodSchema, b]
		: [b as z.ZodSchema, a];
	const res = schema.safeParse(data);
	if (res.success) return res.data;
	const name = capability ? `${capability}-input` : undefined;
	throw new ValidationError(
		`Validation failed${name ? ` for ${name}` : ''}`,
		name,
		res.error,
	);
}

export function validateOutput(
	a: unknown,
	b?: unknown,
	capability?: string,
): any {
	const [schema, data] = isZodSchema(a)
		? [a as z.ZodSchema, b]
		: [b as z.ZodSchema, a];
	const res = schema.safeParse(data);
	if (res.success) return res.data;
	const name = capability ? `${capability}-output` : undefined;
	throw new ValidationError(
		`Validation failed${name ? ` for ${name}` : ''}`,
		name,
		res.error,
	);
}

export function validateSchema<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
	context?: string,
): T {
	const res = schema.safeParse(data);
	if (res.success) return res.data;
	throw new ValidationError(
		`Validation failed${context ? ` for ${context}` : ''}`,
		context,
		res.error,
	);
}

function isZodSchema(val: unknown): val is z.ZodSchema<any> {
	return !!val && typeof val === 'object' && 'safeParse' in (val as any);
}
