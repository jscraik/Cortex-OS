/**
 * @file_path src/rag/policy/load.ts
 * Loads and validates retrieval policy JSON and wires MimePolicyEngine/dispatcher usage.
 */

import Ajv2020 from 'ajv/dist/2020';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  ProcessingDispatcher,
  type DispatchResult,
  type ProcessingFile,
} from '../chunkers/dispatch';
import {
  MimePolicyEngine,
  type MimePolicyConfig,
  type ProcessingConfig,
  type StrategyDecision,
} from './mime.js';
// meta202012 is statically imported; if bundler fails, TS will surface error during build.

export interface RetrievalPolicy {
  version?: string;
  description?: string;
  mimePolicy: MimePolicyConfig;
  dispatcher?: {
    timeout?: number;
    maxChunkSize?: number;
    enableParallel?: boolean;
  };
  overrides?: Record<
    string,
    {
      processing?: Partial<{ maxPages: number | null }> & Record<string, unknown>;
    }
  >;
  security?: {
    sanitizeFilenames?: boolean;
    blocklist?: string[];
  };
}

export interface LoadedPolicy {
  policy: RetrievalPolicy;
  engine: MimePolicyEngine;
}

/**
 * Load and validate retrieval policy from JSON file using the local JSON Schema.
 */
export async function loadRetrievalPolicy(
  configPath = path.resolve(process.cwd(), 'config/retrieval.policy.json'),
  schemaPath = path.resolve(process.cwd(), 'schemas/retrieval.policy.schema.json'),
): Promise<LoadedPolicy> {
  const [configRaw, schemaRaw] = await Promise.all([
    readFile(configPath, 'utf8'),
    readFile(schemaPath, 'utf8'),
  ]);

  const policyUnknown: unknown = JSON.parse(configRaw);
  const schemaUnknown: unknown = JSON.parse(schemaRaw);

  // Use draft-2020-12 aware Ajv instance (covers schemas with $schema: 2020-12)
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile<RetrievalPolicy>(schemaUnknown as Record<string, unknown>);
  const valid = validate(policyUnknown);
  if (!valid) {
    const msg = ajv.errorsText(validate.errors, { separator: '\n' });
    throw new Error(`Retrieval policy validation failed:\n${msg}`);
  }
  const policy = policyUnknown as RetrievalPolicy;
  const engine = new MimePolicyEngine(policy.mimePolicy);
  return { policy, engine };
}

/**
 * Apply policy overrides (exact MIME or wildcard category like `image/*`) to a StrategyDecision.
 */
export function applyPolicyOverrides(
  decision: StrategyDecision,
  mimeType: string,
  policy: RetrievalPolicy,
): StrategyDecision {
  if (!policy.overrides) return decision;

  const normalized = mimeType.split(';')[0].trim().toLowerCase();
  const exact = policy.overrides[normalized];
  const wildcard = (() => {
    const [type] = normalized.split('/');
    return policy.overrides?.[`${type}/*`];
  })();

  const override = exact || wildcard;
  if (!override) return decision;

  if (!decision.processing) return decision;

  // Shallow merge of processing overrides (currently only maxPages is supported in policy)
  const nextProcessing: ProcessingConfig = { ...decision.processing };
  if (override.processing && typeof override.processing === 'object') {
    if (Object.hasOwn(override.processing, 'maxPages')) {
      nextProcessing.maxPages =
        (override.processing as { maxPages?: number | null }).maxPages ?? null;
    }
  }

  return { ...decision, processing: nextProcessing };
}

/**
 * High-level helper to: parse strategy with engine, apply overrides from policy, then dispatch.
 */
export async function planAndDispatch(
  file: ProcessingFile,
  mimeType: string,
  engine: MimePolicyEngine,
  dispatcher: ProcessingDispatcher,
  policy?: RetrievalPolicy,
): Promise<DispatchResult> {
  // Compute base decision
  let decision = engine.parseStrategy(mimeType, { fileSize: file.size });
  if (policy) {
    decision = applyPolicyOverrides(decision, mimeType, policy);
  }
  return dispatcher.dispatch(file, decision);
}

/**
 * Convenience creator for dispatcher. Currently returns defaults, allowing future policy mapping.
 */
export function createDispatcherFromPolicy(policy?: RetrievalPolicy): ProcessingDispatcher {
  if (policy?.dispatcher) {
    const { timeout, maxChunkSize, enableParallel } = policy.dispatcher;
    return new ProcessingDispatcher({
      ...(typeof timeout === 'number' ? { timeout } : {}),
      ...(typeof maxChunkSize === 'number' ? { maxChunkSize } : {}),
      ...(typeof enableParallel === 'boolean' ? { enableParallel } : {}),
    });
  }
  return new ProcessingDispatcher();
}
