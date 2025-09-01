/**
 * @file validators/api-schema-validator.ts
 * @description API schema validation using OpenAPI standards
 */

import type { GateValidator, ValidationResult } from '../lib/validation-types.js';
import type { PRPState } from '../state.js';

export class ApiSchemaValidator implements GateValidator {
  async validate(state: PRPState): Promise<ValidationResult> {
    const hasAPI = state.blueprint.requirements?.some(
      (req) => req.toLowerCase().includes('api') || req.toLowerCase().includes('endpoint'),
    );

    if (!hasAPI) {
      return {
        passed: true,
        details: {
          schemaFormat: 'N/A',
          validation: 'skipped',
        },
      };
    }

    const apiCheckOutput = state.outputs?.['api-check'];
    const hasSchema = apiCheckOutput?.hasSchema === true;

    return {
      passed: hasSchema,
      details: {
        schemaFormat: hasSchema ? 'OpenAPI 3.0' : 'missing',
        validation: hasSchema ? 'passed' : 'failed',
      },
    };
  }
}
