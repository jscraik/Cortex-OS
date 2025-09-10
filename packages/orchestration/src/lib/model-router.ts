export type Node = 'plan' | 'gather' | 'critic' | 'synthesize' | 'verify';
export type Provider = 'mlx' | 'ollama' | 'frontier';
export function pickModel(n: Node): { provider: Provider; model: string } {
	if (n === 'critic' || n === 'synthesize')
		return {
			provider: 'mlx',
			model: 'mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit',
		};
	if (n === 'verify')
		return { provider: 'mlx', model: 'llamas-community/LlamaGuard-7b' };
	return {
		provider: 'mlx',
		model: 'mlx-community/Phi-3-mini-4k-instruct-4bit',
	};
}
