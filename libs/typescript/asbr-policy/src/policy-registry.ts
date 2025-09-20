export type PolicyEvaluationContext =
  | { kind: 'task.create'; input: unknown }
  | { kind: string; payload?: unknown };

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
}

export interface PolicyDefinition {
  id: string;
  description?: string;
  evaluate(context: PolicyEvaluationContext): PolicyDecision;
}

export interface RegisteredPolicy {
  policy: PolicyDefinition;
  enabled: boolean;
}

export class PolicyRegistry {
  private readonly policies = new Map<string, RegisteredPolicy>();

  register(name: string, policy: PolicyDefinition): void {
    if (this.policies.has(name)) {
      throw new Error(`Policy '${name}' is already registered`);
    }
    this.policies.set(name, { policy, enabled: true });
  }

  enable(name: string): void {
    const entry = this.policies.get(name);
    if (!entry) {
      throw new Error(`Policy '${name}' is not registered`);
    }
    entry.enabled = true;
  }

  disable(name: string): void {
    const entry = this.policies.get(name);
    if (!entry) {
      throw new Error(`Policy '${name}' is not registered`);
    }
    entry.enabled = false;
  }

  evaluate(context: PolicyEvaluationContext): PolicyDecision {
    for (const [name, entry] of this.policies) {
      if (!entry.enabled) continue;
      const decision = entry.policy.evaluate(context);
      if (!decision.allowed) {
        return {
          allowed: false,
          reason: decision.reason ?? `Policy '${name}' denied the request`,
        };
      }
    }

    return { allowed: true };
  }

  list(): Record<string, RegisteredPolicy> {
    return Object.fromEntries(this.policies.entries());
  }
}
