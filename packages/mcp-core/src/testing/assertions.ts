import type { ZodIssue } from 'zod';

type Primitive = string | number | boolean | symbol | null | undefined;

type AssertionErrorInput = {
	expected?: Primitive | Primitive[] | Record<string, unknown>;
	received?: unknown;
	message: string;
};

function createAssertionError({ message }: AssertionErrorInput): Error {
	return new Error(message);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function assertRecord<T extends Record<string, unknown>>(
	value: unknown,
	message: string,
): T {
	if (!isRecord(value)) {
		throw createAssertionError({ message });
	}
	return value as T;
}

export function assertString(value: unknown, message: string): string {
	if (typeof value !== 'string') {
		throw createAssertionError({ message });
	}
	return value;
}

export function assertNumber(value: unknown, message: string): number {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		throw createAssertionError({ message });
	}
	return value;
}

export function assertStringArray(value: unknown, message: string): string[] {
	if (!Array.isArray(value)) {
		throw createAssertionError({ message });
	}
	return value.map((entry) => assertString(entry, message));
}

export function toStructuredZodIssues(issues: ZodIssue[]): {
	issues: ZodIssue[];
} {
	return { issues };
}
