import fs from "node:fs";
import path from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

interface CloudEventSchema {
	$id: string;
	title: string;
	description: string;
	type: string;
	properties: Record<string, unknown>;
	required: string[];
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

describe("CloudEvents Schema Validation", () => {
	const schemasDir = path.join(__dirname, "../../../../contracts/cloudevents");
	const schemaFiles = fs
		.readdirSync(schemasDir)
		.filter((file) => file.endsWith(".json"));

	schemaFiles.forEach((schemaFile) => {
		describe(`${schemaFile}`, () => {
			let schema: CloudEventSchema;
			let validate: ValidateFunction;

			it("should load schema successfully", () => {
				const schemaPath = path.join(schemasDir, schemaFile);
				const schemaContent = fs.readFileSync(schemaPath, "utf-8");
				schema = JSON.parse(schemaContent) as CloudEventSchema;
				expect(schema).toBeDefined();
				expect(schema.$id).toBeDefined();
			});

			it("should compile schema without errors", () => {
				validate = ajv.compile(schema);
				expect(validate).toBeDefined();
			});

			it("should validate valid CloudEvent instances", () => {
				if (!validate) {
					throw new Error("Schema not compiled");
				}

				let validEvent: Record<string, unknown>;

				// Create appropriate test data based on schema type
				if (schemaFile.includes("agent-task-requested")) {
					validEvent = {
						id: "123e4567-e89b-12d3-a456-426614174000",
						type: "agent.task.requested",
						source: "/agents/example",
						specversion: "1.0",
						time: "2024-01-01T00:00:00Z",
						data: {
							taskId: "123e4567-e89b-12d3-a456-426614174001",
							taskType: "data-processing",
							payload: { input: "test" },
						},
					};
				} else if (schemaFile.includes("agent-task-completed")) {
					validEvent = {
						id: "123e4567-e89b-12d3-a456-426614174000",
						type: "agent.task.completed",
						source: "/agents/example",
						specversion: "1.0",
						time: "2024-01-01T00:00:00Z",
						data: {
							taskId: "123e4567-e89b-12d3-a456-426614174001",
							result: { status: "success", output: "processed data" },
							executionTime: 1000,
						},
					};
				} else if (schemaFile.includes("agent-task-failed")) {
					validEvent = {
						id: "123e4567-e89b-12d3-a456-426614174000",
						type: "agent.task.failed",
						source: "/agents/example",
						specversion: "1.0",
						time: "2024-01-01T00:00:00Z",
						data: {
							taskId: "123e4567-e89b-12d3-a456-426614174001",
							error: "Task failed",
							executionTime: 500,
						},
					};
				} else if (schemaFile.includes("agent-coordination-requested")) {
					validEvent = {
						id: "123e4567-e89b-12d3-a456-426614174000",
						type: "agent.coordination.requested",
						source: "/agents/example",
						specversion: "1.0",
						time: "2024-01-01T00:00:00Z",
						data: {
							coordinationId: "123e4567-e89b-12d3-a456-426614174002",
							workflowType: "parallel-processing",
							participants: ["agent-a", "agent-b"],
							payload: { workflow: "test" },
						},
					};
				} else {
					validEvent = {
						id: "123e4567-e89b-12d3-a456-426614174000",
						type: schemaFile.replace(".json", "").replace(/-/g, "."),
						source: "/agents/example",
						specversion: "1.0",
						time: "2024-01-01T00:00:00Z",
						data: {
							message: "Test event data",
						},
					};
				}

				const isValid = validate(validEvent);
				expect(isValid).toBe(true);
				expect(validate.errors).toBeNull();
			});

			it("should reject invalid CloudEvent instances", () => {
				if (!validate) {
					throw new Error("Schema not compiled");
				}

				const invalidEvent = {
					// Missing required fields
					data: {},
				};

				const isValid = validate(invalidEvent);
				expect(isValid).toBe(false);
				expect(validate.errors).toBeDefined();
				if (validate.errors) {
					expect(validate.errors.length).toBeGreaterThan(0);
				}
			});

			it("should validate schema structure", () => {
				expect(schema.type).toBe("object");
				expect(schema.properties).toBeDefined();
				expect(schema.required).toBeDefined();
				expect(schema.required).toContain("id");
				expect(schema.required).toContain("type");
				expect(schema.required).toContain("source");
				expect(schema.required).toContain("specversion");
			});
		});
	});

	describe("Cross-schema consistency", () => {
		const commonRequired = ["id", "type", "source", "specversion"];
		const commonProperties = [
			"id",
			"type",
			"source",
			"specversion",
			"time",
			"data",
		];

		it("should have consistent CloudEvents structure across all schemas", () => {
			for (const schemaFile of schemaFiles) {
				const schemaPath = path.join(schemasDir, schemaFile);
				const schema = JSON.parse(
					fs.readFileSync(schemaPath, "utf-8"),
				) as CloudEventSchema;

				for (const prop of commonRequired) {
					expect(schema.required).toContain(prop);
				}

				for (const prop of commonProperties) {
					expect(schema.properties).toHaveProperty(prop);
				}
			}
		});
	});
});
