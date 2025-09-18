import { z } from 'zod';

// Zod schemas for egress policy validation
const EgressPolicyEndpointSchema = z.object({
	url: z.string().url('Invalid URL format'),
	methods: z.array(z.string()).optional(),
	description: z.string().optional(),
});

const EgressPolicyRuleSchema = z.object({
	pattern: z.string(),
	action: z.enum(['allow', 'deny']),
	reason: z.string().optional(),
});

const EgressPolicySchema = z.object({
	version: z.string(),
	defaultAction: z.enum(['deny', 'allow'], {
		errorMap: () => ({ message: 'Invalid defaultAction' }),
	}),
	allowlist: z.object({
		domains: z.array(z.string()),
		endpoints: z.array(EgressPolicyEndpointSchema),
	}),
	rules: z.array(EgressPolicyRuleSchema).optional(),
});

// Type inference from schemas
export type EgressPolicy = z.infer<typeof EgressPolicySchema>;
export type EgressPolicyEndpoint = z.infer<typeof EgressPolicyEndpointSchema>;
export type EgressPolicyRule = z.infer<typeof EgressPolicyRuleSchema>;

export interface EgressPolicyValidator {
	validateSchema(policy: unknown): EgressPolicy;
	isAllowed(url: string, method?: string): boolean;
	loadPolicy(policy: EgressPolicy): void;
}

class EgressPolicyValidatorImpl implements EgressPolicyValidator {
	private policy: EgressPolicy | null = null;

	validateSchema(policy: unknown): EgressPolicy {
		return EgressPolicySchema.parse(policy);
	}

	loadPolicy(policy: EgressPolicy): void {
		this.policy = policy;
	}

	isAllowed(url: string, method: string = 'GET'): boolean {
		if (!this.policy) {
			throw new Error('No policy loaded');
		}

		// Apply custom rules first (they override allowlist)
		if (this.policy.rules) {
			for (const rule of this.policy.rules) {
				if (this.matchesPattern(url, rule.pattern)) {
					return rule.action === 'allow';
				}
			}
		}

		// Check allowlist domains
		const urlObj = new URL(url);
		for (const domain of this.policy.allowlist.domains) {
			if (
				urlObj.hostname === domain ||
				urlObj.hostname.endsWith(`.${domain}`)
			) {
				return true;
			}
		}

		// Check specific endpoints
		for (const endpoint of this.policy.allowlist.endpoints) {
			if (url === endpoint.url) {
				// If methods are specified, check if the method is allowed
				if (endpoint.methods && endpoint.methods.length > 0) {
					return endpoint.methods.includes(method);
				}
				// If no methods specified, allow all methods
				return true;
			}
		}

		// Default action
		return this.policy.defaultAction === 'allow';
	}

	private matchesPattern(url: string, pattern: string): boolean {
		// Simple glob-style pattern matching
		// Convert pattern to regex: * becomes .*
		const regexPattern = pattern
			.replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape special regex chars
			.replace(/\*/g, '.*'); // convert * to .*

		const regex = new RegExp(`^${regexPattern}$`);
		return regex.test(url);
	}
}

export function createEgressPolicyValidator(): EgressPolicyValidator {
	return new EgressPolicyValidatorImpl();
}
