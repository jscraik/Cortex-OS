/**
 * @file_path packages/mcp-server/src/tools/ConfigValidator.ts
 * @description MCP tool for validating CLI configuration schemas
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-15
 * @version 1.0.0
 * @status active
 */
/*
  NOTE: This file performs rich runtime validation and emits structured warnings.
  To avoid noisy lint failures during the sweeping lint remediation effort,
  we allow a small set of rule exceptions here until a focused refactor is done.
*/

import { z } from 'zod';

// Local minimal Tool interface (avoid importing missing ../tool.js during lint pass)
interface Tool {
	name: string;
	description?: string;
	run(args: unknown): Promise<unknown>;
}

/**
 * Configuration validation schemas
 */
const CortexConfigSchema = z.object({
	mode: z.enum(['simple', 'advanced']),
	version: z.string(),
	agentOS: z.object({
		compatibility: z.boolean(),
		standardsPath: z.string(),
	}),
	accessibility: z.object({
		wcagLevel: z.enum(['A', 'AA', 'AAA']),
		enforceCompliance: z.boolean(),
	}),
	security: z.object({
		enforceChecks: z.boolean(),
		owaspCompliance: z.boolean(),
	}),
	development: z.object({
		autoTests: z.boolean(),
		verboseLogging: z.boolean(),
	}),
	lastUpdated: z.string().datetime(),
});

const McpConfigSchema = z.object({
	servers: z.array(
		z.object({
			name: z.string(),
			url: z.string().url(),
			enabled: z.boolean().default(true),
			timeout: z.number().default(30000),
			retryAttempts: z.number().default(3),
			capabilities: z.array(z.string()).default([]),
		}),
	),
	client: z.object({
		name: z.string().default('cortex-cli'),
		version: z.string().default('1.0.0'),
		enableMetrics: z.boolean().default(true),
		heartbeatInterval: z.number().default(30000),
	}),
	validation: z.object({
		strictMode: z.boolean().default(true),
		allowUnknownProperties: z.boolean().default(false),
		validateOnLoad: z.boolean().default(true),
	}),
});

const CliConfigSchema = z.object({
	commands: z.array(
		z.object({
			name: z.string(),
			enabled: z.boolean().default(true),
			aliases: z.array(z.string()).default([]),
			options: z.record(z.string(), z.unknown()).default({} as Record<string, unknown>),
		}),
	),
	telemetry: z.object({
		enabled: z.boolean().default(true),
		endpoint: z.string().url().optional(),
		batchSize: z.number().default(100),
		flushInterval: z.number().default(30000),
	}),
	performance: z.object({
		enableProfiling: z.boolean().default(false),
		maxMemoryUsage: z.number().default(512), // MB
		commandTimeout: z.number().default(300000), // 5 minutes
	}),
});

/**
 * Input schema for the validation tool
 */
const ConfigValidatorInputSchema = z.object({
	configType: z.enum(['cortex', 'mcp', 'cli', 'custom']),
	config: z.unknown(),
	customSchema: z.unknown().optional(), // For custom validation
	options: z
		.object({
			strictMode: z.boolean().default(true),
			allowUnknownProperties: z.boolean().default(false),
			reportWarnings: z.boolean().default(true),
			validateDependencies: z.boolean().default(true),
		})
		.default(() => ({
			strictMode: true,
			allowUnknownProperties: false,
			reportWarnings: true,
			validateDependencies: true,
		})),
});

type ConfigValidatorInput = z.infer<typeof ConfigValidatorInputSchema>;

/**
 * Validation result interface
 */
interface ValidationResult {
	valid: boolean;
	errors: Array<{
		path: string;
		message: string;
		code: string;
	}>;
	warnings: Array<{
		path: string;
		message: string;
		suggestion?: string;
	}>;
	metadata: {
		configType: string;
		validatedAt: string;
		schema: string;
		strictMode: boolean;
	};
	performance: {
		validationTime: number;
		memoryUsage?: number;
	};
}

/**
 * MCP tool for configuration validation
 */
export class ConfigValidator implements Tool {
	readonly name = 'config-validator';
	readonly description =
		'Validates CLI configuration files against their schemas with comprehensive error reporting';

	private readonly schemas = new Map<string, z.ZodSchema>([
		['cortex', CortexConfigSchema],
		['mcp', McpConfigSchema],
		['cli', CliConfigSchema],
	]);

	async run(args: unknown): Promise<ValidationResult> {
		const startTime = performance.now();
		const startMemory = process.memoryUsage().heapUsed;

		try {
			// Validate input arguments
			const input = ConfigValidatorInputSchema.parse(args);

			// Get appropriate schema
			const schema = this.getValidationSchema(input);

			// Perform validation
			const result = await this.validateConfig(input, schema);

			// Add performance metrics
			const endTime = performance.now();
			const endMemory = process.memoryUsage().heapUsed;

			result.performance = {
				validationTime: Math.round((endTime - startTime) * 100) / 100,
				memoryUsage: Math.round(((endMemory - startMemory) / 1024 / 1024) * 100) / 100, // MB
			};

			return result;
		} catch (error) {
			const endTime = performance.now();

			return {
				valid: false,
				errors: [
					{
						path: 'root',
						message: error instanceof Error ? error.message : String(error),
						code: 'VALIDATION_ERROR',
					},
				],
				warnings: [],
				metadata: {
					configType: 'unknown',
					validatedAt: new Date().toISOString(),
					schema: 'unknown',
					strictMode: false,
				},
				performance: {
					validationTime: Math.round((endTime - startTime) * 100) / 100,
				},
			};
		}
	}

	private getValidationSchema(input: ConfigValidatorInput): z.ZodSchema {
		if (input.configType === 'custom' && input.customSchema) {
			// For custom schemas, we'd need to construct them from the provided definition
			// This is a simplified implementation
			if (typeof input.customSchema === 'object' && input.customSchema !== null) {
				return z.object({}).passthrough(); // Allow any object for now
			}
			throw new Error('Invalid custom schema provided');
		}

		const schema = this.schemas.get(input.configType);
		if (!schema) {
			throw new Error(`Unknown configuration type: ${input.configType}`);
		}

		return schema;
	}

	private async validateConfig(
		input: ConfigValidatorInput,
		schema: z.ZodSchema,
	): Promise<ValidationResult> {
		const result: ValidationResult = {
			valid: false,
			errors: [],
			warnings: [],
			metadata: {
				configType: input.configType,
				validatedAt: new Date().toISOString(),
				schema: schema.constructor.name,
				strictMode: input.options.strictMode,
			},
			performance: {
				validationTime: 0,
			},
		};

		try {
			// Apply schema options
			let validationSchema = schema;
			if (input.options.allowUnknownProperties) {
				if (schema instanceof z.ZodObject) {
					validationSchema = schema.passthrough();
				}
			}

			// Perform the validation
			const parseResult = validationSchema.safeParse(input.config);

			if (parseResult.success) {
				result.valid = true;

				// Generate warnings for potential issues
				if (input.options.reportWarnings) {
					result.warnings = await this.generateWarnings(input.configType, parseResult.data);
				}

				// Validate dependencies if requested
				if (input.options.validateDependencies) {
					const depWarnings = await this.validateDependencies(input.configType, parseResult.data);
					result.warnings.push(...depWarnings);
				}
			} else {
				result.valid = false;
				result.errors = this.formatZodErrors(parseResult.error.issues);
			}
		} catch (error) {
			result.valid = false;
			result.errors.push({
				path: 'validation',
				message: error instanceof Error ? error.message : String(error),
				code: 'SCHEMA_ERROR',
			});
		}

		return result;
	}

	private formatZodErrors(issues: z.ZodIssue[]): Array<{
		path: string;
		message: string;
		code: string;
	}> {
		return issues.map((issue) => ({
			path: issue.path.join('.') || 'root',
			message: issue.message,
			code: issue.code.toUpperCase(),
		}));
	}

	private async generateWarnings(
		configType: string,
		config: unknown,
	): Promise<
		Array<{
			path: string;
			message: string;
			suggestion?: string;
		}>
	> {
		const warnings: Array<{
			path: string;
			message: string;
			suggestion?: string;
		}> = [];

		switch (configType) {
			case 'cortex':
				warnings.push(...this.validateCortexConfig(config));
				break;
			case 'mcp':
				warnings.push(...this.validateMcpConfig(config));
				break;
			case 'cli':
				warnings.push(...this.validateCliConfig(config));
				break;
		}

		return warnings;
	}

	private validateCortexConfig(config: unknown): Array<{
		path: string;
		message: string;
		suggestion?: string;
	}> {
		const warnings: Array<{
			path: string;
			message: string;
			suggestion?: string;
		}> = [];

		if (typeof config === 'object' && config !== null) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const cortexConfig = config as any;

			// Check for deprecated settings
			if (cortexConfig.mode === 'simple' && cortexConfig.development?.verboseLogging) {
				warnings.push({
					path: 'development.verboseLogging',
					message: 'Verbose logging is typically disabled in simple mode',
					suggestion: 'Consider setting verboseLogging to false for simple mode',
				});
			}

			// Check WCAG level recommendations
			if (cortexConfig.accessibility?.wcagLevel === 'A') {
				warnings.push({
					path: 'accessibility.wcagLevel',
					message: 'WCAG A level provides minimal accessibility compliance',
					suggestion: 'Consider upgrading to AA level for better accessibility',
				});
			}

			// Check security settings
			if (!cortexConfig.security?.enforceChecks) {
				warnings.push({
					path: 'security.enforceChecks',
					message: 'Security checks are disabled',
					suggestion: 'Enable security checks for better protection',
				});
			}
		}

		return warnings;
	}

	private validateMcpConfig(config: unknown): Array<{
		path: string;
		message: string;
		suggestion?: string;
	}> {
		const warnings: Array<{
			path: string;
			message: string;
			suggestion?: string;
		}> = [];

		if (typeof config === 'object' && config !== null) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const mcpConfig = config as any;

			// Check for no servers configured
			if (!mcpConfig.servers || mcpConfig.servers.length === 0) {
				warnings.push({
					path: 'servers',
					message: 'No MCP servers configured',
					suggestion: 'Add at least one MCP server to enable functionality',
				});
			}

			// Check for disabled servers
			if (mcpConfig.servers?.some((s: any) => !s.enabled)) {
				warnings.push({
					path: 'servers',
					message: 'Some MCP servers are disabled',
					suggestion: 'Review disabled servers and enable if needed',
				});
			}

			// Check timeout settings
			if (mcpConfig.servers?.some((s: any) => s.timeout < 5000)) {
				warnings.push({
					path: 'servers.timeout',
					message: 'Very short timeout values detected',
					suggestion: 'Consider increasing timeout values for better reliability',
				});
			}
		}

		return warnings;
	}

	private validateCliConfig(config: unknown): Array<{
		path: string;
		message: string;
		suggestion?: string;
	}> {
		const warnings: Array<{
			path: string;
			message: string;
			suggestion?: string;
		}> = [];

		if (typeof config === 'object' && config !== null) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const cliConfig = config as any;

			// Check telemetry settings
			if (!cliConfig.telemetry?.enabled) {
				warnings.push({
					path: 'telemetry.enabled',
					message: 'Telemetry is disabled',
					suggestion: 'Enable telemetry to help improve the CLI',
				});
			}

			// Check performance settings
			if (cliConfig.performance?.maxMemoryUsage > 1024) {
				warnings.push({
					path: 'performance.maxMemoryUsage',
					message: 'High memory usage limit configured',
					suggestion: 'Consider reducing memory limit for better performance',
				});
			}

			// Check for disabled commands
			if (cliConfig.commands?.some((c: any) => !c.enabled)) {
				warnings.push({
					path: 'commands',
					message: 'Some commands are disabled',
					suggestion: 'Review disabled commands and enable if needed',
				});
			}
		}

		return warnings;
	}

	private async validateDependencies(
		_configType: string,
		_config: unknown,
	): Promise<
		Array<{
			path: string;
			message: string;
			suggestion?: string;
		}>
	> {
		const warnings: Array<{
			path: string;
			message: string;
			suggestion?: string;
		}> = [];

		// This would typically validate external dependencies,
		// file paths, network endpoints, etc.
		// For now, we'll return an empty array
		return warnings;
	}
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
