import { cortexSecMcpTools } from '@cortex-os/cortex-sec';
import { z } from 'zod';

const SecurityFindingSchema = z.object({
	id: z.string(),
	title: z.string(),
	severity: z.enum(['info', 'warning', 'error', 'critical']),
	description: z.string(),
	location: z
		.object({
			file: z.string().optional(),
			line: z.number().int().positive().optional(),
		})
		.optional(),
	references: z.array(z.string()).optional(),
	remediation: z.string().optional(),
});

const RunSemgrepScanOutputSchema = z.object({
	scanId: z.string(),
	startedAt: z.string(),
	completedAt: z.string().optional(),
	status: z.enum(['queued', 'running', 'completed', 'failed']).default('queued'),
	findings: z.array(SecurityFindingSchema),
	summary: z
		.object({
			totalFindings: z.number().int().nonnegative(),
			critical: z.number().int().nonnegative(),
			high: z.number().int().nonnegative(),
			medium: z.number().int().nonnegative(),
			low: z.number().int().nonnegative(),
		})
		.default({ totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0 }),
	reportPath: z.string().optional(),
});

const AnalyzeVulnerabilitiesOutputSchema = z.object({
	analysisId: z.string(),
	generatedAt: z.string(),
	riskScore: z.number().min(0).max(1).optional(),
	findings: z.array(SecurityFindingSchema),
	recommendedActions: z.array(z.string()).optional(),
});

const GetSecurityPolicyOutputSchema = z.object({
	policyId: z.string(),
	policyType: z.enum(['owasp', 'atlas', 'custom']),
	version: z.string(),
	content: z.string(),
	checksum: z.string().optional(),
	updatedAt: z.string(),
});

const ComplianceViolationSchema = z.object({
	id: z.string(),
	standard: z.enum(['owasp-top10', 'cwe-25', 'nist', 'iso27001']),
	rule: z.string(),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	description: z.string(),
	location: z
		.object({
			file: z.string().optional(),
			line: z.number().int().positive().optional(),
		})
		.optional(),
	remediation: z.string().optional(),
});

const ValidateComplianceOutputSchema = z.object({
	reportId: z.string(),
	generatedAt: z.string(),
	status: z.enum(['pass', 'fail', 'warning']),
	standards: z.array(z.enum(['owasp-top10', 'cwe-25', 'nist', 'iso27001'])),
	violations: z.array(ComplianceViolationSchema),
	summary: z.string().optional(),
});

const DependencyIssueSchema = z.object({
	name: z.string(),
	currentVersion: z.string(),
	recommendedVersion: z.string().optional(),
	severity: z.enum(['info', 'warning', 'error', 'critical']),
	advisoryUrl: z.string().url().optional(),
	remediation: z.string().optional(),
});

const CheckDependenciesOutputSchema = z.object({
	reportId: z.string(),
	generatedAt: z.string(),
	dependenciesChecked: z.number().int().nonnegative(),
	vulnerable: z.array(DependencyIssueSchema),
	outdated: z.array(DependencyIssueSchema).optional(),
	toolVersion: z.string().optional(),
});

type CortexSecMcpTool = {
	name:
		| 'run_semgrep_scan'
		| 'analyze_vulnerabilities'
		| 'get_security_policy'
		| 'validate_compliance'
		| 'check_dependencies';
	description: string;
	inputSchema: z.ZodSchema;
};

// Common error shape
export const ErrorResponseSchema = z.object({
	code: z.string(),
	message: z.string(),
	details: z.record(z.any()).optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// System management schemas
export const SystemStatusInputSchema = z.object({
	include: z
		.array(z.enum(['services', 'resources', 'uptime', 'version']))
		.optional()
		.default(['services', 'resources']),
});
export const SystemStatusOutputSchema = z.object({
	services: z
		.array(
			z.object({
				name: z.string(),
				status: z.enum(['running', 'stopped', 'degraded']),
				version: z.string().optional(),
			}),
		)
		.optional(),
	resources: z
		.object({
			cpu: z.number().min(0).max(100).optional(),
			memoryMB: z.number().int().nonnegative().optional(),
			load: z.number().nonnegative().optional(),
		})
		.optional(),
	uptimeSec: z.number().int().nonnegative().optional(),
	version: z.string().optional(),
});

export const RestartServiceInputSchema = z.object({
	service: z.string().min(1),
	mode: z.enum(['graceful', 'force']).default('graceful'),
	timeoutMs: z.number().int().positive().max(60_000).default(10_000),
});
export const RestartServiceOutputSchema = z.object({
	service: z.string(),
	previousStatus: z.string(),
	newStatus: z.string(),
	durationMs: z.number().int().positive(),
	mode: z.enum(['graceful', 'force']),
});

export const SystemResourcesInputSchema = z.object({
	sampleWindowSec: z.number().int().positive().max(300).default(5),
});
export const SystemResourcesOutputSchema = z.object({
	cpu: z.number().min(0).max(100),
	memory: z.object({
		usedMB: z.number().int().nonnegative(),
		totalMB: z.number().int().positive(),
	}),
	loadAvg: z.tuple([z.number(), z.number(), z.number()]),
});

// Orchestration schemas
export const RunWorkflowInputSchema = z.object({
	workflow: z.string().min(1),
	input: z.record(z.any()).optional(),
	traceId: z.string().optional(),
	async: z.boolean().default(true),
});
export const RunWorkflowOutputSchema = z.object({
	workflow: z.string(),
	runId: z.string(),
	status: z.enum(['queued', 'running', 'completed', 'failed']),
	startedAt: z.string(),
	finishedAt: z.string().optional(),
	result: z.any().optional(),
	error: ErrorResponseSchema.optional(),
});

export const GetWorkflowStatusInputSchema = z.object({
	runId: z.string().min(1),
});
export const GetWorkflowStatusOutputSchema = RunWorkflowOutputSchema;

export const ListWorkflowsInputSchema = z.object({
	limit: z.number().int().positive().max(100).default(25),
});
export const ListWorkflowsOutputSchema = z.object({
	workflows: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			description: z.string().optional(),
			version: z.string().optional(),
		}),
	),
});

// Configuration management schemas
export const ConfigGetInputSchema = z.object({ key: z.string().min(1) });
export const ConfigGetOutputSchema = z.object({
	key: z.string(),
	value: z.any(),
	source: z.enum(['env', 'file', 'runtime', 'default']).optional(),
});

export const ConfigSetInputSchema = z.object({
	key: z.string().min(1),
	value: z.any(),
	scope: z.enum(['runtime']).default('runtime'),
});
export const ConfigSetOutputSchema = z.object({
	key: z.string(),
	previous: z.any().optional(),
	value: z.any(),
	scope: z.enum(['runtime']),
});

export const ConfigListInputSchema = z.object({
	prefix: z.string().optional(),
	limit: z.number().int().positive().max(200).default(100),
});
export const ConfigListOutputSchema = z.object({
	items: z.array(
		z.object({
			key: z.string(),
			value: z.any(),
			source: z.string().optional(),
		}),
	),
});

export type ToolComplianceMetadata = {
	domain: 'security' | 'compliance';
	standards: string[];
	recommendedUsage: string;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	autoEventEmission?: boolean;
};

export type ToolDefinition = {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
	outputSchema: z.ZodSchema;
	secure?: boolean; // requires elevated permission
	cacheTtlMs?: number; // optional caching hint
	category?: 'system' | 'orchestration' | 'config' | 'security';
	tags?: string[];
	compliance?: ToolComplianceMetadata;
};

const systemMcpTools: ToolDefinition[] = [
	{
		name: 'system.status',
		description: 'Get current system/service status and resource usage',
		inputSchema: SystemStatusInputSchema,
		outputSchema: SystemStatusOutputSchema,
	},
	{
		name: 'system.restart_service',
		description: 'Restart a managed service',
		inputSchema: RestartServiceInputSchema,
		outputSchema: RestartServiceOutputSchema,
		secure: true,
	},
	{
		name: 'system.resources',
		description: 'Sample system resource usage',
		inputSchema: SystemResourcesInputSchema,
		outputSchema: SystemResourcesOutputSchema,
	},
	{
		name: 'orchestration.run_workflow',
		description: 'Start a workflow execution',
		inputSchema: RunWorkflowInputSchema,
		outputSchema: RunWorkflowOutputSchema,
	},
	{
		name: 'orchestration.get_workflow_status',
		description: 'Get workflow execution status',
		inputSchema: GetWorkflowStatusInputSchema,
		outputSchema: GetWorkflowStatusOutputSchema,
	},
	{
		name: 'orchestration.list_workflows',
		description: 'List available workflows',
		inputSchema: ListWorkflowsInputSchema,
		outputSchema: ListWorkflowsOutputSchema,
		cacheTtlMs: 10_000,
	},
	{
		name: 'config.get',
		description: 'Retrieve a configuration value',
		inputSchema: ConfigGetInputSchema,
		outputSchema: ConfigGetOutputSchema,
	},
	{
		name: 'config.set',
		description: 'Set a runtime configuration value',
		inputSchema: ConfigSetInputSchema,
		outputSchema: ConfigSetOutputSchema,
		secure: true,
	},
	{
		name: 'config.list',
		description: 'List configuration values',
		inputSchema: ConfigListInputSchema,
		outputSchema: ConfigListOutputSchema,
		cacheTtlMs: 5_000,
	},
];

const securityToolOutputSchemas: Record<string, z.ZodSchema> = {
	run_semgrep_scan: RunSemgrepScanOutputSchema,
	analyze_vulnerabilities: AnalyzeVulnerabilitiesOutputSchema,
	get_security_policy: GetSecurityPolicyOutputSchema,
	validate_compliance: ValidateComplianceOutputSchema,
	check_dependencies: CheckDependenciesOutputSchema,
};

const securityToolComplianceMetadata: Record<string, ToolComplianceMetadata> = {
	run_semgrep_scan: {
		domain: 'security',
		standards: ['owasp-top10', 'cwe-25'],
		recommendedUsage:
			'Run before major merges or releases to surface Semgrep policy findings for brAInwav.',
		riskLevel: 'high',
		autoEventEmission: true,
	},
	analyze_vulnerabilities: {
		domain: 'security',
		standards: ['owasp-top10', 'cwe-25'],
		recommendedUsage: 'Use to triage suspected vulnerabilities and capture remediation steps.',
		riskLevel: 'medium',
	},
	get_security_policy: {
		domain: 'security',
		standards: ['iso27001', 'nist'],
		recommendedUsage: 'Retrieve brAInwav baseline policies when planning remediation work.',
		riskLevel: 'low',
	},
	validate_compliance: {
		domain: 'compliance',
		standards: ['iso27001', 'nist'],
		recommendedUsage:
			'Run after changes touching regulated surfaces to validate compliance posture.',
		riskLevel: 'high',
		autoEventEmission: true,
	},
	check_dependencies: {
		domain: 'security',
		standards: ['owasp-top10'],
		recommendedUsage: 'Assess dependency manifests for known CVEs and license concerns.',
		riskLevel: 'medium',
	},
};

const securityMcpTools: ToolDefinition[] = (cortexSecMcpTools as CortexSecMcpTool[]).map((tool) => {
	const outputSchema = securityToolOutputSchemas[tool.name];
	if (!outputSchema) {
		throw new Error(
			`brAInwav cortex-sec integration error: missing output schema for ${tool.name}`,
		);
	}
	return {
		name: `security.${tool.name}`,
		description: `brAInwav security · ${tool.description}`,
		inputSchema: tool.inputSchema,
		outputSchema,
		secure: true,
		category: 'security',
		tags: ['brAInwav', 'security', 'compliance'],
		compliance: securityToolComplianceMetadata[tool.name],
	};
});

export const cortexOsMcpTools: ToolDefinition[] = [...systemMcpTools, ...securityMcpTools];

export type CortexOsToolName = (typeof cortexOsMcpTools)[number]['name'];

export function getToolDefinition(name: string): ToolDefinition | undefined {
	return cortexOsMcpTools.find((t) => t.name === name);
}
