import { readFile } from 'fs/promises';
import type { MemoryPolicy } from '../lib/types.js';

export type Capability = 'code-analysis' | 'test-generation' | 'documentation' | 'security';
export type MemoryPolicies = Partial<Record<Capability, MemoryPolicy>>;

/**
 * Load memoryPolicies from a JSON file path.
 * Schema (example):
 * {
 *   "code-analysis": { "namespace": "agents:code-analysis", "ttl": "PT30M", "maxItemBytes": 256000 },
 *   "security": { "namespace": "agents:security", "ttl": "PT1H" }
 * }
 */
export const loadMemoryPoliciesFromFile = async (filePath: string): Promise<MemoryPolicies> => {
  const json = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(json);
  return parsed as MemoryPolicies;
};

/**
 * Load memoryPolicies via environment variables:
 * - AGENTS_MEMORY_POLICIES: inline JSON
 * - AGENTS_MEMORY_POLICIES_FILE: path to JSON file
 * If both present, file takes precedence.
 */
export const loadMemoryPoliciesFromEnv = async (): Promise<MemoryPolicies | undefined> => {
  const file = process.env.AGENTS_MEMORY_POLICIES_FILE;
  if (file && file.trim()) {
    try {
      return await loadMemoryPoliciesFromFile(file);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[agents] Failed to load memory policies from file:', file, e);
      }
    }
  }
  const inline = process.env.AGENTS_MEMORY_POLICIES;
  if (inline && inline.trim()) {
    try {
      return JSON.parse(inline) as MemoryPolicies;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[agents] Failed to parse AGENTS_MEMORY_POLICIES JSON:', e);
      }
    }
  }
  return undefined;
};
