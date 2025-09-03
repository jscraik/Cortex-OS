import { z } from 'zod';
import type { ExecutionContext } from './types.js';

export const executionContextSchema = z.object({
	userId: z.string().optional(),
	sessionId: z.string().optional(),
	traceId: z.string().optional(),
	input: z.any(),
	metadata: z.record(z.any()).optional(),
});

export function createValidator<T>(schema: z.ZodSchema<T>) {
	return {
		validate: (data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } => {
			const result = schema.safeParse(data);
			if (result.success) {
				return { success: true, data: result.data };
			} else {
				return { success: false, error: result.error };
			}
		},
		parse: (data: unknown): T => schema.parse(data),
		safeParse: (data: unknown) => schema.safeParse(data),
	};
}

export function parseAndValidateJSON<T>(
	jsonString: string,
	schema: z.ZodSchema<T>
): T {
	try {
		const parsed = JSON.parse(jsonString);
		return schema.parse(parsed);
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(`Invalid JSON: ${error.message}`);
		}
		throw error;
	}
}

export function validateExecutionContext(context: unknown): ExecutionContext {
	const parsed = executionContextSchema.parse(context);
	return {
		userId: parsed.userId,
		sessionId: parsed.sessionId,
		traceId: parsed.traceId,
		input: parsed.input,
		metadata: parsed.metadata,
	};
}

export function validateInput(input: unknown, schema?: z.ZodSchema): any {
	if (schema) {
		return schema.parse(input);
	}
	return input;
}

export function validateOutput(output: unknown, schema?: z.ZodSchema): any {
	if (schema) {
		return schema.parse(output);
	}
	return output;
}

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
	try {
		return schema.parse(data);
	} catch (error) {
		if (context) {
			throw new Error(`Validation failed for ${context}: ${error}`);
		}
		throw error;
	}
}
