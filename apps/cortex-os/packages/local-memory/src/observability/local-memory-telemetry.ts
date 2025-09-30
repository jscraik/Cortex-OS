import { withSpan } from '@cortex-os/telemetry';
import type { TelemetryOptions } from './types.js';

/**
 * brAInwav Local Memory - Telemetry Instrumentation
 * Wraps memory operations with OpenTelemetry spans using GenAI semantic conventions
 */

export async function instrumentRetrieval<T>(
  operation: () => Promise<T>,
  options: TelemetryOptions,
): Promise<T> {
  return withSpan(
    'gen_ai.retrieval',
    operation,
    {
      attributes: {
        'brAInwav.operation': 'retrieval',
        'brAInwav.model': options.model,
        'brAInwav.tokens': options.tokenCount,
        'gen_ai.operation.name': 'retrieval',
        'gen_ai.request.model': options.model,
      },
    },
  );
}

export async function instrumentReranker<T>(
  operation: () => Promise<T>,
  options: TelemetryOptions,
): Promise<T> {
  return withSpan(
    'gen_ai.reranker',
    operation,
    {
      attributes: {
        'brAInwav.operation': 'reranker',
        'brAInwav.model': options.model,
        'brAInwav.tokens': options.tokenCount,
        'gen_ai.operation.name': 'reranker',
        'gen_ai.request.model': options.model,
      },
    },
  );
}

export async function instrumentGeneration<T>(
  operation: () => Promise<T>,
  options: TelemetryOptions,
): Promise<T> {
  return withSpan(
    'gen_ai.generation',
    operation,
    {
      attributes: {
        'brAInwav.operation': 'generation',
        'brAInwav.model': options.model,
        'brAInwav.tokens': options.tokenCount,
        'gen_ai.operation.name': 'generation',
        'gen_ai.request.model': options.model,
      },
    },
  );
}
