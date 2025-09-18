import { type TaskInput, TaskInputSchema, ValidationError } from '../types/index.js';

/**
 * Validate raw task input and ensure required fields
 */
export function validateTaskInput(input: unknown): TaskInput {
	const result = TaskInputSchema.safeParse(input);
	if (!result.success) {
		const issues = result.error.issues;
		throw new ValidationError('Invalid task input', { errors: issues });
	}
	const taskInput = result.data;
	if (taskInput.scopes.length === 0) {
		throw new ValidationError('Scopes must not be empty', {
			field: 'scopes',
			rule: 'non_empty',
		});
	}
	return taskInput;
}
