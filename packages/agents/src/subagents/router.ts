/**
 * Auto-delegation router for subagents
 *
 * This module provides intelligent routing of tasks to appropriate subagents
 * based on message content, user preferences, and agent capabilities.
 */

import { createPinoLogger } from '@voltagent/logger';
import type {
	DelegationRequest,
	ISubagentRegistry,
	SubagentConfig,
} from './types';

const logger = createPinoLogger({ name: 'DelegationRouter' });

export interface RoutingRule {
	/** Pattern to match in the message */
	pattern: string | RegExp | ((message: string) => boolean);
	/** Target subagent name(s) - can be single or multiple */
	targets: string | string[];
	/** Confidence score (0-1) for this match */
	confidence: number;
	/** Optional conditions */
	conditions?: {
		/** Required tools must be available */
		tools?: string[];
		/** Maximum complexity level */
		maxComplexity?: number;
		/** Minimum confidence threshold */
		minConfidence?: number;
	};
}

export interface RouterConfig {
	/** Default subagent to use when no specific match */
	defaultSubagent?: string;
	/** Maximum number of subagents to fan out to */
	maxFanout?: number;
	/** Confidence threshold for automatic delegation */
	confidenceThreshold?: number;
	/** Custom routing rules */
	rules?: RoutingRule[];
	/** Enable parallel execution for multiple matches */
	enableParallel?: boolean;
}

export class DelegationRouter {
	private rules: RoutingRule[] = [];
	private config: Required<RouterConfig>;

	constructor(
		private registry: ISubagentRegistry,
		config?: RouterConfig,
	) {
		this.config = {
			defaultSubagent: config?.defaultSubagent || 'general',
			maxFanout: config?.maxFanout || 3,
			confidenceThreshold: config?.confidenceThreshold || 0.7,
			enableParallel: config?.enableParallel ?? true,
			rules: [],
		};

		// Initialize default rules
		this.initializeDefaultRules();

		// Add custom rules
		if (config?.rules) {
			this.rules.push(...config.rules);
		}
	}

	/**
	 * Route a message to appropriate subagents
	 */
	async route(
		message: string,
		context?: {
			userId?: string;
			preferences?: Record<string, unknown>;
			complexity?: number;
		},
	): Promise<{
		primary?: string;
		candidates: Array<{
			subagent: string;
			confidence: number;
			reason: string;
		}>;
		shouldDelegate: boolean;
		strategy: 'single' | 'fanout' | 'none';
	}> {
		const candidates = await this.findCandidates(message, context);
		const shouldDelegate =
			candidates.length > 0 &&
			candidates[0].confidence >= this.config.confidenceThreshold;

		let strategy: 'single' | 'fanout' | 'none' = 'none';
		let primary: string | undefined;

		if (shouldDelegate) {
			if (candidates.length === 1 || !this.config.enableParallel) {
				strategy = 'single';
				primary = candidates[0].subagent;
			} else {
				strategy = 'fanout';
				// Use top candidate as primary if available
				if (candidates[0].confidence > 0.9) {
					primary = candidates[0].subagent;
				}
			}
		}

		return {
			primary,
			candidates,
			shouldDelegate,
			strategy,
		};
	}

	/**
	 * Create delegation requests based on routing
	 */
	async createDelegations(
		message: string,
		strategy: 'single' | 'fanout' | 'none',
		candidates: Array<{ subagent: string; confidence: number; reason: string }>,
		context?: Record<string, unknown>,
	): Promise<DelegationRequest[]> {
		if (strategy === 'none') {
			return [];
		}

		const requests: DelegationRequest[] = [];

		if (strategy === 'single') {
			const target = candidates[0];
			requests.push({
				to: target.subagent,
				message,
				context: context?.input,
				metadata: {
					reason: target.reason,
					strategy: 'single',
				},
			});
		} else {
			// Fan out to top N candidates
			const fanoutCount = Math.min(this.config.maxFanout, candidates.length);

			for (let i = 0; i < fanoutCount; i++) {
				const candidate = candidates[i];
				requests.push({
					to: candidate.subagent,
					message,
					context: context?.input,
					metadata: {
						reason: candidate.reason,
						strategy: 'fanout',
						rank: i + 1,
						total: fanoutCount,
					},
				});
			}
		}

		return requests;
	}

	/**
	 * Find matching subagents for a message
	 */
	private async findCandidates(
		message: string,
		context?: Record<string, unknown>,
	): Promise<Array<{ subagent: string; confidence: number; reason: string }>> {
		const candidates: Array<{
			subagent: string;
			confidence: number;
			reason: string;
		}> = [];

		// Get all available subagents
		const subagents = await this.registry.list();

		// Apply routing rules
		for (const rule of this.rules) {
			const match = this.evaluateRule(rule, message, context);
			if (!match.matches) continue;

			const targets = Array.isArray(rule.targets)
				? rule.targets
				: [rule.targets];

			for (const target of targets) {
				const subagent = subagents.find((s) => s.name === target);
				if (!subagent) {
					logger.warn(`Subagent not found: ${target}`);
					continue;
				}

				// Check conditions
				if (!this.checkConditions(rule.conditions, subagent, context)) {
					continue;
				}

				candidates.push({
					subagent: target,
					confidence: match.confidence * rule.confidence,
					reason: match.reason,
				});
			}
		}

		// Sort by confidence
		candidates.sort((a, b) => b.confidence - a.confidence);

		return candidates;
	}

	/**
	 * Evaluate a routing rule against a message
	 */
	private evaluateRule(
		rule: RoutingRule,
		message: string,
		_context?: Record<string, unknown>,
	): { matches: boolean; confidence: number; reason: string } {
		let matches = false;
		let confidence = 0.5;
		let reason = '';

		if (typeof rule.pattern === 'string') {
			matches = message.toLowerCase().includes(rule.pattern.toLowerCase());
			reason = `matched pattern: "${rule.pattern}"`;
		} else if (rule.pattern instanceof RegExp) {
			const match = message.match(rule.pattern);
			matches = !!match;
			reason = `matched regex: ${rule.pattern}`;
			confidence = match ? Math.min(match.length / message.length, 1) : 0;
		} else if (typeof rule.pattern === 'function') {
			const result = rule.pattern(message);
			matches = result;
			reason = 'matched function pattern';
		}

		return { matches, confidence, reason };
	}

	/**
	 * Check routing rule conditions
	 */
	private checkConditions(
		conditions: RoutingRule['conditions'],
		subagent: SubagentConfig,
		context?: any,
	): boolean {
		if (!conditions) return true;

		// Check tool requirements
		if (conditions.tools && conditions.tools.length > 0) {
			const hasTools = conditions.tools.every(
				(tool) =>
					subagent.allowed_tools?.includes(tool) ||
					!subagent.blocked_tools?.includes(tool),
			);

			if (!hasTools) return false;
		}

		// Check complexity
		if (conditions.maxComplexity && context?.complexity) {
			if (context.complexity > conditions.maxComplexity) {
				return false;
			}
		}

		// Check minimum confidence
		if (conditions.minConfidence) {
			// This would be calculated based on the match
		}

		return true;
	}

	/**
	 * Initialize default routing rules
	 */
	private initializeDefaultRules(): void {
		this.rules = [
			{
				pattern: /(?:code|programming|develop|implement|debug|refactor)/i,
				targets: ['code-analysis', 'code-generation'],
				confidence: 0.9,
				conditions: {
					tools: ['read', 'write', 'execute'],
				},
			},
			{
				pattern: /(?:test|spec|unit|integration|e2e|coverage)/i,
				targets: ['test-generation', 'test-analysis'],
				confidence: 0.9,
			},
			{
				pattern: /(?:document|readme|docs|markdown|comment)/i,
				targets: ['documentation'],
				confidence: 0.8,
			},
			{
				pattern: /(?:review|analyze|audit|quality|lint)/i,
				targets: ['code-review', 'quality-assurance'],
				confidence: 0.8,
			},
			{
				pattern: /(?:security|vulnerability|exploit|safe)/i,
				targets: ['security-analysis'],
				confidence: 0.95,
			},
			{
				pattern: /(?:performance|optimize|speed|memory|cpu)/i,
				targets: ['performance-analysis'],
				confidence: 0.8,
			},
			{
				pattern: /(?:architect|design|structure|pattern)/i,
				targets: ['architecture'],
				confidence: 0.8,
			},
			{
				pattern: /(?:deploy|ci\/cd|pipeline|release)/i,
				targets: ['devops'],
				confidence: 0.8,
			},
			{
				pattern: /(?:data|database|sql|nosql)/i,
				targets: ['data-analysis'],
				confidence: 0.7,
			},
			{
				pattern: /(?:api|rest|graphql|endpoint)/i,
				targets: ['api-development'],
				confidence: 0.8,
			},
		];
	}

	/**
	 * Add a custom routing rule
	 */
	addRule(rule: RoutingRule): void {
		this.rules.push(rule);
		logger.info(
			`Added routing rule for: ${Array.isArray(rule.targets) ? rule.targets.join(', ') : rule.targets}`,
		);
	}

	/**
	 * Remove a routing rule
	 */
	removeRule(index: number): void {
		if (index >= 0 && index < this.rules.length) {
			this.rules.splice(index, 1);
			logger.info('Removed routing rule');
		}
	}

	/**
	 * Get all routing rules
	 */
	getRules(): RoutingRule[] {
		return [...this.rules];
	}

	/**
	 * Get router statistics
	 */
	getStats() {
		return {
			totalRules: this.rules.length,
			config: this.config,
		};
	}
}
