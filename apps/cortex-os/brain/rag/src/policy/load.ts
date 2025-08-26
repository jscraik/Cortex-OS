/**
 * @file_path src/rag/policy/load.ts
 * Loads and validates retrieval policy JSON and wires MimePolicyEngine/dispatcher usage.
 */

import Ajv from 'ajv';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  ProcessingDispatcher,
  type DispatchResult,
  type ProcessingFile,
} from '../chunkers/dispatch';
import { MimePolicyEngine, type MimePolicyConfig, type StrategyDecision } from './mime';
// Try to import the 2020-12 meta-schema where available (ajv v8 ships refs), fall back gracefully.
// Avoid static import of the meta-schema to keep TypeScript happy in different environments.
let meta202012: unknown | null = null;
try {
  meta202012 = require('ajv/dist/refs/json-schema-draft-2020-12.json');
} catch (err) {
  meta202012 = null;
}

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
    readFile(configPath, "utf8"),
    readFile(schemaPath, "utf8"),
  ]);

  const policy = JSON.parse(configRaw) as RetrievalPolicy;
  const schema = JSON.parse(schemaRaw);

  const ajv = new Ajv({ allErrors: true, strict: false });
  if (meta202012) {
    try {
      // Register the 2020-12 meta-schema so schemas that $ref it can be validated.
      ajv.addMetaSchema(
        meta202012 as Record<string, unknown>,
        'https://json-schema.org/draft/2020-12/schema',
      );
    } catch (e) {
      // If registration fails, warn but continue; tests may provide their own meta-schema.
      // eslint-disable-next-line no-console
      console.warn('Could not register 2020-12 meta-schema with Ajv:', (e as Error).message);
    }
  }
  const validate = ajv.compile(schema);
  const valid = validate(policy);
  if (!valid) {
    const msg = ajv.errorsText(validate.errors, { separator: "\n" });
    throw new Error(`Retrieval policy validation failed:\n${msg}`);
  }

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

  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  const exact = policy.overrides[normalized];
  const wildcard = (() => {
    const [type] = normalized.split("/");
    return policy.overrides?.[`${type}/*`];
  })();

  const override = exact || wildcard;
  if (!override) return decision;

  if (!decision.processing) return decision;

  // Shallow merge of processing overrides (currently only maxPages is supported in policy)
  const nextProcessing = { ...(decision.processing ?? {}) } as { maxPages?: number | null };
  if (override.processing && typeof override.processing === 'object') {
    if (Object.prototype.hasOwnProperty.call(override.processing, 'maxPages')) {
      nextProcessing.maxPages = (override.processing as { maxPages?: number | null }).maxPages;
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
export function createDispatcherFromPolicy(
  policy?: RetrievalPolicy,
): ProcessingDispatcher {
  if (policy?.dispatcher) {
    const { timeout, maxChunkSize, enableParallel } = policy.dispatcher;
    return new ProcessingDispatcher({
      ...(typeof timeout === "number" ? { timeout } : {}),
      ...(typeof maxChunkSize === "number" ? { maxChunkSize } : {}),
      ...(typeof enableParallel === "boolean" ? { enableParallel } : {}),
    });
  }
  return new ProcessingDispatcher();
}
