import type { Plugin } from '../adapters/store.plugin.js';
import type { Memory } from '../ports/MemoryStore.js';

/**
 * Compression Plugin - Compresses large memory texts to save space
 */
export const createCompressionPlugin = (threshold: number = 1000): Plugin => {
	const compressText = (text: string): string => {
		// Simple compression for demo - in real implementation, use proper compression
		if (text.length <= threshold) return text;

		// Truncate and add compression marker
		const compressed = `${text.substring(0, threshold)}...[COMPRESSED]`;
		return compressed;
	};

	const decompressText = (text: string): string => {
		if (!text.endsWith('[COMPRESSED]')) return text;
		// In real implementation, decompress here
		return text.replace('[COMPRESSED]', '');
	};

	return {
		id: 'compression-plugin',
		name: 'Compression Plugin',
		version: '1.0.0',
		description: `Compresses memory texts longer than ${threshold} characters`,
		hooks: {
			beforeUpsert: async (memory: Memory) => {
				if (memory.text && memory.text.length > threshold) {
					const originalLength = memory.text.length;
					memory.text = compressText(memory.text);
					memory.metadata = {
						...memory.metadata,
						compressed: true,
						originalLength,
						compressedAt: new Date().toISOString(),
					};
				}
				return memory;
			},
			afterGet: async (memory: Memory | null) => {
				if (memory?.metadata?.compressed) {
					// Keep the compressed text but add decompression marker
					memory.text = memory.text.replace('[COMPRESSED]', '[DECOMPRESSED]');
					// Remove compression metadata
					const { compressed, originalLength, compressedAt, ...rest } = memory.metadata;
					memory.metadata = rest;
				}
				return memory;
			},
			afterSearch: async (results: Memory[]) => {
				// Decompress search results
				return results.map((memory) => {
					if (memory.metadata?.compressed) {
						return {
							...memory,
							text: decompressText(memory.text),
							metadata: {
								...memory.metadata,
								searchResultCompressed: true,
							},
						};
					}
					return memory;
				});
			},
		},
		onRegister: async () => {
			console.log(`[COMPRESSION] Compression plugin registered with threshold: ${threshold}`);
		},
		onUnregister: async () => {
			console.log('[COMPRESSION] Compression plugin unregistered');
		},
	};
};
