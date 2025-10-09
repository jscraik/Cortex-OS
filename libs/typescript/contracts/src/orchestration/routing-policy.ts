import { z } from 'zod';

const networkPreferenceSchema = z.union([z.boolean(), z.literal('ask')]);
const fileWriteScopeSchema = z.enum(['workspace_only', 'tempdir', 'forbid']);

const safetyPolicySchema = z
	.object({
		allow_network: networkPreferenceSchema,
		allow_fs_write: fileWriteScopeSchema,
		sandbox: z.string().min(1).optional(),
	})
	.strict();

const safetyOverrideSchema = z
	.object({
		allow_network: networkPreferenceSchema.optional(),
		allow_fs_write: fileWriteScopeSchema.optional(),
		sandbox: z.string().min(1).optional(),
	})
	.strict();

const interfaceLocatorSchema = z
	.object({
		app: z.string().min(1).optional(),
		pkg: z.string().min(1).optional(),
		priority_base: z.number().int().min(0),
		safety: safetyPolicySchema,
	})
	.strict()
	.superRefine((value, ctx) => {
		if (!value.app && !value.pkg) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['app'],
				message: 'interface locator must include either app or pkg field',
			});
		}
	});

const routingConditionSchema = z
	.object({
		interface: z.string().min(1).optional(),
		source: z.string().min(1).optional(),
		env: z.string().min(1).optional(),
		operation: z.string().min(1).optional(),
		operation_any: z.array(z.string().min(1)).optional(),
		tags_any: z.array(z.string().min(1)).optional(),
		command_prefix_any: z.array(z.string().min(1)).optional(),
		path_not_in: z.array(z.string().min(1)).optional(),
	})
	.strict();

const ruleActionSchema = z
	.object({
		boost: z.number().int().optional(),
		prefer_capabilities: z.array(z.string().min(1)).optional(),
		require_approval: z.boolean().optional(),
		safety_override: safetyOverrideSchema.optional(),
	})
	.strict();

const priorityRuleSchema = z
	.object({
		id: z.string().min(1),
		if: routingConditionSchema.default({}),
		then: ruleActionSchema,
	})
	.strict();

const capabilityProviderSchema = z
	.object({
		id: z.string().min(1),
		providers: z.array(z.string().min(1)).min(1),
	})
	.strict();

const incompatibleCapabilitySchema = z
	.object({
		id: z.string().min(1),
		disallow_providers: z.array(z.string().min(1)).min(1),
	})
	.strict();

const routingStrategySchema = z
	.object({
		plan_with: z.string().min(1),
		select_by: z.array(z.string().min(1)).min(1),
		fallbacks: z.array(z.string().min(1)).default([]),
		guardrails: z.string().min(1),
		evidence: z
			.object({
				require_provenance: z.boolean(),
				sink: z.string().min(1),
			})
			.strict(),
	})
	.strict();

const approvalDecisionSchema = z
	.object({
		require_approval: z.boolean(),
		approvers: z.array(z.string().min(1)).optional(),
	})
	.strict();

const approvalPolicySchema = z
	.object({
		id: z.string().min(1),
		if: routingConditionSchema.default({}),
		then: approvalDecisionSchema,
	})
	.strict();

const telemetryPolicySchema = z
	.object({
		otel_spans: z.boolean(),
		a2a_events_topic: z.string().min(1),
		redact: z
			.object({
				fields: z.array(z.string().min(1)).default([]),
			})
			.strict()
			.optional(),
	})
	.strict();

export const RoutingPolicySchema = z
	.object({
		version: z.string().min(1),
		metadata: z
			.object({
				owner: z.string().min(1),
				description: z.string().min(1),
				last_review: z.string().min(1).optional(),
			})
			.strict()
			.optional(),
		interfaces: z.record(interfaceLocatorSchema),
		priority_rules: z.array(priorityRuleSchema).optional(),
		routing: z
			.object({
				strategy: routingStrategySchema,
			})
			.strict(),
		capability_matrix: z
			.object({
				required: z.array(capabilityProviderSchema).min(1),
				incompatible: z.array(incompatibleCapabilitySchema).default([]),
			})
			.strict(),
		approvals: z
			.object({
				policies: z.array(approvalPolicySchema).default([]),
			})
			.strict()
			.optional(),
		telemetry: telemetryPolicySchema.optional(),
	})
	.strict();

export type RoutingPolicy = z.infer<typeof RoutingPolicySchema>;
export type RoutingInterface = z.infer<typeof interfaceLocatorSchema>;
export type RoutingPriorityRule = z.infer<typeof priorityRuleSchema>;
export type RoutingCondition = z.infer<typeof routingConditionSchema>;
