import { z } from 'zod';

// Zod schemas for MCP tool allowlist validation
const MCPToolRestrictionSchema = z.object({
	maxCalls: z.number().min(1).optional(),
	rateLimitPerHour: z.number().min(1).optional(),
	requiredScopes: z
		.array(z.string().regex(/^[a-z0-9_:]+$/, 'Invalid scope format'))
		.optional(),
});

const MCPToolSchema = z.object({
	name: z.string().min(1, 'Tool name cannot be empty'),
	description: z.string().optional(),
	parameters: z.record(z.unknown()).optional(),
	restrictions: MCPToolRestrictionSchema.optional(),
});

const MCPToolCategorySchema = z.object({
	name: z.string().min(1),
	tools: z.array(z.string()),
	description: z.string().optional(),
});

const MCPToolDenylistSchema = z.object({
	tools: z.array(z.string()),
	patterns: z.array(z.string()),
});

const MCPToolPolicySchema = z.object({
	version: z.string(),
	defaultAction: z.enum(['allow', 'deny'], {
		errorMap: () => ({ message: 'Invalid defaultAction' }),
	}),
	allowlist: z.object({
		tools: z.array(MCPToolSchema),
		categories: z.array(MCPToolCategorySchema),
	}),
	denylist: MCPToolDenylistSchema.optional(),
});

// Type inference from schemas
export type MCPToolPolicy = z.infer<typeof MCPToolPolicySchema>;
export type MCPToolRestriction = z.infer<typeof MCPToolRestrictionSchema>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPToolCategory = z.infer<typeof MCPToolCategorySchema>;

export interface MCPToolValidator {
	validateSchema(policy: unknown): MCPToolPolicy;
	isToolAllowed(
		toolName: string,
		context?: { scopes?: string[]; callCount?: number },
	): boolean;
	loadPolicy(policy: MCPToolPolicy): void;
	getViolationReason(
		toolName: string,
		context?: { scopes?: string[]; callCount?: number },
	): string | null;
}

class MCPToolValidatorImpl implements MCPToolValidator {
	private policy: MCPToolPolicy | null = null;
	private lastContext: { scopes?: string[]; callCount?: number } | undefined;

	validateSchema(policy: unknown): MCPToolPolicy {
		return MCPToolPolicySchema.parse(policy);
	}

	loadPolicy(policy: MCPToolPolicy): void {
		this.policy = policy;
	}

	isToolAllowed(
		toolName: string,
		context?: { scopes?: string[]; callCount?: number },
	): boolean {
		if (!this.policy) {
			throw new Error('No MCP tool policy loaded');
		}

		this.lastContext = context;

		// Check denylist first (highest priority)
		if (this.policy.denylist) {
			// Explicit tool denial
			if (this.policy.denylist.tools.includes(toolName)) {
				return false;
			}

			// Pattern-based denial
			for (const pattern of this.policy.denylist.patterns) {
				if (this.matchesPattern(toolName, pattern)) {
					return false;
				}
			}
		}

		// Find tool in allowlist (direct tools or categories)
		const allowedTool = this.findAllowedTool(toolName);

		if (!allowedTool) {
			// Default action if tool not found
			return this.policy.defaultAction === 'allow';
		}

		// Tool is in allowlist, check restrictions
		if (allowedTool.restrictions) {
			// Check scope requirements
			if (
				allowedTool.restrictions.requiredScopes &&
				allowedTool.restrictions.requiredScopes.length > 0
			) {
				const userScopes = context?.scopes || [];
				const hasAllScopes = allowedTool.restrictions.requiredScopes.every(
					(requiredScope) => userScopes.includes(requiredScope),
				);
				if (!hasAllScopes) {
					return false;
				}
			}

			// Check call limits
			if (
				allowedTool.restrictions.maxCalls !== undefined &&
				context?.callCount !== undefined
			) {
				if (context.callCount > allowedTool.restrictions.maxCalls) {
					return false;
				}
			}
		}

		return true;
	}

	getViolationReason(
		toolName: string,
		context?: { scopes?: string[]; callCount?: number },
	): string | null {
		if (!this.policy) {
			return 'No MCP tool policy loaded';
		}

		const contextToUse = context || this.lastContext;

		// Check denylist first
		if (this.policy.denylist) {
			if (this.policy.denylist.tools.includes(toolName)) {
				return `Tool '${toolName}' is explicitly denied`;
			}

			for (const pattern of this.policy.denylist.patterns) {
				if (this.matchesPattern(toolName, pattern)) {
					return `Tool '${toolName}' matches denied pattern '${pattern}'`;
				}
			}
		}

		const allowedTool = this.findAllowedTool(toolName);

		if (!allowedTool) {
			return this.policy.defaultAction === 'deny'
				? `Tool '${toolName}' is not in allowlist`
				: null;
		}

		// Check restriction violations
		if (allowedTool.restrictions) {
			// Check scope requirements
			if (
				allowedTool.restrictions.requiredScopes &&
				allowedTool.restrictions.requiredScopes.length > 0
			) {
				const userScopes = contextToUse?.scopes || [];
				const missingScopes = allowedTool.restrictions.requiredScopes.filter(
					(requiredScope) => !userScopes.includes(requiredScope),
				);
				if (missingScopes.length > 0) {
					return `Tool '${toolName}' missing required scopes: ${missingScopes.join(', ')}`;
				}
			}

			// Check call limits
			if (
				allowedTool.restrictions.maxCalls !== undefined &&
				contextToUse?.callCount !== undefined
			) {
				if (contextToUse.callCount > allowedTool.restrictions.maxCalls) {
					return `Tool '${toolName}' exceeded call limit of ${allowedTool.restrictions.maxCalls}`;
				}
			}
		}

		return null;
	}

	private findAllowedTool(toolName: string): MCPTool | null {
		if (!this.policy) return null;

		// Check direct tools in allowlist
		const directTool = this.policy.allowlist.tools.find(
			(tool) => tool.name === toolName,
		);
		if (directTool) return directTool;

		// Check tools in categories
		for (const category of this.policy.allowlist.categories) {
			if (category.tools.includes(toolName)) {
				// Return a synthetic tool object for category-allowed tools
				return { name: toolName };
			}
		}

		return null;
	}

	private matchesPattern(toolName: string, pattern: string): boolean {
		// Simple glob-style pattern matching
		// Convert pattern to regex: * becomes .*
		const regexPattern = pattern
			.replace(/[.+?^${}()|[\]\\]/g, '\\$&') // escape special regex chars
			.replace(/\*/g, '.*'); // convert * to .*

		const regex = new RegExp(`^${regexPattern}$`);
		return regex.test(toolName);
	}
}

export function createMCPToolValidator(): MCPToolValidator {
	return new MCPToolValidatorImpl();
}
