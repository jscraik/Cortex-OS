/**
 * Core types for the feature flags system
 */

export interface FlagConfig {
	/** Whether the flag is enabled by default */
	readonly enabled: boolean;
	/** Targeting rules for specific users or attributes */
	readonly targeting?: TargetingConfig;
	/** Percentage rollout configuration */
	readonly percentageRollout?: PercentageRollout;
	/** A/B testing configuration */
	readonly abTest?: ABTestConfig;
	/** User-specific overrides */
	readonly overrides?: Record<string, boolean>;
	/** Metadata about the flag */
	readonly metadata?: Record<string, unknown>;
}

export interface TargetingConfig {
	/** Specific user IDs to target */
	readonly userTargets?: string[];
	/** Attribute-based targeting rules */
	readonly attributeRules?: AttributeRule[];
	/** Logic for combining rules (AND/OR) */
	readonly ruleLogic?: 'AND' | 'OR';
}

export interface AttributeRule {
	/** The attribute name to check */
	readonly attribute: string;
	/** The operator to use for comparison */
	readonly operator: AttributeOperator;
	/** The value to compare against */
	readonly value: string | number | boolean;
}

export type AttributeOperator =
	| 'equals'
	| 'notEquals'
	| 'contains'
	| 'notContains'
	| 'startsWith'
	| 'endsWith'
	| 'greaterThan'
	| 'lessThan'
	| 'greaterThanOrEqual'
	| 'lessThanOrEqual'
	| 'in'
	| 'notIn';

export interface PercentageRollout {
	/** Percentage of users to roll out to (0-100) */
	readonly percentage: number;
	/** Salt for deterministic hashing */
	readonly salt: string;
}

export interface ABTestConfig {
	/** Test groups with their percentages */
	readonly groups: TestGroup[];
	/** Salt for deterministic hashing */
	readonly salt: string;
}

export interface TestGroup {
	/** Name of the test group */
	readonly name: string;
	/** Percentage allocation for this group */
	readonly percentage: number;
	/** Configuration specific to this group */
	readonly config?: Record<string, unknown>;
}

export interface UserContext {
	/** Unique user identifier */
	readonly userId: string;
	/** Additional user attributes for targeting */
	readonly attributes?: Record<string, unknown>;
	/** Session identifier */
	readonly sessionId?: string;
	/** Request identifier */
	readonly requestId?: string;
}

export interface FeatureFlagsOptions {
	/** Storage adapter for persistence */
	readonly storage?: StorageAdapter;
	/** Default flag values */
	readonly defaults?: Record<string, FlagConfig>;
	/** Whether to emit change events */
	readonly emitEvents?: boolean;
}

export interface StorageAdapter {
	/** Get stored value by key */
	get(key: string): Promise<unknown>;
	/** Set value by key */
	set(key: string, value: unknown): Promise<void>;
	/** Delete value by key */
	delete(key: string): Promise<void>;
	/** Clear all stored values */
	clear(): Promise<void>;
}

export interface FlagChangeEvent {
	/** The flag name that changed */
	readonly flagName: string;
	/** The new flag configuration */
	readonly config: FlagConfig;
	/** Timestamp of the change */
	readonly timestamp: string;
}

export interface FlagAnalyticsEvent {
	/** Event type */
	readonly type: 'flagEvaluation' | 'groupAssignment';
	/** The flag name */
	readonly flagName: string;
	/** User context */
	readonly userContext: UserContext;
	/** Result of evaluation */
	readonly result: boolean | string;
	/** Timestamp */
	readonly timestamp: string;
}
