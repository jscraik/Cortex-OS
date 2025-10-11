// brAInwav Cortex-OS: instructor-js adapter (schema-constrained outputs)
// Accepts a generic "validate" function to avoid hard dependency

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: Error };

export type Validator<T> = (text: string) => ValidationResult<T>;

export const createInstructorAdapter = <T>({ validate }: { validate: Validator<T> }) => {
	const parse = async (text: string): Promise<T> => {
		const res = validate(text);
		if (res.ok) return res.data;
		throw new Error(`brAInwav Cortex-OS: instructor-js validation failed: ${res.error.message}`, {
			cause: res.error,
		});
	};
	return { parse };
};
