import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import chokidar, { type FSWatcher } from 'chokidar';
import { z } from 'zod';

// Advanced policy schema
const AdvancedPolicySchema = z.object({
	version: z.string().default('1.0.0'),
	services: z.record(
		z.object({
			actions: z.array(z.string()),
			rateLimits: z
				.object({
					perMinute: z.number().optional(),
					perHour: z.number().optional(),
					perDay: z.number().optional(),
				})
				.optional(),
			rules: z
				.object({
					allow_embeddings: z.boolean().default(true),
					allow_rerank: z.boolean().default(true),
					allow_chat: z.boolean().default(true),
					// Advanced routing rules
					routing: z
						.array(
							z.object({
								condition: z.string(), // e.g., "model.startsWith('gpt')"
								destination: z.string(), // e.g., "frontier"
								priority: z.number().default(100),
								fallback: z.array(z.string()).optional(),
							}),
						)
						.optional(),
				})
				.default({}),
		}),
	),
	global: z
		.object({
			defaultRateLimit: z
				.object({
					perMinute: z.number().default(60),
				})
				.optional(),
		})
		.optional(),
});

export type AdvancedPolicy = z.infer<typeof AdvancedPolicySchema>;
export type ServicePolicy = AdvancedPolicy['services'][string];

// Rate limiting counters
interface RateCounter {
	count: number;
	reset: number;
}

const rateCounters = new Map<string, Map<string, RateCounter>>();

// Policy router with advanced capabilities
export class AdvancedPolicyRouter extends EventEmitter {
	private policies: AdvancedPolicy = {
		version: '1.0.0',
		services: {
			'model-gateway': {
				actions: ['embeddings', 'rerank', 'chat'],
				rules: {
					allow_embeddings: true,
					allow_rerank: true,
					allow_chat: true,
				},
			},
		},
	};
	private watcher: FSWatcher | null = null;

	constructor(private readonly policyFilePath?: string) {
		super();
		if (this.policyFilePath) {
			this.loadPolicyFromFile();
			this.watchPolicyFile();
		}
	}

	// Load policy from file
	private loadPolicyFromFile(): void {
		try {
			if (this.policyFilePath && fs.existsSync(this.policyFilePath)) {
				const policyContent = fs.readFileSync(this.policyFilePath, 'utf-8');
				const policyData = JSON.parse(policyContent);
				this.policies = AdvancedPolicySchema.parse(policyData);
				this.emit('policyUpdated', this.policies);
				console.warn('[policy-router] Policy loaded successfully from file');
			}
		} catch (error) {
			console.error('[policy-router] Failed to load policy from file:', error);
			this.emit('policyError', error);
		}
	}

	// Watch policy file for changes
	private watchPolicyFile(): void {
		if (!this.policyFilePath) return;

		this.watcher = chokidar.watch(this.policyFilePath, {
			persistent: true,
			ignoreInitial: true,
		});

		this.watcher.on('change', () => {
			console.warn('[policy-router] Policy file changed, reloading...');
			this.loadPolicyFromFile();
		});

		this.watcher.on('error', (error: unknown) => {
			console.error('[policy-router] File watcher error:', error);
			this.emit('policyError', error);
		});
	}

	// Get policy for a service
	getServicePolicy(service: string): ServicePolicy | null {
		return this.policies.services[service] || null;
	}

	// Update policy for a service
	updateServicePolicy(service: string, policy: ServicePolicy): void {
		this.policies.services[service] = policy;
		this.emit('policyUpdated', this.policies);

		// Save to file if path is provided
		if (this.policyFilePath) {
			this.savePolicyToFile();
		}
	}

	// Save policy to file
	private savePolicyToFile(): void {
		if (!this.policyFilePath) return;

		try {
			fs.writeFileSync(
				this.policyFilePath,
				JSON.stringify(this.policies, null, 2),
				'utf-8',
			);
			console.warn('[policy-router] Policy saved to file');
		} catch (error) {
			console.error('[policy-router] Failed to save policy to file:', error);
			this.emit('policyError', error);
		}
	}

	// Enforce policy for an operation
	async enforce(
		service: string,
		operation: 'embeddings' | 'rerank' | 'chat',
		body?: unknown,
	): Promise<boolean> {
		const policy = this.getServicePolicy(service);
		if (!policy) {
			throw new Error(`No policy found for service ${service}`);
		}

		// Check action allowance
		const ruleMap: Record<string, keyof ServicePolicy['rules']> = {
			embeddings: 'allow_embeddings',
			rerank: 'allow_rerank',
			chat: 'allow_chat',
		};

		const ruleKey = ruleMap[operation];
		if (!ruleKey || !policy.rules[ruleKey]) {
			throw new Error(`Operation ${operation} not allowed by policy`);
		}

		// Check rate limits
		await this.checkRateLimits(service, operation, policy);

		// Apply advanced routing rules if any
		if (policy.rules.routing && body) {
			await this.applyRoutingRules(
				service,
				operation,
				body,
				policy.rules.routing,
			);
		}

		return true;
	}

	// Check rate limits
	private async checkRateLimits(
		service: string,
		operation: string,
		policy: ServicePolicy,
	): Promise<void> {
		const limits = policy.rateLimits || this.policies.global?.defaultRateLimit;
		if (!limits) return;

		const now = Date.now();
		const serviceCounters = rateCounters.get(service) || new Map();

		// Check per-minute limit
		if (limits.perMinute) {
			const counter = serviceCounters.get(`${operation}:minute`) || {
				count: 0,
				reset: now + 60_000,
			};

			if (now > counter.reset) {
				counter.count = 0;
				counter.reset = now + 60_000;
			}

			if (counter.count >= limits.perMinute) {
				throw new Error(`Rate limit exceeded for ${operation} (per minute)`);
			}

			counter.count += 1;
			serviceCounters.set(`${operation}:minute`, counter);
			rateCounters.set(service, serviceCounters);
		}

		// Check per-hour limit
		if ('perHour' in limits && limits.perHour) {
			const counter = serviceCounters.get(`${operation}:hour`) || {
				count: 0,
				reset: now + 3_600_000,
			};

			if (now > counter.reset) {
				counter.count = 0;
				counter.reset = now + 3_600_000;
			}

			if (counter.count >= limits.perHour) {
				throw new Error(`Rate limit exceeded for ${operation} (per hour)`);
			}

			counter.count += 1;
			serviceCounters.set(`${operation}:hour`, counter);
			rateCounters.set(service, serviceCounters);
		}

		// Check per-day limit
		if ('perDay' in limits && limits.perDay) {
			const counter = serviceCounters.get(`${operation}:day`) || {
				count: 0,
				reset: now + 86_400_000,
			};

			if (now > counter.reset) {
				counter.count = 0;
				counter.reset = now + 86_400_000;
			}

			if (counter.count >= limits.perDay) {
				throw new Error(`Rate limit exceeded for ${operation} (per day)`);
			}

			counter.count += 1;
			serviceCounters.set(`${operation}:day`, counter);
			rateCounters.set(service, serviceCounters);
		}
	}

	// Apply advanced routing rules
	private async applyRoutingRules(
		service: string,
		operation: string,
		body: unknown,
		rules: NonNullable<ServicePolicy['rules']['routing']>,
	): Promise<void> {
		// This is a simplified implementation
		// In a real system, this would evaluate conditions and apply transformations
		console.warn(
			`[policy-router] Applying routing rules for ${service}:${operation}`,
		);

		for (const rule of rules) {
			try {
				// Evaluate condition (simplified - in reality this would be a proper expression evaluator)
				const conditionResult = this.evaluateCondition(rule.condition, body);
				if (conditionResult) {
					console.warn(
						`[policy-router] Rule matched: ${rule.condition}, routing to ${rule.destination}`,
					);
					// In a real implementation, this would actually route the request
				}
			} catch (error) {
				console.warn(
					`[policy-router] Failed to evaluate rule condition: ${rule.condition}`,
					error,
				);
			}
		}
	}

	// Simplified condition evaluation
	private evaluateCondition(condition: string, body: unknown): boolean {
		// This is a very basic implementation
		// A real system would use a proper expression evaluator like jsep or similar
		try {
			// Simple string matching for demonstration
			if (condition.includes('model.startsWith')) {
				let modelName = '';
				if (
					typeof body === 'object' &&
					body !== null &&
					'model' in body &&
					typeof (body as { model?: unknown }).model === 'string'
				) {
					modelName = (body as { model: string }).model;
				}
				const regex = /model\.startsWith\(['"](.+?)['"]\)/;
				const match = regex.exec(condition);
				if (match?.[1]) {
					return modelName.startsWith(match[1]);
				}
			}
			return false;
		} catch (error) {
			console.warn(
				'[policy-router] Failed to evaluate condition:',
				condition,
				error,
			);
			return false;
		}
	}

	// Close the policy router and clean up resources
	close(): void {
		if (this.watcher) {
			this.watcher.close();
		}
		this.removeAllListeners();
	}
}

// Factory function to create policy router
export function createAdvancedPolicyRouter(
	policyFilePath?: string,
): AdvancedPolicyRouter {
	return new AdvancedPolicyRouter(policyFilePath);
}
