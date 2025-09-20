import type { Plugin } from '../adapters/store.plugin.js';
import type { Memory } from '../ports/MemoryStore.js';

/**
 * Audit Plugin - Logs all memory operations for auditing purposes
 */
export const createAuditPlugin = (logFn: (message: string) => void = console.log): Plugin => {
	return {
		id: 'audit-plugin',
		name: 'Audit Plugin',
		version: '1.0.0',
		description: 'Logs all memory operations for auditing',
		hooks: {
			beforeUpsert: async (memory: Memory) => {
				logFn(`[AUDIT] Upserting memory: ${memory.id}`);
				return memory;
			},
			afterUpsert: async (memory: Memory) => {
				logFn(`[AUDIT] Successfully upserted memory: ${memory.id}`);
				return memory;
			},
			beforeGet: async (id: string) => {
				logFn(`[AUDIT] Getting memory: ${id}`);
				return id;
			},
			afterGet: async (memory: Memory | null) => {
				logFn(`[AUDIT] Get result for ${memory?.id || 'unknown'}: ${memory ? 'found' : 'not found'}`);
				return memory;
			},
			beforeDelete: async (id: string) => {
				logFn(`[AUDIT] Deleting memory: ${id}`);
				return id;
			},
			afterDelete: async (id: string) => {
				logFn(`[AUDIT] Successfully deleted memory: ${id}`);
				return id;
			},
			beforeSearch: async (query) => {
				logFn(`[AUDIT] Searching memories with query: ${JSON.stringify(query)}`);
				return query;
			},
			afterSearch: async (results) => {
				logFn(`[AUDIT] Search completed, found ${results.length} memories`);
				return results;
			}
		},
		onRegister: async () => {
			logFn('[AUDIT] Audit plugin registered');
		},
		onUnregister: async () => {
			logFn('[AUDIT] Audit plugin unregistered');
		}
	};
};
