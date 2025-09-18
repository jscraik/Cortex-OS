import { z } from 'zod';

// Cortex Security MCP Tool Schemas
const RunSemgrepScanInputSchema = z.object({
	targetPath: z.string(),
	rulesets: z.array(z.string()).optional(),
	severity: z.enum(['info', 'warning', 'error']).optional(),
	outputFormat: z.enum(['json', 'text', 'sarif']).default('json'),
});

const AnalyzeVulnerabilitiesInputSchema = z.object({
	filePath: z.string().optional(),
	codeSnippet: z.string().optional(),
	language: z.string().optional(),
	context: z
		.object({
			framework: z.string().optional(),
			dependencies: z.array(z.string()).optional(),
		})
		.optional(),
});

const GetSecurityPolicyInputSchema = z.object({
	policyType: z.enum(['owasp', 'atlas', 'custom']),
	format: z.enum(['json', 'yaml']).default('json'),
});

const ValidateComplianceInputSchema = z.object({
	targetPath: z.string(),
	standards: z.array(z.enum(['owasp-top10', 'cwe-25', 'nist', 'iso27001'])),
	generateReport: z.boolean().default(true),
});

const CheckDependenciesInputSchema = z.object({
	packageFile: z.string(),
	includeDevDependencies: z.boolean().default(false),
	checkLicenses: z.boolean().default(true),
});

// Cortex Security MCP Tool Definitions
export interface CortexSecTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const cortexSecMcpTools: CortexSecTool[] = [
	{
		name: 'run_semgrep_scan',
		description: 'Run Semgrep static analysis security scan',
		inputSchema: RunSemgrepScanInputSchema,
	},
	{
		name: 'analyze_vulnerabilities',
		description: 'Analyze code for security vulnerabilities',
		inputSchema: AnalyzeVulnerabilitiesInputSchema,
	},
	{
		name: 'get_security_policy',
		description: 'Retrieve security policy configuration',
		inputSchema: GetSecurityPolicyInputSchema,
	},
	{
		name: 'validate_compliance',
		description: 'Validate code against security compliance standards',
		inputSchema: ValidateComplianceInputSchema,
	},
	{
		name: 'check_dependencies',
		description: 'Check dependencies for security vulnerabilities',
		inputSchema: CheckDependenciesInputSchema,
	},
];

// Export types for external use
export type RunSemgrepScanInput = z.infer<typeof RunSemgrepScanInputSchema>;
export type AnalyzeVulnerabilitiesInput = z.infer<typeof AnalyzeVulnerabilitiesInputSchema>;
export type GetSecurityPolicyInput = z.infer<typeof GetSecurityPolicyInputSchema>;
export type ValidateComplianceInput = z.infer<typeof ValidateComplianceInputSchema>;
export type CheckDependenciesInput = z.infer<typeof CheckDependenciesInputSchema>;
