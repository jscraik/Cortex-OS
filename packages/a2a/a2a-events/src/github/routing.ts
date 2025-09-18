import { z } from 'zod';
import type { A2AEventEnvelope } from './envelope.js';

// Routing Rule Schema
export const RoutingRuleSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().optional(),
	enabled: z.boolean().default(true),
	priority: z.number().int().min(0).max(1000).default(100),

	// Matching conditions
	conditions: z.object({
		event_types: z.array(z.string()).optional(),
		actions: z.array(z.string()).optional(),
		repository_patterns: z.array(z.string()).optional(), // glob patterns
		actor_patterns: z.array(z.string()).optional(),
		labels: z.record(z.string()).optional(),
		tags: z.array(z.string()).optional(),
		priority_levels: z.array(z.enum(['low', 'normal', 'high', 'critical'])).optional(),
		time_window: z
			.object({
				start_hour: z.number().int().min(0).max(23),
				end_hour: z.number().int().min(0).max(23),
				days_of_week: z.array(z.number().int().min(0).max(6)), // 0 = Sunday
				timezone: z.string().default('UTC'),
			})
			.optional(),
	}),

	// Routing actions
	actions: z.object({
		destinations: z.array(
			z.object({
				service: z.string(),
				endpoint: z.string().optional(),
				topic: z.string().optional(),
				transform: z.string().optional(), // transformation function name
				headers: z.record(z.string()).optional(),
				retry_policy: z
					.object({
						max_attempts: z.number().int().min(1).max(10).default(3),
						initial_delay_ms: z.number().int().positive().default(1000),
						max_delay_ms: z.number().int().positive().default(30000),
						backoff_multiplier: z.number().positive().default(2),
					})
					.optional(),
			}),
		),

		transformations: z
			.array(
				z.object({
					type: z.enum(['filter', 'enrich', 'aggregate', 'split', 'route']),
					function: z.string(),
					parameters: z.record(z.unknown()).optional(),
				}),
			)
			.optional(),

		filters: z
			.array(
				z.object({
					field: z.string(),
					operator: z.enum([
						'eq',
						'ne',
						'gt',
						'gte',
						'lt',
						'lte',
						'in',
						'not_in',
						'contains',
						'matches',
					]),
					value: z.unknown(),
				}),
			)
			.optional(),

		rate_limits: z
			.array(
				z.object({
					service: z.string(),
					requests_per_second: z.number().positive(),
					burst_size: z.number().int().positive(),
				}),
			)
			.optional(),
	}),
});

export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

// Routing Configuration Schema
export const RoutingConfigurationSchema = z.object({
	version: z.string().default('1.0'),
	updated_at: z.string().datetime(),
	rules: z.array(RoutingRuleSchema),

	global_settings: z.object({
		default_priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
		default_delivery_mode: z
			.enum(['fire_and_forget', 'at_least_once', 'exactly_once'])
			.default('at_least_once'),
		default_retry_policy: z.object({
			max_attempts: z.number().int().min(1).max(10).default(3),
			initial_delay_ms: z.number().int().positive().default(1000),
			max_delay_ms: z.number().int().positive().default(30000),
			backoff_multiplier: z.number().positive().default(2),
			jitter: z.boolean().default(true),
		}),

		dead_letter_queue: z.object({
			enabled: z.boolean().default(true),
			topic: z.string().default('github.dlq'),
			max_retention_hours: z.number().int().positive().default(168), // 7 days
		}),

		metrics: z.object({
			enabled: z.boolean().default(true),
			export_interval_ms: z.number().int().positive().default(60000),
			labels: z.record(z.string()).optional(),
		}),
	}),

	service_registry: z.record(
		z.object({
			type: z.enum(['http', 'grpc', 'websocket', 'message_queue', 'database', 'file']),
			connection: z.record(z.string()),
			health_check: z
				.object({
					endpoint: z.string(),
					interval_ms: z.number().int().positive().default(30000),
					timeout_ms: z.number().int().positive().default(5000),
				})
				.optional(),
		}),
	),
});

export type RoutingConfiguration = z.infer<typeof RoutingConfigurationSchema>;

// Route Match Result
export const RouteMatchSchema = z.object({
	rule_id: z.string().uuid(),
	rule_name: z.string(),
	priority: z.number(),
	destinations: z.array(
		z.object({
			service: z.string(),
			endpoint: z.string().optional(),
			topic: z.string().optional(),
			headers: z.record(z.string()).optional(),
		}),
	),
	transformations: z.array(z.string()).optional(),
	matched_conditions: z.array(z.string()),
});

export type RouteMatch = z.infer<typeof RouteMatchSchema>;

// Routing Engine
export class GitHubEventRouter {
	private config: RoutingConfiguration;
	private compiledRules: CompiledRule[];

	constructor(config: RoutingConfiguration) {
		this.config = config;
		this.compiledRules = this.compileRules(config.rules);
	}

	// Find matching routes for an envelope
	public findRoutes(envelope: A2AEventEnvelope): RouteMatch[] {
		const matches: RouteMatch[] = [];

		for (const rule of this.compiledRules) {
			if (!rule.enabled) continue;

			const matchedConditions = this.evaluateRule(envelope, rule);
			if (matchedConditions.length > 0) {
				matches.push({
					rule_id: rule.id,
					rule_name: rule.name,
					priority: rule.priority,
					destinations: rule.actions.destinations,
					transformations: rule.actions.transformations?.map((t) => t.function),
					matched_conditions: matchedConditions,
				});
			}
		}

		// Sort by priority (higher first)
		return matches.sort((a, b) => b.priority - a.priority);
	}

	// Update routing configuration
	public updateConfiguration(config: RoutingConfiguration): void {
		this.config = config;
		this.compiledRules = this.compileRules(config.rules);
	}

	// Get current configuration
	public getConfiguration(): RoutingConfiguration {
		return this.config;
	}

	// Validate envelope against routing rules
	public validateRouting(envelope: A2AEventEnvelope): {
		isValid: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		const routes = this.findRoutes(envelope);

		if (routes.length === 0) {
			warnings.push('No routing rules matched this envelope');
		}

		// Validate destinations exist in service registry
		for (const route of routes) {
			for (const destination of route.destinations) {
				if (!this.config.service_registry[destination.service]) {
					errors.push(`Service '${destination.service}' not found in service registry`);
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	private compileRules(rules: RoutingRule[]): CompiledRule[] {
		return rules.map((rule) => ({
			...rule,
			compiledConditions: this.compileConditions(rule.conditions),
		}));
	}

	private compileConditions(conditions: RoutingRule['conditions']): CompiledConditions {
		return {
			eventTypeRegex: conditions.event_types ? new RegExp(conditions.event_types.join('|')) : null,
			actionRegex: conditions.actions ? new RegExp(conditions.actions.join('|')) : null,
			repositoryPatterns: conditions.repository_patterns?.map(
				(pattern) => new RegExp(this.globToRegex(pattern)),
			),
			actorPatterns: conditions.actor_patterns?.map(
				(pattern) => new RegExp(this.globToRegex(pattern)),
			),
			labels: conditions.labels,
			tags: conditions.tags,
			priorityLevels: conditions.priority_levels,
			timeWindow: conditions.time_window,
		};
	}

	private evaluateRule(envelope: A2AEventEnvelope, rule: CompiledRule): string[] {
		const matched: string[] = [];

		// Check event type
		if (rule.compiledConditions.eventTypeRegex) {
			if (rule.compiledConditions.eventTypeRegex.test(envelope.event.event_type)) {
				matched.push('event_type');
			}
		}

		// Check action
		if (rule.compiledConditions.actionRegex && 'action' in envelope.event) {
			const eventWithAction = envelope.event as typeof envelope.event & {
				action: string;
			};
			if (rule.compiledConditions.actionRegex.test(eventWithAction.action)) {
				matched.push('action');
			}
		}

		// Check repository patterns
		if (rule.compiledConditions.repositoryPatterns) {
			const event = envelope.event;
			if ('repository' in event && event.repository) {
				const repoName = event.repository.full_name;
				for (const pattern of rule.compiledConditions.repositoryPatterns) {
					if (pattern.test(repoName)) {
						matched.push('repository_pattern');
						break;
					}
				}
			}
		}

		// Check actor patterns
		if (rule.compiledConditions.actorPatterns) {
			const event = envelope.event;
			if ('actor' in event && event.actor) {
				const actorLogin = event.actor.login;
				for (const pattern of rule.compiledConditions.actorPatterns) {
					if (pattern.test(actorLogin)) {
						matched.push('actor_pattern');
						break;
					}
				}
			}
		}

		// Check labels
		if (rule.compiledConditions.labels) {
			let allLabelsMatch = true;
			for (const [key, value] of Object.entries(rule.compiledConditions.labels)) {
				if (envelope.metadata.labels[key] !== value) {
					allLabelsMatch = false;
					break;
				}
			}
			if (allLabelsMatch) {
				matched.push('labels');
			}
		}

		// Check tags
		if (rule.compiledConditions.tags) {
			const hasAllTags = rule.compiledConditions.tags.every((tag) =>
				envelope.metadata.tags.includes(tag),
			);
			if (hasAllTags) {
				matched.push('tags');
			}
		}

		// Check priority levels
		if (rule.compiledConditions.priorityLevels) {
			if (rule.compiledConditions.priorityLevels.includes(envelope.priority)) {
				matched.push('priority');
			}
		}

		// Check time window
		if (rule.compiledConditions.timeWindow) {
			if (this.isInTimeWindow(envelope.created_at, rule.compiledConditions.timeWindow)) {
				matched.push('time_window');
			}
		}

		// Rule matches if it has no conditions OR if any conditions matched
		const hasConditions = Object.values(rule.conditions).some(
			(condition) =>
				condition !== undefined && (Array.isArray(condition) ? condition.length > 0 : true),
		);

		return !hasConditions || matched.length > 0 ? matched : [];
	}

	private isInTimeWindow(
		timestamp: string,
		timeWindow: NonNullable<RoutingRule['conditions']['time_window']>,
	): boolean {
		const date = new Date(timestamp);
		const hour = date.getHours();
		const dayOfWeek = date.getDay();

		// Check hour range
		const inHourRange =
			timeWindow.start_hour <= timeWindow.end_hour
				? hour >= timeWindow.start_hour && hour <= timeWindow.end_hour
				: hour >= timeWindow.start_hour || hour <= timeWindow.end_hour;

		// Check day of week
		const inDayRange = timeWindow.days_of_week.includes(dayOfWeek);

		return inHourRange && inDayRange;
	}

	private globToRegex(glob: string): string {
		return glob
			.replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
			.replace(/\*/g, '.*') // Convert * to .*
			.replace(/\?/g, '.'); // Convert ? to .
	}
}

// Compiled rule interface (internal)
interface CompiledRule extends RoutingRule {
	compiledConditions: CompiledConditions;
}

interface CompiledConditions {
	eventTypeRegex: RegExp | null;
	actionRegex: RegExp | null;
	repositoryPatterns?: RegExp[];
	actorPatterns?: RegExp[];
	labels?: Record<string, string>;
	tags?: string[];
	priorityLevels?: Array<'low' | 'normal' | 'high' | 'critical'>;
	timeWindow?: NonNullable<RoutingRule['conditions']['time_window']>;
}

// Default routing configurations
export const DEFAULT_GITHUB_ROUTING_CONFIG: RoutingConfiguration = {
	version: '1.0',
	updated_at: new Date().toISOString(),

	rules: [
		// Critical errors route to monitoring
		{
			id: crypto.randomUUID(),
			name: 'Critical Errors to Monitoring',
			description: 'Route critical GitHub errors to monitoring service',
			enabled: true,
			priority: 1000,
			conditions: {
				event_types: ['github.error'],
				priority_levels: ['critical'],
			},
			actions: {
				destinations: [
					{
						service: 'monitoring',
						topic: 'alerts.critical',
						headers: { 'X-Alert-Level': 'critical' },
					},
					{
						service: 'pagerduty',
						topic: 'incidents.create',
					},
				],
			},
		},

		// Workflow failures to CI/CD service
		{
			id: crypto.randomUUID(),
			name: 'Workflow Failures to CI/CD',
			description: 'Route failed workflows to CI/CD service',
			enabled: true,
			priority: 800,
			conditions: {
				event_types: ['github.workflow'],
				actions: ['failed', 'cancelled'],
			},
			actions: {
				destinations: [
					{
						service: 'cicd',
						topic: 'builds.failed',
					},
				],
			},
		},

		// Pull request events to code review service
		{
			id: crypto.randomUUID(),
			name: 'Pull Requests to Code Review',
			description: 'Route PR events to code review service',
			enabled: true,
			priority: 600,
			conditions: {
				event_types: ['github.pull_request'],
				actions: ['opened', 'synchronized', 'ready_for_review'],
			},
			actions: {
				destinations: [
					{
						service: 'code-review',
						topic: 'reviews.incoming',
					},
				],
			},
		},

		// Issue events to project management
		{
			id: crypto.randomUUID(),
			name: 'Issues to Project Management',
			description: 'Route issue events to project management service',
			enabled: true,
			priority: 400,
			conditions: {
				event_types: ['github.issue'],
				actions: ['opened', 'closed', 'labeled'],
			},
			actions: {
				destinations: [
					{
						service: 'project-mgmt',
						topic: 'issues.updates',
					},
				],
			},
		},

		// All events to audit log
		{
			id: crypto.randomUUID(),
			name: 'All Events to Audit',
			description: 'Route all GitHub events to audit service for compliance',
			enabled: true,
			priority: 100,
			conditions: {}, // No conditions = match all
			actions: {
				destinations: [
					{
						service: 'audit',
						topic: 'github.events',
						headers: { 'X-Event-Source': 'github' },
					},
				],
			},
		},
	],

	global_settings: {
		default_priority: 'normal',
		default_delivery_mode: 'at_least_once',
		default_retry_policy: {
			max_attempts: 3,
			initial_delay_ms: 1000,
			max_delay_ms: 30000,
			backoff_multiplier: 2,
			jitter: true,
		},
		dead_letter_queue: {
			enabled: true,
			topic: 'github.dlq',
			max_retention_hours: 168,
		},
		metrics: {
			enabled: true,
			export_interval_ms: 60000,
			labels: {
				source: 'github',
				version: '1.0',
			},
		},
	},

	service_registry: {
		// eslint-disable no-template-curly-in-string
		monitoring: {
			type: 'http',
			connection: {
				base_url: 'http://monitoring-service:8080',
				api_key: '${MONITORING_API_KEY}',
			},
			health_check: {
				endpoint: '/health',
				interval_ms: 30000,
				timeout_ms: 5000,
			},
		},
		pagerduty: {
			type: 'http',
			connection: {
				base_url: 'https://events.pagerduty.com/v2',
				integration_key: '${PAGERDUTY_INTEGRATION_KEY}',
			},
		},
		cicd: {
			type: 'message_queue',
			connection: {
				broker_url: 'redis://cicd-redis:6379',
				queue: 'builds',
			},
		},
		'code-review': {
			type: 'grpc',
			connection: {
				address: 'code-review-service:9090',
				tls: 'true',
			},
		},
		'project-mgmt': {
			type: 'websocket',
			connection: {
				url: 'wss://project-mgmt:8081/events',
				auth_token: '${PROJECT_MGMT_TOKEN}',
			},
		},
		audit: {
			type: 'database',
			connection: {
				connection_string: '${AUDIT_DB_URL}',
				table: 'github_events',
			},
		},
	},
	// eslint-enable no-template-curly-in-string
}; // Routing utilities
export function createRoutingRule(
	name: string,
	conditions: RoutingRule['conditions'],
	destinations: Array<{ service: string; topic?: string; endpoint?: string }>,
	options?: {
		description?: string;
		priority?: number;
		enabled?: boolean;
	},
): RoutingRule {
	return {
		id: crypto.randomUUID(),
		name,
		description: options?.description,
		enabled: options?.enabled ?? true,
		priority: options?.priority ?? 500,
		conditions,
		actions: {
			destinations: destinations.map((dest) => ({
				service: dest.service,
				topic: dest.topic,
				endpoint: dest.endpoint,
			})),
		},
	};
}

export function validateRoutingConfiguration(config: unknown): RoutingConfiguration {
	return RoutingConfigurationSchema.parse(config);
}

export function isValidRoutingConfiguration(config: unknown): config is RoutingConfiguration {
	return RoutingConfigurationSchema.safeParse(config).success;
}
