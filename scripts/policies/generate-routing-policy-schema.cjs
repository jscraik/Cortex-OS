#!/usr/bin/env node
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const outputPath = resolve(__dirname, '../../schemas/routing-policy.schema.json');

const safetySchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		allow_network: {
			oneOf: [{ type: 'boolean' }, { const: 'ask' }],
		},
		allow_fs_write: {
			enum: ['workspace_only', 'tempdir', 'forbid'],
		},
		sandbox: { type: 'string' },
	},
	required: ['allow_network', 'allow_fs_write'],
};

const safetyOverrideSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		allow_network: safetySchema.properties.allow_network,
		allow_fs_write: safetySchema.properties.allow_fs_write,
		sandbox: { type: 'string' },
	},
};

const conditionSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		interface: { type: 'string' },
		source: { type: 'string' },
		env: { type: 'string' },
		operation: { type: 'string' },
		operation_any: { type: 'array', items: { type: 'string' } },
		tags_any: { type: 'array', items: { type: 'string' } },
		command_prefix_any: { type: 'array', items: { type: 'string' } },
		path_not_in: { type: 'array', items: { type: 'string' } },
	},
};

const priorityRuleSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		id: { type: 'string' },
		if: conditionSchema,
		then: {
			type: 'object',
			additionalProperties: false,
			properties: {
				boost: { type: 'integer' },
				prefer_capabilities: { type: 'array', items: { type: 'string' } },
				require_approval: { type: 'boolean' },
				safety_override: safetyOverrideSchema,
			},
		},
	},
	required: ['id', 'then'],
};

const capabilityEntrySchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		id: { type: 'string' },
		providers: { type: 'array', items: { type: 'string' }, minItems: 1 },
	},
	required: ['id', 'providers'],
};

const incompatibleCapabilitySchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		id: { type: 'string' },
		disallow_providers: { type: 'array', items: { type: 'string' }, minItems: 1 },
	},
	required: ['id', 'disallow_providers'],
};

const routingPolicySchema = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	$id: 'https://cortex.brainwav.ai/schemas/routing-policy.schema.json',
	title: 'RoutingPolicy',
	type: 'object',
	additionalProperties: false,
	properties: {
		version: { type: 'string', minLength: 1 },
		metadata: {
			type: 'object',
			additionalProperties: false,
			properties: {
				owner: { type: 'string' },
				description: { type: 'string' },
				last_review: { type: 'string' },
			},
			required: ['owner', 'description'],
		},
		interfaces: {
			type: 'object',
			minProperties: 1,
			additionalProperties: false,
			patternProperties: {
				'^.*$': {
					type: 'object',
					additionalProperties: false,
					properties: {
						app: { type: 'string' },
						pkg: { type: 'string' },
						priority_base: { type: 'integer', minimum: 0 },
						safety: safetySchema,
					},
					required: ['priority_base', 'safety'],
				},
			},
		},
		priority_rules: {
			type: 'array',
			items: priorityRuleSchema,
		},
		routing: {
			type: 'object',
			additionalProperties: false,
			properties: {
				strategy: {
					type: 'object',
					additionalProperties: false,
					properties: {
						plan_with: { type: 'string' },
						select_by: { type: 'array', items: { type: 'string' }, minItems: 1 },
						fallbacks: { type: 'array', items: { type: 'string' } },
						guardrails: { type: 'string' },
						evidence: {
							type: 'object',
							additionalProperties: false,
							properties: {
								require_provenance: { type: 'boolean' },
								sink: { type: 'string' },
							},
							required: ['require_provenance', 'sink'],
						},
					},
					required: ['plan_with', 'select_by', 'guardrails', 'evidence'],
				},
			},
			required: ['strategy'],
		},
		capability_matrix: {
			type: 'object',
			additionalProperties: false,
			properties: {
				required: {
					type: 'array',
					items: capabilityEntrySchema,
					minItems: 1,
				},
				incompatible: {
					type: 'array',
					items: incompatibleCapabilitySchema,
				},
			},
			required: ['required'],
		},
		approvals: {
			type: 'object',
			additionalProperties: false,
			properties: {
				policies: {
					type: 'array',
					items: {
						type: 'object',
						additionalProperties: false,
						properties: {
							id: { type: 'string' },
							if: conditionSchema,
							then: {
								type: 'object',
								additionalProperties: false,
								properties: {
									require_approval: { type: 'boolean' },
									approvers: { type: 'array', items: { type: 'string' } },
								},
								required: ['require_approval'],
							},
						},
						required: ['id', 'then'],
					},
				},
			},
		},
		telemetry: {
			type: 'object',
			additionalProperties: false,
			properties: {
				otel_spans: { type: 'boolean' },
				a2a_events_topic: { type: 'string' },
				redact: {
					type: 'object',
					additionalProperties: false,
					properties: {
						fields: { type: 'array', items: { type: 'string' } },
					},
				},
			},
			required: ['otel_spans', 'a2a_events_topic'],
		},
	},
	required: ['version', 'interfaces', 'routing', 'capability_matrix'],
};

writeFileSync(outputPath, `${JSON.stringify(routingPolicySchema, null, 2)}\n`, {
	encoding: 'utf-8',
});
console.log('brAInwav policy: routing-policy schema updated');
