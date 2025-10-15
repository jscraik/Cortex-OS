import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import {
	type ToolErrorResponse,
	type ToolRequest,
	type ToolResponse,
	toolErrorSchema,
	toolRequestSchema,
	toolResponseSchema,
} from './tool-schemas.js';

export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationFailure = { success: false; errors: string[] };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

type SchemaValidator<T> = ValidateFunction<T>;

const ajv = new Ajv({ allErrors: true, strict: false });

const toolRequestValidator: SchemaValidator<ToolRequest> = ajv.compile(toolRequestSchema);
const toolResponseValidator: SchemaValidator<ToolResponse> = ajv.compile(toolResponseSchema);
const toolErrorValidator: SchemaValidator<ToolErrorResponse> = ajv.compile(toolErrorSchema);

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
	if (!errors?.length) {
		return ['Invalid payload'];
	}

	return errors.map((error) => {
		const path = error.instancePath
			? error.instancePath.replace(/^\//, '').split('/').filter(Boolean).join('.')
			: '';

		if (error.keyword === 'required' && 'missingProperty' in error.params) {
			const missing = error.params.missingProperty;
			const location = path ? `${path}.${missing}` : missing;
			return `${location} is required`;
		}

		const location = path || '<root>';
		const message = error.message ?? 'is invalid';
		return `${location} ${message}`.trim();
	});
}

function validateWith<T>(validator: SchemaValidator<T>, payload: unknown): ValidationResult<T> {
	if (validator(payload)) {
		return { success: true, data: payload };
	}
	return { success: false, errors: formatErrors(validator.errors) };
}

export function validateToolRequest(payload: unknown): ValidationResult<ToolRequest> {
	return validateWith(toolRequestValidator, payload);
}

export function validateToolResponse(payload: unknown): ValidationResult<ToolResponse> {
	return validateWith(toolResponseValidator, payload);
}

export function validateToolErrorResponse(payload: unknown): ValidationResult<ToolErrorResponse> {
	return validateWith(toolErrorValidator, payload);
}
