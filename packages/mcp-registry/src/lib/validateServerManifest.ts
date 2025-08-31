// Use 'any' to avoid ESM/TS default export type issues in Ajv
import {
  ServerManifestSchema,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from '../types.js';

export function validateServerManifest(ajv: any, manifest: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const validate = ajv.getSchema('server-manifest');
  if (!validate) {
    throw new Error('Server manifest schema not found');
  }

  const jsonSchemaValid = validate(manifest);
  if (!jsonSchemaValid && validate.errors) {
    for (const error of validate.errors) {
      errors.push({
        path: error.instancePath || 'root',
        message: error.message || 'Unknown error',
        code: error.keyword || 'unknown',
      });
    }
  }

  try {
    const result = ServerManifestSchema.safeParse(manifest);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          path: issue.path.join('.') || 'root',
          message: issue.message,
          code: issue.code,
        });
      }
    }
  } catch (error) {
    errors.push({
      path: 'root',
      message: `Zod validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'zod_error',
    });
  }

  if (typeof manifest === 'object' && manifest !== null) {
    const m = manifest as any;

    if (m.oauth?.authType === 'oauth2' && (!m.oauth.scopes || m.oauth.scopes.length === 0)) {
      warnings.push({
        path: 'oauth.scopes',
        message: 'OAuth2 servers should specify required scopes',
        suggestion: 'Add appropriate OAuth scopes for better security',
      });
    }

    if (!m.logo) {
      warnings.push({
        path: 'logo',
        message: 'Logo URL not provided',
        suggestion: 'Adding a logo improves discoverability',
      });
    }

    if (!m.repo) {
      warnings.push({
        path: 'repo',
        message: 'Repository URL not provided',
        suggestion: 'Adding a repository URL builds trust and allows verification',
      });
    }

    if (m.scopes && m.scopes.includes('system:exec')) {
      warnings.push({
        path: 'scopes',
        message: 'Server requests system execution permissions',
        suggestion: 'Consider if system:exec is necessary; it poses security risks',
      });
    }

    if (m.transports) {
      if (m.transports.sse && !m.transports.sse.url.startsWith('https://')) {
        errors.push({
          path: 'transports.sse.url',
          message: 'SSE transport must use HTTPS',
          code: 'invalid_protocol',
        });
      }

      if (m.transports.streamableHttp && !m.transports.streamableHttp.url.startsWith('https://')) {
        errors.push({
          path: 'transports.streamableHttp.url',
          message: 'Streamable HTTP transport must use HTTPS',
          code: 'invalid_protocol',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
