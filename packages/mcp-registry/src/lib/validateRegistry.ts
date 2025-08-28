import type Ajv from 'ajv';
import {
  RegistryIndexSchema,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from '../types.js';

export function validateRegistry(
  ajv: Ajv,
  registry: unknown,
  validateServer: (manifest: unknown) => ValidationResult,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const validate = ajv.getSchema('registry');
  if (!validate) {
    throw new Error('Registry schema not found');
  }

  const jsonSchemaValid = validate(registry);
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
    const result = RegistryIndexSchema.safeParse(registry);
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

  if (typeof registry === 'object' && registry !== null) {
    const r = registry as any;

    if (r.servers) {
      const ids = new Set();
      for (let i = 0; i < r.servers.length; i++) {
        const server = r.servers[i];
        if (server && server.id) {
          if (ids.has(server.id)) {
            errors.push({
              path: `servers[${i}].id`,
              message: `Duplicate server ID: ${server.id}`,
              code: 'duplicate_id',
            });
          }
          ids.add(server.id);
        }
      }

      for (let i = 0; i < r.servers.length; i++) {
        const serverResult = validateServer(r.servers[i]);
        for (const error of serverResult.errors) {
          errors.push({ ...error, path: `servers[${i}].${error.path}` });
        }
        for (const warning of serverResult.warnings) {
          warnings.push({ ...warning, path: `servers[${i}].${warning.path}` });
        }
      }

      if (r.metadata?.serverCount !== undefined && r.metadata.serverCount !== r.servers.length) {
        warnings.push({
          path: 'metadata.serverCount',
          message: `Server count mismatch: metadata says ${r.metadata.serverCount}, but found ${r.servers.length}`,
          suggestion: 'Update metadata.serverCount to match actual server count',
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

