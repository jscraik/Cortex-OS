type PolicyRouter = {
	route: (input: {
		interfaceId: string;
		capabilities: string[];
		tags: string[];
		source: string;
	}) => Promise<{
		requestId: string;
		selectedAgent: any;
		candidates: any;
		approval: any;
		appliedRules: any;
		policyVersion: any;
	}>;
	explain: (requestId: string) => any;
};

interface RoutingToolInput {
	interfaceId: string;
	capabilities?: string[];
	tags?: string[];
	source?: string;
}

interface RoutingExplainInput {
	requestId: string;
}

export function createRoutingTools(router: PolicyRouter) {
	return [
		{
			name: 'routing.dryRun',
			description: 'Preview a routing decision for a given interface and capability set.',
			inputSchema: {
				type: 'object',
				properties: {
					interfaceId: { type: 'string' },
					capabilities: { type: 'array', items: { type: 'string' }, default: [] },
					tags: { type: 'array', items: { type: 'string' }, default: [] },
					source: { type: 'string', default: 'mcp' },
				},
				required: ['interfaceId'],
			},
			handler: async (params: RoutingToolInput) => {
				const decision = await router.route({
					interfaceId: params.interfaceId,
					capabilities: params.capabilities ?? [],
					tags: params.tags ?? [],
					source: params.source ?? 'mcp',
				});
				return {
					requestId: decision.requestId,
					selectedAgent: decision.selectedAgent,
					candidates: decision.candidates,
					approval: decision.approval,
					appliedRules: decision.appliedRules,
					policyVersion: decision.policyVersion,
				};
			},
		},
		{
			name: 'routing.explain',
			description: 'Explain a routing decision captured earlier.',
			inputSchema: {
				type: 'object',
				properties: {
					requestId: { type: 'string' },
				},
				required: ['requestId'],
			},
			handler: async (params: RoutingExplainInput) => {
				const decision = router.explain(params.requestId);
				if (!decision) {
					return { found: false };
				}
				return {
					found: true,
					decision,
				};
			},
		},
	];
}
