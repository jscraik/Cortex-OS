/**
 * @file Schema validator for MCP Registry
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  ServerManifestSchema,
  RegistryIndexSchema,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './types.js';
import registrySchema from '../schemas/registry.schema.json' assert { type: 'json' };
import serverManifestSchema from '../schemas/server-manifest.schema.json' assert { type: 'json' };

export class McpValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });

    addFormats(this.ajv);

    // Add custom formats
    this.ajv.addFormat('uri', {
      type: 'string',
      validate: (uri: string) => {
        try {
          new URL(uri);
          return true;
        } catch {
          return false;
        }
      },
    });

    // Add schemas
    this.ajv.addSchema(registrySchema, 'registry');
    this.ajv.addSchema(serverManifestSchema, 'server-manifest');
  }

  /**
   * Validate a server manifest using both JSON Schema and Zod
   */
  validateServerManifest(manifest: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // JSON Schema validation
    const validate = this.ajv.getSchema('server-manifest');
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

    // Zod validation for additional business logic
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

    // Additional business logic validation
    if (typeof manifest === 'object' && manifest !== null) {
      const m = manifest as any;

      // Check for common issues and provide warnings
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

      // Transport-specific validation
      if (m.transports) {
        if (m.transports.sse && !m.transports.sse.url.startsWith('https://')) {
          errors.push({
            path: 'transports.sse.url',
            message: 'SSE transport must use HTTPS',
            code: 'invalid_protocol',
          });
        }

        if (
          m.transports.streamableHttp &&
          !m.transports.streamableHttp.url.startsWith('https://')
        ) {
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

  /**
   * Validate a registry index
   */
  validateRegistry(registry: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // JSON Schema validation
    const validate = this.ajv.getSchema('registry');
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

    // Zod validation
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

    // Additional registry validation
    if (typeof registry === 'object' && registry !== null) {
      const r = registry as any;

      if (r.servers) {
        // Check for duplicate IDs
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

        // Validate each server manifest
        for (let i = 0; i < r.servers.length; i++) {
          const serverResult = this.validateServerManifest(r.servers[i]);
          for (const error of serverResult.errors) {
            errors.push({
              ...error,
              path: `servers[${i}].${error.path}`,
            });
          }
          for (const warning of serverResult.warnings) {
            warnings.push({
              ...warning,
              path: `servers[${i}].${warning.path}`,
            });
          }
        }

        // Verify server count matches metadata
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

  /**
   * Validate manifest against security best practices
   */
  validateSecurity(manifest: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (typeof manifest !== 'object' || manifest === null) {
      return {
        valid: false,
        errors: [{ path: 'root', message: 'Manifest must be an object', code: 'invalid_type' }],
        warnings: [],
      };
    }

    const m = manifest as any;

    // Security-critical validations
    if (m.scopes && Array.isArray(m.scopes)) {
      const dangerousScopes = ['system:exec', 'network:admin', 'files:write-system'];
      for (const scope of m.scopes) {
        if (dangerousScopes.includes(scope)) {
          warnings.push({
            path: 'scopes',
            message: `Dangerous scope detected: ${scope}`,
            suggestion: 'Ensure this scope is absolutely necessary and well-documented',
          });
        }
      }
    }

    // Require HTTPS for all remote transports
    if (m.transports) {
      ['sse', 'streamableHttp'].forEach((transport) => {
        if (m.transports[transport]?.url && !m.transports[transport].url.startsWith('https://')) {
          errors.push({
            path: `transports.${transport}.url`,
            message: `${transport} transport must use HTTPS in production`,
            code: 'insecure_transport',
          });
        }
      });
    }

    // License validation
    const openSourceLicenses = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC'];
    if (m.license && !openSourceLicenses.includes(m.license)) {
      warnings.push({
        path: 'license',
        message: 'Non-standard or proprietary license detected',
        suggestion: 'Consider using a standard open-source license for better adoption',
      });
    }

    // Security metadata validation
    if (!m.security?.sigstoreBundle) {
      warnings.push({
        path: 'security.sigstoreBundle',
        message: 'No Sigstore bundle provided',
        suggestion: 'Add cryptographic attestation for supply chain security',
      });
    }

    if (!m.security?.sbom) {
      warnings.push({
        path: 'security.sbom',
        message: 'No SBOM (Software Bill of Materials) provided',
        suggestion: 'Include SBOM for dependency transparency',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Default validator instance
export const validator = new McpValidator();

/**
 * Convenience functions
 */
export const validateServerManifest = (manifest: unknown) =>
  validator.validateServerManifest(manifest);
export const validateRegistry = (registry: unknown) => validator.validateRegistry(registry);
export const validateSecurity = (manifest: unknown) => validator.validateSecurity(manifest);
