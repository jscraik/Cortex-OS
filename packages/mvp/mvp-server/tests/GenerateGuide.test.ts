/**
 * @file_path packages/mcp-server/tests/GenerateGuide.test.ts
 * @description Tests for GenerateGuide MCP tool
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	GenerateGuide,
	type GenerateGuideArgs,
} from "../src/tools/GenerateGuide.js";

describe("GenerateGuide Tool", () => {
	let tool: GenerateGuide;

	beforeEach(() => {
		tool = new GenerateGuide();
	});

	describe("Basic Tool Properties", () => {
		it("should have correct name and description", () => {
			expect(tool.name).toBe("generate_guide");
			expect(tool.description).toContain(
				"Generate comprehensive documentation guides",
			);
		});
	});

	describe("Basic Guide Generation", () => {
		it("should generate a basic guide with minimal arguments", async () => {
			const args: GenerateGuideArgs = {
				topic: "API Testing",
			};

			const result = await tool.run(args);

			expect(result.title).toBe("Api Testing Guide");
			expect(result.content).toContain("# Api Testing Guide");
			expect(result.format).toBe("markdown");
			expect(result.sections).toHaveLength(6); // Default guide sections
			expect(result.metadata.topic).toBe("API Testing");
			expect(result.metadata.type).toBe("guide");
			expect(result.accessibility_features.heading_structure).toBe(true);
		});

		it("should generate an API reference guide", async () => {
			const args: GenerateGuideArgs = {
				topic: "User Management",
				type: "api",
				audience: "developer",
			};

			const result = await tool.run(args);

			expect(result.title).toBe("User Management API Reference");
			expect(result.content).toContain("User Management API Reference");
			expect(result.metadata.type).toBe("api");
			expect(result.metadata.audience).toBe("developer");
			expect(result.metadata.difficulty_level).toBe("intermediate");

			// API guides should have authentication section
			const hasAuthSection = result.sections.some((s) =>
				s.title.toLowerCase().includes("authentication"),
			);
			expect(hasAuthSection).toBe(true);
		});

		it("should generate a tutorial with custom sections", async () => {
			const args: GenerateGuideArgs = {
				topic: "Machine Learning",
				type: "tutorial",
				sections: [
					"introduction",
					"data-preparation",
					"model-training",
					"evaluation",
				],
				include_examples: true,
				include_code_samples: true,
			};

			const result = await tool.run(args);

			expect(result.title).toBe("Machine Learning Tutorial");
			expect(result.sections).toHaveLength(4);
			expect(result.content).toContain("Code Samples");
			expect(result.content).toContain("Practical Examples");
			expect(result.sections[0].title).toBe("Introduction");
		});

		it("should handle troubleshooting guide type", async () => {
			const args: GenerateGuideArgs = {
				topic: "Database Connection Issues",
				type: "troubleshooting",
				audience: "admin",
			};

			const result = await tool.run(args);

			expect(result.title).toBe(
				"Database Connection Issues Troubleshooting Guide",
			);
			expect(result.metadata.audience).toBe("admin");

			// Should contain troubleshooting-specific content
			expect(result.content).toContain("Symptoms:");
			expect(result.content).toContain("Solution:");
		});
	});

	describe("Content Formatting", () => {
		it("should generate HTML format when requested", async () => {
			const args: GenerateGuideArgs = {
				topic: "Test Topic",
				format: "html",
			};

			const result = await tool.run(args);

			expect(result.format).toBe("html");
			expect(result.content).toContain("<h1>");
			expect(result.content).toContain("<h2>");
			expect(result.content).toContain("</h1>");
		});

		it("should generate JSON format when requested", async () => {
			const args: GenerateGuideArgs = {
				topic: "Test Topic",
				format: "json",
			};

			const result = await tool.run(args);

			expect(result.format).toBe("json");
			expect(() => JSON.parse(result.content)).not.toThrow();

			const parsed = JSON.parse(result.content);
			expect(parsed.content).toBeDefined();
			expect(parsed.sections).toBeDefined();
		});

		it("should generate YAML format when requested", async () => {
			const args: GenerateGuideArgs = {
				topic: "Test Topic",
				format: "yaml",
			};

			const result = await tool.run(args);

			expect(result.format).toBe("yaml");
			expect(result.content).toContain("title:");
			expect(result.content).toContain("sections:");
			expect(result.content).toContain("---");
		});
	});

	describe("Accessibility Features", () => {
		it("should include accessibility features for enhanced level", async () => {
			const args: GenerateGuideArgs = {
				topic: "Web Development",
				accessibility_level: "enhanced",
				include_diagrams: true,
			};

			const result = await tool.run(args);

			expect(result.accessibility_features.screen_reader_friendly).toBe(true);
			expect(result.accessibility_features.semantic_markup).toBe(true);
			expect(result.accessibility_features.color_contrast_compliant).toBe(true);
			expect(result.content).toContain("Accessibility Notice");
		});

		it("should track heading structure", async () => {
			const args: GenerateGuideArgs = {
				topic: "Testing",
			};

			const result = await tool.run(args);

			expect(result.accessibility_features.heading_structure).toBe(true);
		});

		it("should enable keyboard navigation for full accessibility", async () => {
			const args: GenerateGuideArgs = {
				topic: "Testing",
				accessibility_level: "full",
			};

			const result = await tool.run(args);

			expect(result.accessibility_features.keyboard_navigation).toBe(true);
		});
	});

	describe("Code Samples and Examples", () => {
		it("should include code samples when requested", async () => {
			const args: GenerateGuideArgs = {
				topic: "REST API",
				include_code_samples: true,
			};

			const result = await tool.run(args);

			expect(result.content).toContain("Code Samples");
			expect(result.content).toContain("```javascript");
			expect(result.content).toContain("```typescript");
			expect(result.content).toContain("REST API");
		});

		it("should include examples when requested", async () => {
			const args: GenerateGuideArgs = {
				topic: "Authentication",
				include_examples: true,
			};

			const result = await tool.run(args);

			expect(result.content).toContain("Practical Examples");
			expect(result.content).toContain("Basic Usage");
			expect(result.content).toContain("Advanced Usage");
			expect(result.content).toContain("Common Use Cases");
		});

		it("should include diagrams when requested", async () => {
			const args: GenerateGuideArgs = {
				topic: "System Architecture",
				include_diagrams: true,
			};

			const result = await tool.run(args);

			expect(result.content).toContain("Diagrams");
			expect(result.content).toContain("```mermaid");
			expect(result.content).toContain("System Architecture");
			expect(result.content).toContain("Process Flow");
		});
	});

	describe("Metadata Generation", () => {
		it("should generate correct metadata", async () => {
			const args: GenerateGuideArgs = {
				topic: "Data Analysis",
				type: "tutorial",
				audience: "developer",
			};

			const result = await tool.run(args);

			expect(result.metadata.topic).toBe("Data Analysis");
			expect(result.metadata.type).toBe("tutorial");
			expect(result.metadata.audience).toBe("developer");
			expect(result.metadata.author).toBe("Cortex OS Documentation Generator");
			expect(result.metadata.version).toBe("1.0.0");
			expect(result.metadata.estimated_reading_time).toBeGreaterThan(0);
			expect(result.metadata.created_at).toBeDefined();
			expect(result.metadata.last_updated).toBeDefined();
		});

		it("should determine difficulty level correctly", async () => {
			const apiArgs: GenerateGuideArgs = {
				topic: "Advanced API",
				type: "api",
			};

			const apiResult = await tool.run(apiArgs);
			expect(apiResult.metadata.difficulty_level).toBe("intermediate");

			const refArgs: GenerateGuideArgs = {
				topic: "Technical Reference",
				type: "reference",
			};

			const refResult = await tool.run(refArgs);
			expect(refResult.metadata.difficulty_level).toBe("advanced");

			const basicArgs: GenerateGuideArgs = {
				topic: "Getting Started",
			};

			const basicResult = await tool.run(basicArgs);
			expect(basicResult.metadata.difficulty_level).toBe("beginner");
		});

		it("should generate prerequisites for technical content", async () => {
			const args: GenerateGuideArgs = {
				topic: "Advanced JavaScript",
				type: "api",
				audience: "developer",
				include_code_samples: true,
			};

			const result = await tool.run(args);

			expect(result.metadata.prerequisites).toContain(
				"Basic understanding of REST APIs",
			);
			expect(result.metadata.prerequisites).toContain("Programming experience");
			expect(result.metadata.prerequisites).toContain(
				"Software development experience",
			);
		});
	});

	describe("Error Handling", () => {
		it("should throw error for empty topic", async () => {
			const args: GenerateGuideArgs = {
				topic: "",
			};

			await expect(tool.run(args)).rejects.toThrow(
				"Topic is required and cannot be empty",
			);
		});

		it("should throw error for invalid type", async () => {
			const args: GenerateGuideArgs = {
				topic: "Test",
				type: "invalid" as any,
			};

			await expect(tool.run(args)).rejects.toThrow("Invalid type");
		});

		it("should throw error for invalid format", async () => {
			const args: GenerateGuideArgs = {
				topic: "Test",
				format: "pdf" as any,
			};

			await expect(tool.run(args)).rejects.toThrow("Invalid format");
		});

		it("should throw error for invalid audience", async () => {
			const args: GenerateGuideArgs = {
				topic: "Test",
				audience: "alien" as any,
			};

			await expect(tool.run(args)).rejects.toThrow("Invalid audience");
		});
	});

	describe("Section Management", () => {
		it("should generate correct section types", async () => {
			const args: GenerateGuideArgs = {
				topic: "API Documentation",
				sections: ["overview", "examples", "troubleshooting"],
			};

			const result = await tool.run(args);

			expect(result.sections[0].type).toBe("overview");
			expect(result.sections[1].type).toBe("example");
			expect(result.sections[2].type).toBe("troubleshooting");
		});

		it("should generate section tags", async () => {
			const args: GenerateGuideArgs = {
				topic: "Authentication",
				type: "api",
			};

			const result = await tool.run(args);

			const authSection = result.sections.find((s) =>
				s.title.toLowerCase().includes("authentication"),
			);

			if (authSection) {
				expect(authSection.tags).toContain("Authentication");
				expect(authSection.tags).toContain("api");
				expect(authSection.tags).toContain("security");
			}
		});

		it("should set correct section levels", async () => {
			const args: GenerateGuideArgs = {
				topic: "Testing Guide",
			};

			const result = await tool.run(args);

			// All sections should be level 2 (## headings)
			result.sections.forEach((section) => {
				expect(section.level).toBe(2);
			});
		});
	});

	describe("File Output", () => {
		it("should return file path when output_path is specified", async () => {
			const args: GenerateGuideArgs = {
				topic: "Test Guide",
				output_path: "/tmp/test-guide",
			};

			const result = await tool.run(args);

			expect(result.file_path).toBe("/tmp/test-guide.md");
		});

		it("should use correct file extension for format", async () => {
			const htmlArgs: GenerateGuideArgs = {
				topic: "HTML Guide",
				format: "html",
				output_path: "/tmp/html-guide",
			};

			const htmlResult = await tool.run(htmlArgs);
			expect(htmlResult.file_path).toBe("/tmp/html-guide.html");

			const jsonArgs: GenerateGuideArgs = {
				topic: "JSON Guide",
				format: "json",
				output_path: "/tmp/json-guide",
			};

			const jsonResult = await tool.run(jsonArgs);
			expect(jsonResult.file_path).toBe("/tmp/json-guide.json");
		});
	});
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
