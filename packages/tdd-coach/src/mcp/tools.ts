import { z } from 'zod';

// TDD Coach MCP Tool Schemas
const AnalyzeTestCoverageInputSchema = z.object({
	targetPath: z.string(),
	includeThreshold: z.boolean().default(true),
	format: z.enum(['summary', 'detailed', 'json']).default('summary'),
});

const GenerateTestInputSchema = z.object({
	sourceFile: z.string(),
	testType: z.enum(['unit', 'integration', 'e2e']).default('unit'),
	framework: z.enum(['vitest', 'jest', 'mocha', 'cypress']).optional(),
	includeEdgeCases: z.boolean().default(true),
});

const RefactorTestInputSchema = z.object({
	testFile: z.string(),
	improvements: z.array(z.enum(['readability', 'performance', 'maintainability', 'coverage'])),
	preserveExisting: z.boolean().default(true),
});

const ValidateTDDFlowInputSchema = z.object({
	sessionId: z.string(),
	currentPhase: z.enum(['red', 'green', 'refactor']),
	files: z.array(z.string()),
});

const CoachRecommendationInputSchema = z.object({
	codebase: z.string(),
	testStrategy: z.enum(['tdd', 'bdd', 'mixed']).optional(),
	experience: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
});

// TDD Coach MCP Tool Definitions
export interface TDDCoachTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const tddCoachMcpTools: TDDCoachTool[] = [
	{
		name: 'analyze_test_coverage',
		description: 'Analyze test coverage and provide insights',
		inputSchema: AnalyzeTestCoverageInputSchema,
	},
	{
		name: 'generate_test',
		description: 'Generate test cases for source code',
		inputSchema: GenerateTestInputSchema,
	},
	{
		name: 'refactor_test',
		description: 'Refactor existing tests for better quality',
		inputSchema: RefactorTestInputSchema,
	},
	{
		name: 'validate_tdd_flow',
		description: 'Validate TDD red-green-refactor cycle',
		inputSchema: ValidateTDDFlowInputSchema,
	},
	{
		name: 'coach_recommendation',
		description: 'Get TDD coaching recommendations',
		inputSchema: CoachRecommendationInputSchema,
	},
];

// Export types for external use
export type AnalyzeTestCoverageInput = z.infer<typeof AnalyzeTestCoverageInputSchema>;
export type GenerateTestInput = z.infer<typeof GenerateTestInputSchema>;
export type RefactorTestInput = z.infer<typeof RefactorTestInputSchema>;
export type ValidateTDDFlowInput = z.infer<typeof ValidateTDDFlowInputSchema>;
export type CoachRecommendationInput = z.infer<typeof CoachRecommendationInputSchema>;
