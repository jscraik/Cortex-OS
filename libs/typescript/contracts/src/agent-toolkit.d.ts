import { z } from 'zod';
export declare const AgentToolkitBaseResultSchema: z.ZodObject<
	{
		tool: z.ZodString;
		op: z.ZodString;
		inputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
		timestamp: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		tool: string;
		op: string;
		inputs: Record<string, unknown>;
		timestamp?: string | undefined;
	},
	{
		tool: string;
		op: string;
		inputs: Record<string, unknown>;
		timestamp?: string | undefined;
	}
>;
export declare const AgentToolkitSearchInputSchema: z.ZodObject<
	{
		pattern: z.ZodString;
		path: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		path: string;
		pattern: string;
	},
	{
		path: string;
		pattern: string;
	}
>;
export declare const AgentToolkitSearchMatchSchema: z.ZodObject<
	{
		file: z.ZodString;
		line: z.ZodNumber;
		text: z.ZodString;
		column: z.ZodOptional<z.ZodNumber>;
	},
	'strip',
	z.ZodTypeAny,
	{
		text: string;
		file: string;
		line: number;
		column?: number | undefined;
	},
	{
		text: string;
		file: string;
		line: number;
		column?: number | undefined;
	}
>;
export declare const AgentToolkitSearchResultSchema: z.ZodObject<
	{
		timestamp: z.ZodOptional<z.ZodString>;
	} & {
		tool: z.ZodUnion<
			[
				z.ZodUnion<[z.ZodLiteral<'ripgrep'>, z.ZodLiteral<'semgrep'>]>,
				z.ZodLiteral<'ast-grep'>,
			]
		>;
		op: z.ZodLiteral<'search'>;
		inputs: z.ZodObject<
			{
				pattern: z.ZodString;
				path: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				path: string;
				pattern: string;
			},
			{
				path: string;
				pattern: string;
			}
		>;
		results: z.ZodArray<
			z.ZodObject<
				{
					file: z.ZodString;
					line: z.ZodNumber;
					text: z.ZodString;
					column: z.ZodOptional<z.ZodNumber>;
				},
				'strip',
				z.ZodTypeAny,
				{
					text: string;
					file: string;
					line: number;
					column?: number | undefined;
				},
				{
					text: string;
					file: string;
					line: number;
					column?: number | undefined;
				}
			>,
			'many'
		>;
		error: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		tool: 'ripgrep' | 'semgrep' | 'ast-grep';
		op: 'search';
		inputs: {
			path: string;
			pattern: string;
		};
		results: {
			text: string;
			file: string;
			line: number;
			column?: number | undefined;
		}[];
		error?: string | undefined;
		timestamp?: string | undefined;
	},
	{
		tool: 'ripgrep' | 'semgrep' | 'ast-grep';
		op: 'search';
		inputs: {
			path: string;
			pattern: string;
		};
		results: {
			text: string;
			file: string;
			line: number;
			column?: number | undefined;
		}[];
		error?: string | undefined;
		timestamp?: string | undefined;
	}
>;
export declare const AgentToolkitCodemodInputSchema: z.ZodObject<
	{
		find: z.ZodString;
		replace: z.ZodString;
		path: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		path: string;
		find: string;
		replace: string;
	},
	{
		path: string;
		find: string;
		replace: string;
	}
>;
export declare const AgentToolkitCodemodChangeSchema: z.ZodObject<
	{
		file: z.ZodString;
		changes: z.ZodNumber;
		preview: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		file: string;
		changes: number;
		preview?: string | undefined;
	},
	{
		file: string;
		changes: number;
		preview?: string | undefined;
	}
>;
export declare const AgentToolkitCodemodResultSchema: z.ZodObject<
	{
		timestamp: z.ZodOptional<z.ZodString>;
	} & {
		tool: z.ZodLiteral<'comby'>;
		op: z.ZodLiteral<'rewrite'>;
		inputs: z.ZodObject<
			{
				find: z.ZodString;
				replace: z.ZodString;
				path: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				path: string;
				find: string;
				replace: string;
			},
			{
				path: string;
				find: string;
				replace: string;
			}
		>;
		results: z.ZodArray<
			z.ZodObject<
				{
					file: z.ZodString;
					changes: z.ZodNumber;
					preview: z.ZodOptional<z.ZodString>;
				},
				'strip',
				z.ZodTypeAny,
				{
					file: string;
					changes: number;
					preview?: string | undefined;
				},
				{
					file: string;
					changes: number;
					preview?: string | undefined;
				}
			>,
			'many'
		>;
		error: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		tool: 'comby';
		op: 'rewrite';
		inputs: {
			path: string;
			find: string;
			replace: string;
		};
		results: {
			file: string;
			changes: number;
			preview?: string | undefined;
		}[];
		error?: string | undefined;
		timestamp?: string | undefined;
	},
	{
		tool: 'comby';
		op: 'rewrite';
		inputs: {
			path: string;
			find: string;
			replace: string;
		};
		results: {
			file: string;
			changes: number;
			preview?: string | undefined;
		}[];
		error?: string | undefined;
		timestamp?: string | undefined;
	}
>;
export declare const AgentToolkitValidationInputSchema: z.ZodObject<
	{
		files: z.ZodArray<z.ZodString, 'many'>;
	},
	'strip',
	z.ZodTypeAny,
	{
		files: string[];
	},
	{
		files: string[];
	}
>;
export declare const AgentToolkitValidationIssueSchema: z.ZodObject<
	{
		file: z.ZodString;
		line: z.ZodOptional<z.ZodNumber>;
		column: z.ZodOptional<z.ZodNumber>;
		severity: z.ZodEnum<['error', 'warning', 'info']>;
		message: z.ZodString;
		rule: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		message: string;
		file: string;
		severity: 'error' | 'warning' | 'info';
		line?: number | undefined;
		column?: number | undefined;
		rule?: string | undefined;
	},
	{
		message: string;
		file: string;
		severity: 'error' | 'warning' | 'info';
		line?: number | undefined;
		column?: number | undefined;
		rule?: string | undefined;
	}
>;
export declare const AgentToolkitValidationResultSchema: z.ZodObject<
	{
		timestamp: z.ZodOptional<z.ZodString>;
	} & {
		tool: z.ZodUnion<
			[
				z.ZodUnion<
					[
						z.ZodUnion<[z.ZodLiteral<'eslint'>, z.ZodLiteral<'ruff'>]>,
						z.ZodLiteral<'cargo'>,
					]
				>,
				z.ZodLiteral<'pytest'>,
			]
		>;
		op: z.ZodLiteral<'validate'>;
		inputs: z.ZodObject<
			{
				files: z.ZodArray<z.ZodString, 'many'>;
			},
			'strip',
			z.ZodTypeAny,
			{
				files: string[];
			},
			{
				files: string[];
			}
		>;
		results: z.ZodArray<
			z.ZodObject<
				{
					file: z.ZodString;
					line: z.ZodOptional<z.ZodNumber>;
					column: z.ZodOptional<z.ZodNumber>;
					severity: z.ZodEnum<['error', 'warning', 'info']>;
					message: z.ZodString;
					rule: z.ZodOptional<z.ZodString>;
				},
				'strip',
				z.ZodTypeAny,
				{
					message: string;
					file: string;
					severity: 'error' | 'warning' | 'info';
					line?: number | undefined;
					column?: number | undefined;
					rule?: string | undefined;
				},
				{
					message: string;
					file: string;
					severity: 'error' | 'warning' | 'info';
					line?: number | undefined;
					column?: number | undefined;
					rule?: string | undefined;
				}
			>,
			'many'
		>;
		summary: z.ZodObject<
			{
				total: z.ZodNumber;
				errors: z.ZodNumber;
				warnings: z.ZodNumber;
			},
			'strip',
			z.ZodTypeAny,
			{
				total: number;
				errors: number;
				warnings: number;
			},
			{
				total: number;
				errors: number;
				warnings: number;
			}
		>;
		error: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		tool: 'eslint' | 'ruff' | 'cargo' | 'pytest';
		op: 'validate';
		inputs: {
			files: string[];
		};
		results: {
			message: string;
			file: string;
			severity: 'error' | 'warning' | 'info';
			line?: number | undefined;
			column?: number | undefined;
			rule?: string | undefined;
		}[];
		summary: {
			total: number;
			errors: number;
			warnings: number;
		};
		error?: string | undefined;
		timestamp?: string | undefined;
	},
	{
		tool: 'eslint' | 'ruff' | 'cargo' | 'pytest';
		op: 'validate';
		inputs: {
			files: string[];
		};
		results: {
			message: string;
			file: string;
			severity: 'error' | 'warning' | 'info';
			line?: number | undefined;
			column?: number | undefined;
			rule?: string | undefined;
		}[];
		summary: {
			total: number;
			errors: number;
			warnings: number;
		};
		error?: string | undefined;
		timestamp?: string | undefined;
	}
>;
export declare const AgentToolkitExecutionStartedEventSchema: z.ZodObject<
	{
		toolId: z.ZodString;
		toolName: z.ZodString;
		operation: z.ZodString;
		inputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
		requestedBy: z.ZodString;
		sessionId: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		inputs: Record<string, unknown>;
		toolId: string;
		toolName: string;
		operation: string;
		requestedBy: string;
		sessionId?: string | undefined;
	},
	{
		inputs: Record<string, unknown>;
		toolId: string;
		toolName: string;
		operation: string;
		requestedBy: string;
		sessionId?: string | undefined;
	}
>;
export declare const AgentToolkitExecutionCompletedEventSchema: z.ZodObject<
	{
		toolId: z.ZodString;
		toolName: z.ZodString;
		operation: z.ZodString;
		inputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
		results: z.ZodUnknown;
		duration: z.ZodNumber;
		requestedBy: z.ZodString;
		sessionId: z.ZodOptional<z.ZodString>;
		success: z.ZodBoolean;
		error: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		duration: number;
		inputs: Record<string, unknown>;
		toolId: string;
		toolName: string;
		operation: string;
		requestedBy: string;
		success: boolean;
		error?: string | undefined;
		results?: unknown;
		sessionId?: string | undefined;
	},
	{
		duration: number;
		inputs: Record<string, unknown>;
		toolId: string;
		toolName: string;
		operation: string;
		requestedBy: string;
		success: boolean;
		error?: string | undefined;
		results?: unknown;
		sessionId?: string | undefined;
	}
>;
export declare const AgentToolkitExecutionFailedEventSchema: z.ZodObject<
	{
		toolId: z.ZodString;
		toolName: z.ZodString;
		operation: z.ZodString;
		inputs: z.ZodRecord<z.ZodString, z.ZodUnknown>;
		error: z.ZodString;
		duration: z.ZodNumber;
		requestedBy: z.ZodString;
		sessionId: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		error: string;
		duration: number;
		inputs: Record<string, unknown>;
		toolId: string;
		toolName: string;
		operation: string;
		requestedBy: string;
		sessionId?: string | undefined;
	},
	{
		error: string;
		duration: number;
		inputs: Record<string, unknown>;
		toolId: string;
		toolName: string;
		operation: string;
		requestedBy: string;
		sessionId?: string | undefined;
	}
>;
export declare const AgentToolkitInputSchema: z.ZodUnion<
	[
		z.ZodObject<
			{
				pattern: z.ZodString;
				path: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				path: string;
				pattern: string;
			},
			{
				path: string;
				pattern: string;
			}
		>,
		z.ZodObject<
			{
				find: z.ZodString;
				replace: z.ZodString;
				path: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				path: string;
				find: string;
				replace: string;
			},
			{
				path: string;
				find: string;
				replace: string;
			}
		>,
		z.ZodObject<
			{
				files: z.ZodArray<z.ZodString, 'many'>;
			},
			'strip',
			z.ZodTypeAny,
			{
				files: string[];
			},
			{
				files: string[];
			}
		>,
	]
>;
export declare const AgentToolkitResultSchema: z.ZodUnion<
	[
		z.ZodObject<
			{
				timestamp: z.ZodOptional<z.ZodString>;
			} & {
				tool: z.ZodUnion<
					[
						z.ZodUnion<[z.ZodLiteral<'ripgrep'>, z.ZodLiteral<'semgrep'>]>,
						z.ZodLiteral<'ast-grep'>,
					]
				>;
				op: z.ZodLiteral<'search'>;
				inputs: z.ZodObject<
					{
						pattern: z.ZodString;
						path: z.ZodString;
					},
					'strip',
					z.ZodTypeAny,
					{
						path: string;
						pattern: string;
					},
					{
						path: string;
						pattern: string;
					}
				>;
				results: z.ZodArray<
					z.ZodObject<
						{
							file: z.ZodString;
							line: z.ZodNumber;
							text: z.ZodString;
							column: z.ZodOptional<z.ZodNumber>;
						},
						'strip',
						z.ZodTypeAny,
						{
							text: string;
							file: string;
							line: number;
							column?: number | undefined;
						},
						{
							text: string;
							file: string;
							line: number;
							column?: number | undefined;
						}
					>,
					'many'
				>;
				error: z.ZodOptional<z.ZodString>;
			},
			'strip',
			z.ZodTypeAny,
			{
				tool: 'ripgrep' | 'semgrep' | 'ast-grep';
				op: 'search';
				inputs: {
					path: string;
					pattern: string;
				};
				results: {
					text: string;
					file: string;
					line: number;
					column?: number | undefined;
				}[];
				error?: string | undefined;
				timestamp?: string | undefined;
			},
			{
				tool: 'ripgrep' | 'semgrep' | 'ast-grep';
				op: 'search';
				inputs: {
					path: string;
					pattern: string;
				};
				results: {
					text: string;
					file: string;
					line: number;
					column?: number | undefined;
				}[];
				error?: string | undefined;
				timestamp?: string | undefined;
			}
		>,
		z.ZodObject<
			{
				timestamp: z.ZodOptional<z.ZodString>;
			} & {
				tool: z.ZodLiteral<'comby'>;
				op: z.ZodLiteral<'rewrite'>;
				inputs: z.ZodObject<
					{
						find: z.ZodString;
						replace: z.ZodString;
						path: z.ZodString;
					},
					'strip',
					z.ZodTypeAny,
					{
						path: string;
						find: string;
						replace: string;
					},
					{
						path: string;
						find: string;
						replace: string;
					}
				>;
				results: z.ZodArray<
					z.ZodObject<
						{
							file: z.ZodString;
							changes: z.ZodNumber;
							preview: z.ZodOptional<z.ZodString>;
						},
						'strip',
						z.ZodTypeAny,
						{
							file: string;
							changes: number;
							preview?: string | undefined;
						},
						{
							file: string;
							changes: number;
							preview?: string | undefined;
						}
					>,
					'many'
				>;
				error: z.ZodOptional<z.ZodString>;
			},
			'strip',
			z.ZodTypeAny,
			{
				tool: 'comby';
				op: 'rewrite';
				inputs: {
					path: string;
					find: string;
					replace: string;
				};
				results: {
					file: string;
					changes: number;
					preview?: string | undefined;
				}[];
				error?: string | undefined;
				timestamp?: string | undefined;
			},
			{
				tool: 'comby';
				op: 'rewrite';
				inputs: {
					path: string;
					find: string;
					replace: string;
				};
				results: {
					file: string;
					changes: number;
					preview?: string | undefined;
				}[];
				error?: string | undefined;
				timestamp?: string | undefined;
			}
		>,
		z.ZodObject<
			{
				timestamp: z.ZodOptional<z.ZodString>;
			} & {
				tool: z.ZodUnion<
					[
						z.ZodUnion<
							[
								z.ZodUnion<[z.ZodLiteral<'eslint'>, z.ZodLiteral<'ruff'>]>,
								z.ZodLiteral<'cargo'>,
							]
						>,
						z.ZodLiteral<'pytest'>,
					]
				>;
				op: z.ZodLiteral<'validate'>;
				inputs: z.ZodObject<
					{
						files: z.ZodArray<z.ZodString, 'many'>;
					},
					'strip',
					z.ZodTypeAny,
					{
						files: string[];
					},
					{
						files: string[];
					}
				>;
				results: z.ZodArray<
					z.ZodObject<
						{
							file: z.ZodString;
							line: z.ZodOptional<z.ZodNumber>;
							column: z.ZodOptional<z.ZodNumber>;
							severity: z.ZodEnum<['error', 'warning', 'info']>;
							message: z.ZodString;
							rule: z.ZodOptional<z.ZodString>;
						},
						'strip',
						z.ZodTypeAny,
						{
							message: string;
							file: string;
							severity: 'error' | 'warning' | 'info';
							line?: number | undefined;
							column?: number | undefined;
							rule?: string | undefined;
						},
						{
							message: string;
							file: string;
							severity: 'error' | 'warning' | 'info';
							line?: number | undefined;
							column?: number | undefined;
							rule?: string | undefined;
						}
					>,
					'many'
				>;
				summary: z.ZodObject<
					{
						total: z.ZodNumber;
						errors: z.ZodNumber;
						warnings: z.ZodNumber;
					},
					'strip',
					z.ZodTypeAny,
					{
						total: number;
						errors: number;
						warnings: number;
					},
					{
						total: number;
						errors: number;
						warnings: number;
					}
				>;
				error: z.ZodOptional<z.ZodString>;
			},
			'strip',
			z.ZodTypeAny,
			{
				tool: 'eslint' | 'ruff' | 'cargo' | 'pytest';
				op: 'validate';
				inputs: {
					files: string[];
				};
				results: {
					message: string;
					file: string;
					severity: 'error' | 'warning' | 'info';
					line?: number | undefined;
					column?: number | undefined;
					rule?: string | undefined;
				}[];
				summary: {
					total: number;
					errors: number;
					warnings: number;
				};
				error?: string | undefined;
				timestamp?: string | undefined;
			},
			{
				tool: 'eslint' | 'ruff' | 'cargo' | 'pytest';
				op: 'validate';
				inputs: {
					files: string[];
				};
				results: {
					message: string;
					file: string;
					severity: 'error' | 'warning' | 'info';
					line?: number | undefined;
					column?: number | undefined;
					rule?: string | undefined;
				}[];
				summary: {
					total: number;
					errors: number;
					warnings: number;
				};
				error?: string | undefined;
				timestamp?: string | undefined;
			}
		>,
	]
>;
export type AgentToolkitSearchInput = z.infer<
	typeof AgentToolkitSearchInputSchema
>;
export type AgentToolkitSearchMatch = z.infer<
	typeof AgentToolkitSearchMatchSchema
>;
export type AgentToolkitSearchResult = z.infer<
	typeof AgentToolkitSearchResultSchema
>;
export type AgentToolkitCodemodInput = z.infer<
	typeof AgentToolkitCodemodInputSchema
>;
export type AgentToolkitCodemodChange = z.infer<
	typeof AgentToolkitCodemodChangeSchema
>;
export type AgentToolkitCodemodResult = z.infer<
	typeof AgentToolkitCodemodResultSchema
>;
export type AgentToolkitValidationInput = z.infer<
	typeof AgentToolkitValidationInputSchema
>;
export type AgentToolkitValidationIssue = z.infer<
	typeof AgentToolkitValidationIssueSchema
>;
export type AgentToolkitValidationResult = z.infer<
	typeof AgentToolkitValidationResultSchema
>;
export type AgentToolkitExecutionStartedEvent = z.infer<
	typeof AgentToolkitExecutionStartedEventSchema
>;
export type AgentToolkitExecutionCompletedEvent = z.infer<
	typeof AgentToolkitExecutionCompletedEventSchema
>;
export type AgentToolkitExecutionFailedEvent = z.infer<
	typeof AgentToolkitExecutionFailedEventSchema
>;
export type AgentToolkitInput = z.infer<typeof AgentToolkitInputSchema>;
export type AgentToolkitResult = z.infer<typeof AgentToolkitResultSchema>;
//# sourceMappingURL=agent-toolkit.d.ts.map
