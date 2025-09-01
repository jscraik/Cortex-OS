import { readFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import {
  type DispatchResult,
  ProcessingDispatcher,
  type ProcessingFile,
} from '../chunkers/dispatch';
import {
  type MimePolicyConfig,
  MimePolicyEngine,
  type ProcessingConfig,
  type StrategyDecision,
} from './mime';

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
    { processing?: Partial<{ maxPages: number | null }> & Record<string, unknown> }
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

export async function loadRetrievalPolicy(
  configPath = resolvePath(process.cwd(), 'config/retrieval.policy.json'),
  schemaPath = resolvePath(process.cwd(), 'schemas/retrieval.policy.schema.json'),
): Promise<LoadedPolicy> {
  const [configRaw, schemaRaw] = await Promise.all([
    readFile(configPath, 'utf8'),
    readFile(schemaPath, 'utf8'),
  ]);

  const policyUnknown: unknown = JSON.parse(configRaw);
  const schemaUnknown: unknown = JSON.parse(schemaRaw);

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

  const nextProcessing: ProcessingConfig = { ...decision.processing };
  if (override.processing && typeof override.processing === 'object') {
    if (Object.hasOwn(override.processing, 'maxPages')) {
      nextProcessing.maxPages =
        (override.processing as { maxPages?: number | null }).maxPages ?? null;
    }
  }
  return { ...decision, processing: nextProcessing };
}

export async function planAndDispatch(
  file: ProcessingFile,
  mimeType: string,
  engine: MimePolicyEngine,
  dispatcher: ProcessingDispatcher,
  policy?: RetrievalPolicy,
): Promise<DispatchResult> {
  let decision = engine.parseStrategy(mimeType, { fileSize: file.size });
  if (policy) {
    decision = applyPolicyOverrides(decision, mimeType, policy);
  }
  return dispatcher.dispatch(file, decision);
}

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
