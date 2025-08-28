/**
 * @file Schema validator for MCP Registry
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import registrySchema from '../schemas/registry.schema.json' assert { type: 'json' };
import serverManifestSchema from '../schemas/server-manifest.schema.json' assert { type: 'json' };
import { validateServerManifest as validateServerManifestLib } from './lib/validateServerManifest.js';
import { validateRegistry as validateRegistryLib } from './lib/validateRegistry.js';
import { validateSecurity as validateSecurityLib } from './lib/validateSecurity.js';

export class McpValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });

    addFormats(this.ajv);

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

    this.ajv.addSchema(registrySchema, 'registry');
    this.ajv.addSchema(serverManifestSchema, 'server-manifest');
  }

  validateServerManifest(manifest: unknown) {
    return validateServerManifestLib(this.ajv, manifest);
  }

  validateRegistry(registry: unknown) {
    return validateRegistryLib(this.ajv, registry, (m) => validateServerManifestLib(this.ajv, m));
  }

  validateSecurity(manifest: unknown) {
    return validateSecurityLib(manifest);
  }
}

export const validator = new McpValidator();

export const validateServerManifest = (manifest: unknown) =>
  validator.validateServerManifest(manifest);
export const validateRegistry = (registry: unknown) => validator.validateRegistry(registry);
export const validateSecurity = (manifest: unknown) => validator.validateSecurity(manifest);
