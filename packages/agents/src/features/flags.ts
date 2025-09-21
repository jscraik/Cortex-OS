import crypto from 'crypto';
import { EventEmitter } from 'events';
import type {
  ABTestConfig,
  AttributeRule,
  FeatureFlagsOptions,
  FlagChangeEvent,
  FlagConfig,
  PercentageRollout,
  StorageAdapter,
  TargetingConfig,
  UserContext
} from './types';

// Re-export types for external use
export type { AttributeOperator, FlagConfig, TestGroup } from './types';

/**
 * Feature Flags System with targeting, percentage rollout, and A/B testing support
 */
export class FeatureFlags extends EventEmitter {
  private flags: Map<string, FlagConfig> = new Map();
  private storage?: StorageAdapter;
  private emitEvents: boolean;
  private storageLoaded: Promise<void>;

  constructor(options: FeatureFlagsOptions = {}) {
    super();
    this.storage = options.storage;
    this.emitEvents = options.emitEvents ?? true;

    // Initialize with defaults
    if (options.defaults) {
      for (const [name, config] of Object.entries(options.defaults)) {
        this.flags.set(name, config);
      }
    }

    // Load from storage if available
    this.storageLoaded = this.loadFromStorage();
  }

  /**
   * Check if a flag is enabled for a given user context
   */
  async isEnabled(
    flagName: string,
    userContext: UserContext,
    defaultValue = false,
  ): Promise<boolean> {
    // Ensure storage is loaded before checking flags
    await this.storageLoaded;

    const config = this.flags.get(flagName);

    if (!config) {
      return defaultValue;
    }

    // Check user overrides first
    if (config.overrides && userContext.userId in config.overrides) {
      return config.overrides[userContext.userId]!;
    }

    // If flag is disabled, return false
    if (!config.enabled) {
      return false;
    }

    // Check targeting rules
    if (config.targeting) {
      const targeted = this.evaluateTargeting(config.targeting, userContext);
      if (!targeted) {
        return defaultValue;
      }
    }

    // Check percentage rollout
    if (config.percentageRollout) {
      return this.evaluatePercentageRollout(config.percentageRollout, userContext.userId);
    }

    return true;
  }

  /**
   * Get the A/B test variant for a user
   */
  async getVariant(flagName: string, userContext: UserContext): Promise<string | null> {
    // Ensure storage is loaded before checking flags
    await this.storageLoaded;

    const config = this.flags.get(flagName);

    if (!config || !config.abTest) {
      return null;
    }

    return this.evaluateABTest(config.abTest, userContext.userId);
  }

  /**
   * Set a flag configuration
   */
  async setFlag(flagName: string, config: FlagConfig): Promise<void> {
    // Ensure storage is loaded before setting flags
    await this.storageLoaded;

    const previousConfig = this.flags.get(flagName);
    this.flags.set(flagName, config);

    // Save to storage
    if (this.storage) {
      await this.saveToStorage();
    }

    // Emit change event
    if (this.emitEvents && (!previousConfig || this.configsDiffer(previousConfig, config))) {
      this.emit('flagChanged', {
        flagName,
        config,
        timestamp: new Date().toISOString(),
      } as FlagChangeEvent);
    }
  }

  /**
   * Delete a flag
   */
  async deleteFlag(flagName: string): Promise<void> {
    // Ensure storage is loaded before deleting flags
    await this.storageLoaded;

    this.flags.delete(flagName);

    // Save to storage
    if (this.storage) {
      await this.saveToStorage();
    }

    // Emit change event
    if (this.emitEvents) {
      this.emit('flagDeleted', {
        flagName,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get all flag configurations
   */
  async getAllFlags(): Promise<Record<string, FlagConfig>> {
    // Ensure storage is loaded before getting flags
    await this.storageLoaded;
    return Object.fromEntries(this.flags);
  }

  /**
   * Get a specific flag configuration
   */
  async getFlag(flagName: string): Promise<FlagConfig | undefined> {
    // Ensure storage is loaded before getting flag
    await this.storageLoaded;
    return this.flags.get(flagName);
  }

  /**
   * Evaluate targeting rules against user context
   */
  private evaluateTargeting(targeting: TargetingConfig, userContext: UserContext): boolean {
    // Check user targets
    if (targeting.userTargets && targeting.userTargets.length > 0) {
      if (targeting.userTargets.includes(userContext.userId)) {
        return true;
      }
      if (targeting.ruleLogic === 'OR') {
        // If user is not in targets and logic is OR, continue to attribute rules
      } else if (
        targeting.ruleLogic === 'AND' &&
        targeting.attributeRules &&
        targeting.attributeRules.length > 0
      ) {
        // If user is not in targets and logic is AND (default), return false
        return false;
      } else if (!targeting.attributeRules || targeting.attributeRules.length === 0) {
        // No attribute rules, user is not targeted
        return false;
      }
    }

    // Check attribute rules
    if (targeting.attributeRules && targeting.attributeRules.length > 0) {
      const results = targeting.attributeRules.map((rule) =>
        this.evaluateAttributeRule(rule, userContext.attributes || {}),
      );

      if (targeting.ruleLogic === 'OR') {
        return results.some((result) => result);
      }
      return results.every((result) => result);
    }

    return true;
  }

  /**
   * Evaluate a single attribute rule
   */
  private evaluateAttributeRule(rule: AttributeRule, attributes: Record<string, unknown>): boolean {
    const value = attributes[rule.attribute];

    if (value === undefined || value === null) {
      return false;
    }

    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'notEquals':
        return value !== rule.value;
      case 'contains':
        return typeof value === 'string' && value.includes(String(rule.value));
      case 'notContains':
        return typeof value === 'string' && !value.includes(String(rule.value));
      case 'startsWith':
        return typeof value === 'string' && value.startsWith(String(rule.value));
      case 'endsWith':
        return typeof value === 'string' && value.endsWith(String(rule.value));
      case 'greaterThan':
        return Number(value) > Number(rule.value);
      case 'lessThan':
        return Number(value) < Number(rule.value);
      case 'greaterThanOrEqual':
        return Number(value) >= Number(rule.value);
      case 'lessThanOrEqual':
        return Number(value) <= Number(rule.value);
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'notIn':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      default:
        return false;
    }
  }

  /**
   * Evaluate percentage rollout
   */
  private evaluatePercentageRollout(rollout: PercentageRollout, userId: string): boolean {
    const hash = this.deterministicHash(userId, rollout.salt);
    const percentage = (hash % 100) + 1; // 1-100
    return percentage <= rollout.percentage;
  }

  /**
   * Evaluate A/B test group assignment
   */
  private evaluateABTest(abTest: ABTestConfig, userId: string): string | null {
    const hash = this.deterministicHash(userId, abTest.salt);
    const percentage = (hash % 100) + 1; // 1-100

    let cumulative = 0;
    for (const group of abTest.groups) {
      cumulative += group.percentage;
      if (percentage <= cumulative) {
        return group.name;
      }
    }

    return null;
  }

  /**
   * Generate deterministic hash from user ID and salt
   */
  private deterministicHash(userId: string, salt: string): number {
    const hash = crypto.createHash('md5').update(`${userId}:${salt}`).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Load flags from storage
   */
  private async loadFromStorage(): Promise<void> {
    if (!this.storage) {
      return;
    }

    try {
      const stored = await this.storage.get('flags');
      if (stored && typeof stored === 'object') {
        for (const [name, config] of Object.entries(stored as Record<string, FlagConfig>)) {
          this.flags.set(name, config);
        }
      }
    } catch (error) {
      console.error('Failed to load flags from storage:', error);
    }
  }

  /**
   * Save flags to storage
   */
  private async saveToStorage(): Promise<void> {
    if (!this.storage) {
      return;
    }

    try {
      const serialized = Object.fromEntries(this.flags);
      await this.storage.set('flags', serialized);
    } catch (error) {
      console.error('Failed to save flags to storage:', error);
    }
  }

  /**
   * Check if two configs differ
   */
  private configsDiffer(config1: FlagConfig, config2: FlagConfig): boolean {
    return JSON.stringify(config1) !== JSON.stringify(config2);
  }
}
