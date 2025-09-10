import { z } from 'zod';

const GrantSchema = z.object({
	actions: z.array(z.string()),
	rate: z.object({ perMinute: z.number() }),
	rules: z.object({
		allow_embeddings: z.boolean(),
		allow_rerank: z.boolean(),
		allow_chat: z.boolean(),
	}),
});

export type Grant = z.infer<typeof GrantSchema>;

const GRANTS: Record<string, Grant> = {
	'model-gateway': {
		actions: ['embeddings', 'rerank', 'chat'],
		rate: { perMinute: 60 },
		rules: {
			allow_embeddings: true,
			allow_rerank: true,
			allow_chat: true,
		},
	},
};

const rateCounters = new Map<string, { count: number; reset: number }>();

export async function loadGrant(service: string): Promise<Grant> {
	const grant = GRANTS[service];
	if (!grant) throw new Error(`No grant found for service ${service}`);
	return GrantSchema.parse(grant);
}

export async function enforce(
	grant: Grant,
	operation: 'embeddings' | 'rerank' | 'chat',
	_body?: unknown,
) {
	const ruleMap: Record<string, keyof Grant['rules']> = {
		embeddings: 'allow_embeddings',
		rerank: 'allow_rerank',
		chat: 'allow_chat',
	};
	const ruleKey = ruleMap[operation];
	if (!ruleKey || !grant.rules[ruleKey]) {
		throw new Error(`Operation ${operation} not allowed by policy`);
	}
	const limit = grant.rate.perMinute;
	const now = Date.now();
	const counter = rateCounters.get(operation) || {
		count: 0,
		reset: now + 60_000,
	};
	if (now > counter.reset) {
		counter.count = 0;
		counter.reset = now + 60_000;
	}
	if (counter.count >= limit) {
		throw new Error(`Rate limit exceeded for ${operation}`);
	}
	counter.count += 1;
	rateCounters.set(operation, counter);
	return true;
}
