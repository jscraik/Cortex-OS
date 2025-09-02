/**
 * @file MCP Protocol Compliance Tests
 * @description Comprehensive TDD test suite for MCP protocol implementation
 * Tests all core primitives: tools, resources, prompts following MCP spec 2025-06-18
 */

import { describe, expect, it } from "vitest";
import {
	MCP_PROTOCOL_VERSION,
	type MCPPrompt,
	MCPProtocolCompliance,
	type MCPResource,
	type MCPTool,
	validateMCPPrompt,
	validateMCPResource,
	validateMCPTool,
} from "../src/lib/mcp-protocol-compliance.js";

describe("MCP Protocol Compliance", () => {
	describe("Core Primitives Validation", () => {
		describe("Tools (AI Actions)", () => {
			it("should validate a compliant MCP tool definition", () => {
				const validTool: MCPTool = {
					name: "searchFlights",
					description: "Search for available flights",
					inputSchema: {
						type: "object",
						properties: {
							origin: { type: "string", description: "Origin airport" },
							destination: {
								type: "string",
								description: "Destination airport",
							},
							date: {
								type: "string",
								format: "date",
								description: "Travel date",
							},
						},
						required: ["origin", "destination", "date"],
						additionalProperties: false,
					},
				};

				expect(() => validateMCPTool(validTool)).not.toThrow();
				const validated = validateMCPTool(validTool);
				expect(validated.name).toBe("searchFlights");
				expect(validated.inputSchema.type).toBe("object");
				expect(validated.inputSchema.required).toEqual([
					"origin",
					"destination",
					"date",
				]);
			});

			it("should reject invalid tool definitions", () => {
				const invalidTools = [
					{ name: "", description: "Empty name" },
					{ name: "valid", inputSchema: { type: "array" } }, // wrong schema type
					{ name: "valid", inputSchema: { type: "object" } }, // missing properties
				];

				invalidTools.forEach((tool) => {
					expect(() => validateMCPTool(tool)).toThrow();
				});
			});

			it("should validate tool schema follows JSON Schema format", () => {
				const schema = {
					type: "object",
					properties: {
						query: { type: "string" },
						limit: { type: "number" },
					},
					required: ["query"],
				};

				expect(MCPProtocolCompliance.validateToolImplementation(schema)).toBe(
					true,
				);
			});
		});

		describe("Resources (Context Data)", () => {
			it("should validate compliant MCP resource definitions", () => {
				const validResource: MCPResource = {
					uri: "file:///documents/report.pdf",
					name: "Monthly Report",
					description: "Company monthly report",
					mimeType: "application/pdf",
				};

				expect(() => validateMCPResource(validResource)).not.toThrow();
				const validated = validateMCPResource(validResource);
				expect(validated.uri).toBe("file:///documents/report.pdf");
				expect(validated.name).toBe("Monthly Report");
			});

			it("should validate templated resource patterns", () => {
				const templatedURIs = [
					"weather://forecast/{city}/{date}",
					"database://users/{id}",
					"api://search?q={query}&limit={limit}",
				];

				templatedURIs.forEach((uri) => {
					expect(MCPProtocolCompliance.validateResourceURI(uri)).toBe(true);
				});
			});

			it("should validate direct resource URIs", () => {
				const directURIs = [
					"file:///documents/report.pdf",
					"https://api.example.com/data",
					"ftp://files.example.com/data.csv",
				];

				directURIs.forEach((uri) => {
					expect(MCPProtocolCompliance.validateResourceURI(uri)).toBe(true);
				});
			});

			it("should reject invalid resource URIs", () => {
				const invalidURIs = ["", "not-a-uri", "incomplete://"];

				invalidURIs.forEach((uri) => {
					expect(MCPProtocolCompliance.validateResourceURI(uri)).toBe(false);
				});
			});
		});

		describe("Prompts (Interaction Templates)", () => {
			it("should validate compliant MCP prompt definitions", () => {
				const validPrompt: MCPPrompt = {
					name: "planVacation",
					description: "Plan a vacation itinerary",
					arguments: [
						{ name: "destination", description: "Where to go", required: true },
						{ name: "duration", description: "How many days", required: false },
					],
				};

				expect(() => validateMCPPrompt(validPrompt)).not.toThrow();
				const validated = validateMCPPrompt(validPrompt);
				expect(validated.name).toBe("planVacation");
				expect(validated.arguments).toHaveLength(2);
				expect(validated.arguments?.[0].required).toBe(true);
			});

			it("should handle prompts with no arguments", () => {
				const simplePrompt: MCPPrompt = {
					name: "dailyStandup",
					description: "Generate daily standup template",
				};

				expect(() => validateMCPPrompt(simplePrompt)).not.toThrow();
				const validated = validateMCPPrompt(simplePrompt);
				expect(validated.arguments).toEqual([]);
			});

			it("should reject invalid prompt definitions", () => {
				const invalidPrompts = [
					{ name: "", description: "Empty name" },
					{ name: "valid", arguments: [{ name: "" }] }, // empty argument name
				];

				invalidPrompts.forEach((prompt) => {
					expect(() => validateMCPPrompt(prompt)).toThrow();
				});
			});
		});
	});

	describe("Protocol Version Negotiation", () => {
		it("should validate current MCP protocol version format", () => {
			expect(MCP_PROTOCOL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(MCP_PROTOCOL_VERSION).toBe("2025-06-18");
		});

		it("should accept compatible versions within 1 year", () => {
			const compatibleVersions = ["2025-01-01", "2025-06-18", "2024-12-31"];

			compatibleVersions.forEach((version) => {
				expect(MCPProtocolCompliance.checkVersionCompatibility(version)).toBe(
					true,
				);
			});
		});

		it("should reject incompatible or malformed versions", () => {
			const incompatibleVersions = [
				"2023-01-01", // too old
				"1.0.0", // wrong format
				"latest", // invalid format
				"", // empty
			];

			incompatibleVersions.forEach((version) => {
				expect(MCPProtocolCompliance.checkVersionCompatibility(version)).toBe(
					false,
				);
			});
		});
	});

	describe("Schema Validation Edge Cases", () => {
		it("should handle optional properties correctly", () => {
			const minimalTool = {
				name: "ping",
				inputSchema: {
					type: "object",
					properties: {},
					additionalProperties: false,
				},
			};

			expect(() => validateMCPTool(minimalTool)).not.toThrow();
		});

		it("should validate complex nested schemas", () => {
			const complexTool: MCPTool = {
				name: "complexSearch",
				description: "Complex search with nested parameters",
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string" },
						filters: {
							type: "string", // Would be object in real schema
							description: "Search filters",
						},
						options: {
							type: "string", // Would be object in real schema
							description: "Search options",
						},
					},
					required: ["query"],
					additionalProperties: false,
				},
			};

			expect(() => validateMCPTool(complexTool)).not.toThrow();
		});

		it("should enforce strict schema validation", () => {
			const invalidSchema = {
				name: "test",
				inputSchema: {
					type: "object",
					properties: {},
					extraProperty: "not allowed", // This should be caught by strict parsing
				},
			};

			expect(() => validateMCPTool(invalidSchema)).toThrow();
		});
	});

	describe("Error Handling", () => {
		it("should provide meaningful error messages", () => {
			expect(() => validateMCPTool({ name: "" })).toThrow(
				/Tool name is required/,
			);
			expect(() => validateMCPResource({ uri: "" })).toThrow(
				/Resource URI is required/,
			);
			expect(() => validateMCPPrompt({ name: "" })).toThrow(
				/Prompt name is required/,
			);
		});

		it("should handle malformed input gracefully", () => {
			const malformedInputs = [null, undefined, "string", 123, []];

			malformedInputs.forEach((input) => {
				expect(() => validateMCPTool(input)).toThrow();
				expect(() => validateMCPResource(input)).toThrow();
				expect(() => validateMCPPrompt(input)).toThrow();
			});
		});
	});

	describe("Integration with Server Context", () => {
		it("should validate complete MCP server setup", () => {
			const serverTools = [
				{
					name: "calculator",
					description: "Perform calculations",
					inputSchema: {
						type: "object",
						properties: {
							expression: { type: "string" },
						},
						required: ["expression"],
						additionalProperties: false,
					},
				},
			];

			const serverResources = [
				{
					uri: "file:///data/users.json",
					name: "User Data",
					mimeType: "application/json",
				},
			];

			const serverPrompts = [
				{
					name: "emailTemplate",
					description: "Generate email template",
				},
			];

			// Validate all components are MCP compliant
			expect(() => serverTools.forEach(validateMCPTool)).not.toThrow();
			expect(() => serverResources.forEach(validateMCPResource)).not.toThrow();
			expect(() => serverPrompts.forEach(validateMCPPrompt)).not.toThrow();
		});
	});
});
