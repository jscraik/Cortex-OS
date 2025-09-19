import { z } from 'zod';

export const ResourceManagerConfigSchema = z.object({
	maxConcurrentAgents: z.number().int().positive().max(1000).default(5),
});
export type ResourceManagerConfig = z.infer<typeof ResourceManagerConfigSchema>;

export class ResourceManager {
	private readonly cfg: ResourceManagerConfig;

	constructor(config?: Partial<ResourceManagerConfig>) {
		this.cfg = ResourceManagerConfigSchema.parse({
			maxConcurrentAgents: 5,
			...(config || {}),
		});
	}

	async allocateResources(plan: { steps: Array<{ id: string }> }): Promise<{ agents: string[] }> {
		// Minimal allocation: cap to maxConcurrentAgents
		const required = Math.min(plan.steps.length, this.cfg.maxConcurrentAgents);
		const agents = Array.from({ length: required }, (_, i) => `agent-${i + 1}`);
		return { agents };
	}
}
