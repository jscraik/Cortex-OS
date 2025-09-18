/**
 * Topic ACL Enforcement
 */
export interface TopicAclRule {
	topic: string;
	publish?: boolean;
	subscribe?: boolean;
	roles?: string[];
}
export interface TopicAclConfig {
	rules: TopicAclRule[];
	defaultPublish?: boolean;
	defaultSubscribe?: boolean;
}
export interface AclDecision {
	allowed: boolean;
	reason?: string;
	rule?: TopicAclRule;
}
function matchRule(topic: string, ruleTopic: string): boolean {
	if (ruleTopic.endsWith('*')) return topic.startsWith(ruleTopic.slice(0, -1));
	return topic === ruleTopic;
}
export class TopicAcl {
	private readonly rules: TopicAclRule[];
	private readonly defaultPublish: boolean;
	private readonly defaultSubscribe: boolean;
	constructor(cfg: TopicAclConfig) {
		this.rules = cfg.rules;
		this.defaultPublish = cfg.defaultPublish ?? false;
		this.defaultSubscribe = cfg.defaultSubscribe ?? false;
	}
	private evaluate(topic: string, intent: 'publish' | 'subscribe', role?: string): AclDecision {
		for (const rule of this.rules) {
			if (matchRule(topic, rule.topic)) {
				const allowedFlag = intent === 'publish' ? rule.publish : rule.subscribe;
				if (!allowedFlag) return { allowed: false, reason: 'Denied by rule', rule };
				if (rule.roles && role && !rule.roles.includes(role))
					return { allowed: false, reason: 'Role not permitted', rule };
				return { allowed: true, rule };
			}
		}
		const def = intent === 'publish' ? this.defaultPublish : this.defaultSubscribe;
		return { allowed: def, reason: def ? undefined : 'No matching rule' };
	}
	canPublish(topic: string, role?: string) {
		return this.evaluate(topic, 'publish', role);
	}
	canSubscribe(topic: string, role?: string) {
		return this.evaluate(topic, 'subscribe', role);
	}
}
export function createTopicAcl(config: TopicAclConfig): TopicAcl {
	return new TopicAcl(config);
}
