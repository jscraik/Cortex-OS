/**
 * Tests for validation utilities
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	createValidator,
	parseAndValidateJSON,
	ValidationError,
	validateExecutionContext,
	validateInput,
	validateOutput,
	validateSchema,
} from "@/lib/validate.js";

describe("Validation Utilities", () => {
	const testSchema = z.object({
		name: z.string(),
		age: z.number(),
		active: z.boolean().optional(),
	});

	describe("validateSchema", () => {
		it("should validate correct data", () => {
			const validData = { name: "John", age: 30, active: true };
			const result = validateSchema(testSchema, validData);
			expect(result).toEqual(validData);
		});

		it("should throw ValidationError for invalid data", () => {
			const invalidData = { name: "John", age: "thirty" }; // age should be number

			expect(() =>
				validateSchema(testSchema, invalidData, "test-schema"),
			).toThrow(ValidationError);
		});

		it("should include schema name in error message", () => {
			const invalidData = { name: "John" }; // missing required age

			expect(() =>
				validateSchema(testSchema, invalidData, "user-schema"),
			).toThrow(/user-schema/);
		});
	});

	describe("validateInput", () => {
		it("should validate agent input", () => {
			const validInput = { name: "John", age: 30 };
			const result = validateInput(testSchema, validInput, "code-analysis");
			expect(result).toEqual(validInput);
		});

		it("should throw ValidationError with capability context", () => {
			const invalidInput = { name: "John" }; // missing age

			expect(() =>
				validateInput(testSchema, invalidInput, "code-analysis"),
			).toThrow(/code-analysis-input/);
		});
	});

	describe("validateOutput", () => {
		it("should validate agent output", () => {
			const validOutput = { name: "John", age: 30 };
			const result = validateOutput(testSchema, validOutput, "test-generation");
			expect(result).toEqual(validOutput);
		});

		it("should throw ValidationError with capability context", () => {
			const invalidOutput = { name: "John" }; // missing age

			expect(() =>
				validateOutput(testSchema, invalidOutput, "test-generation"),
			).toThrow(/test-generation-output/);
		});
	});

	describe("parseAndValidateJSON", () => {
		it("should parse and validate valid JSON", () => {
			const jsonString = '{"name":"John","age":30}';
			const result = parseAndValidateJSON(jsonString, testSchema);
			expect(result).toEqual({ name: "John", age: 30 });
		});

		it("should throw ValidationError for invalid JSON", () => {
			const invalidJson = '{"name":"John","age":"thirty"}'; // age should be number

			expect(() => parseAndValidateJSON(invalidJson, testSchema)).toThrow(
				ValidationError,
			);
		});

		it("should throw ValidationError for malformed JSON", () => {
			const malformedJson = '{"name":"John","age":30'; // missing closing brace

			expect(() => parseAndValidateJSON(malformedJson, testSchema)).toThrow(
				ValidationError,
			);
		});
	});

	describe("createValidator", () => {
		it("should create a reusable validator function", () => {
			const validator = createValidator(testSchema, "user-validator");

			const validData = { name: "John", age: 30 };
			const result = validator(validData);
			expect(result).toEqual(validData);
		});

		it("should throw ValidationError with schema name", () => {
			const validator = createValidator(testSchema, "user-validator");

			expect(() => validator({ name: "John" })).toThrow(/user-validator/);
		});
	});

	describe("validateExecutionContext", () => {
		it("should validate valid execution context", () => {
			const validContext = {
				agentId: "123e4567-e89b-12d3-a456-426614174000",
				modelPreference: "mlx" as const,
				maxLatencyMs: 5000,
				costBudget: 10.5,
			};

			const result = validateExecutionContext(validContext);
			expect(result).toEqual(validContext);
		});

		it("should validate empty context", () => {
			const result = validateExecutionContext({});
			expect(result).toEqual({});
		});

		it("should throw for invalid model preference", () => {
			const invalidContext = { modelPreference: "invalid" };

			expect(() => validateExecutionContext(invalidContext)).toThrow(
				ValidationError,
			);
		});

		it("should throw for negative cost budget", () => {
			const invalidContext = { costBudget: -10 };

			expect(() => validateExecutionContext(invalidContext)).toThrow(
				ValidationError,
			);
		});

		it("should throw for invalid UUID format", () => {
			const invalidContext = { agentId: "invalid-uuid" };

			expect(() => validateExecutionContext(invalidContext)).toThrow(
				ValidationError,
			);
		});
	});

	describe("ValidationError", () => {
		it("should create ValidationError with correct properties", () => {
			const error = new ValidationError("Test message", "test-schema", {
				field: "error",
			});

			expect(error.name).toBe("ValidationError");
			expect(error.message).toBe("Test message");
			expect(error.schema).toBe("test-schema");
			expect(error.details).toEqual({ field: "error" });
		});

		it("should be instance of Error", () => {
			const error = new ValidationError("Test", "schema");
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ValidationError);
		});
	});
});
