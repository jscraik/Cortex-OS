/**
 * @file nodes/build.ts
 * @description Build Phase Node - Compilation, API schema, Security scan, Performance
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { generateEvidenceId, getCurrentTimestamp } from '../lib/utils.js';
import type { Evidence, PRPState } from '../state.js';
import { ApiSchemaValidator } from '../validators/api-schema-validator.js';
import { BackendValidator } from '../validators/backend-validator.js';
import { DocumentationValidator } from '../validators/documentation-validator.js';
import { FrontendValidator } from '../validators/frontend-validator.js';
import { SecurityScanner } from '../validators/security-scanner.js';

/**
 * Build Phase Gates:
 * - ✅ Backend passes compilation + tests
 * - ✅ API schema validated (OpenAPI/JSON Schema)
 * - ✅ Security scanner (CodeQL, Semgrep) ≤ agreed majors
 * - ✅ Frontend Lighthouse/Axe ≥ 90%
 * - ✅ Docs complete with API + usage notes
 */
export class BuildNode {
  private backendValidator = new BackendValidator();
  private apiSchemaValidator = new ApiSchemaValidator();
  private securityScanner = new SecurityScanner();
  private frontendValidator = new FrontendValidator();
  private documentationValidator = new DocumentationValidator();

  async execute(state: PRPState): Promise<PRPState> {
    const evidence: Evidence[] = [];
    const blockers: string[] = [];
    const majors: string[] = [];

    const backendValidation = await this.backendValidator.validate(state);
    if (!backendValidation.passed) {
      blockers.push('Backend compilation or tests failed');
    }
    evidence.push(this.createEvidence('backend', 'test', 'backend_validation', backendValidation));

    const apiValidation = await this.apiSchemaValidator.validate(state);
    if (!apiValidation.passed) {
      blockers.push('API schema validation failed');
    }
    evidence.push(this.createEvidence('api', 'analysis', 'api_schema_validation', apiValidation));

    const securityScan = await this.securityScanner.runSecurityScan(state);
    if (securityScan.blockers > 0) {
      blockers.push(`Security scan found ${securityScan.blockers} critical issues`);
    }
    if (securityScan.majors > 3) {
      majors.push(`Security scan found ${securityScan.majors} major issues (limit: 3)`);
    }
    evidence.push(this.createEvidence('security', 'analysis', 'security_scanner', securityScan));

    const frontendValidation = await this.frontendValidator.validate(state);
    if (!frontendValidation.passed) {
      const lighthouse = (frontendValidation.details.lighthouse as number) || 0;
      const axe = (frontendValidation.details.axe as number) || 0;
      if (lighthouse < 90) {
        majors.push(`Lighthouse score ${lighthouse} below 90%`);
      }
      if (axe < 90) {
        majors.push(`Axe accessibility score ${axe} below 90%`);
      }
    }
    evidence.push(
      this.createEvidence('frontend', 'analysis', 'frontend_validation', frontendValidation),
    );

    const docsValidation = await this.documentationValidator.validate(state);
    if (!docsValidation.passed) {
      majors.push('Documentation incomplete - missing API docs or usage notes');
    }

    return {
      ...state,
      evidence: [...state.evidence, ...evidence],
      validationResults: {
        ...state.validationResults,
        build: {
          passed: blockers.length === 0 && majors.length <= 3,
          blockers,
          majors,
          evidence: evidence.map((e) => e.id),
          timestamp: getCurrentTimestamp(),
        },
      },
    };
  }

  private createEvidence(
    prefix: string,
    type: Evidence['type'],
    source: string,
    content: any,
  ): Evidence {
    return {
      id: generateEvidenceId(`build-${prefix}`),
      type,
      source,
      content: JSON.stringify(content),
      timestamp: getCurrentTimestamp(),
      phase: 'build',
    };
  }
}

// NOTE: Lower-level heuristic implementations were removed in favor of dedicated
// validator classes under `validators/`. This file delegates to those validators
// for backend, api, security, frontend, and documentation checks to keep logic
// testable and deterministic in CI.
