export type Node = 'plan' | 'gather' | 'critic' | 'synthesize' | 'verify';
export type Provider = 'mlx' | 'ollama' | 'frontier';
const defaultMapping: Record<Node, { provider: Provider; model: string }> = {
	plan: {
		provider: 'mlx',
		model: 'mlx-community/Phi-3-mini-4k-instruct-4bit',
	},
	gather: {
		provider: 'mlx',
		model: 'mlx-community/Phi-3-mini-4k-instruct-4bit',
	},
	critic: {
		provider: 'mlx',
		model: 'mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit',
	},
	synthesize: {
		provider: 'mlx',
		model: 'mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit',
	},
	verify: { provider: 'mlx', model: 'llamas-community/LlamaGuard-7b' },
};

function loadMapping(): Record<Node, { provider: Provider; model: string }> {
	try {
		const overrides = JSON.parse(process.env.MODEL_ROUTER_MAPPING || '{}') as Partial<
			Record<Node, { provider: Provider; model: string }>
		>;
		return { ...defaultMapping, ...overrides };
	} catch {
		return { ...defaultMapping };
	}
}

const mapping = loadMapping();

export function pickModel(n: Node): { provider: Provider; model: string } {
	return mapping[n];
}
