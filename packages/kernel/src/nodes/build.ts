/**
 * @file nodes/build.ts
 * @description Build Phase Node - Compilation, API schema, Security scan, Performance
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { PRPState, Evidence } from '../state.js';
import { generateId } from '../utils/id.js';
import { fixedTimestamp } from '../lib/determinism.js';
import {
  validateBackend,
  validateAPISchema,
  runSecurityScan,
  validateFrontend,
  validateDocumentation,
} from '../lib/gates/build.js';

/**
 * Build Phase Gates:
 * - ✅ Backend passes compilation + tests
 * - ✅ API schema validated (OpenAPI/JSON Schema)
 * - ✅ Security scanner (CodeQL, Semgrep) ≤ agreed majors
 * - ✅ Frontend Lighthouse/Axe ≥ 90%
 * - ✅ Docs complete with API + usage notes
 */
export class BuildNode {
  async execute(state: PRPState): Promise<PRPState> {
    const evidence: Evidence[] = [];
    const blockers: string[] = [];
    const majors: string[] = [];

    const deterministic = !!state.metadata.deterministic;

    // Gate 1: Backend compilation and tests
    const backendValidation = await validateBackend(state);
    if (!backendValidation.passed) {
      blockers.push('Backend compilation or tests failed');
    }
    evidence.push({
      id: generateId('build-backend', deterministic),
      type: 'test',
      source: 'backend_validation',
      content: JSON.stringify(backendValidation),
      timestamp: deterministic ? fixedTimestamp('build-backend') : new Date().toISOString(),
      phase: 'build',
    });

    // Gate 2: API schema validation
    const apiValidation = await validateAPISchema(state);
    if (!apiValidation.passed) {
      blockers.push('API schema validation failed');
    }

    // Gate 3: Security scanning
    const securityScan = await runSecurityScan(state);
    if (securityScan.blockers > 0) {
      blockers.push(`Security scan found ${securityScan.blockers} critical issues`);
    }
    if (securityScan.majors > 3) {
      majors.push(`Security scan found ${securityScan.majors} major issues (limit: 3)`);
    }
    evidence.push({
      id: generateId('build-security', deterministic),
      type: 'analysis',
      source: 'security_scanner',
      content: JSON.stringify(securityScan),
      timestamp: deterministic ? fixedTimestamp('build-security') : new Date().toISOString(),
      phase: 'build',
    });

    // Gate 4: Frontend performance
    const frontendValidation = await validateFrontend(state);
    if (frontendValidation.lighthouse < 90) {
      majors.push(`Lighthouse score ${frontendValidation.lighthouse} below 90%`);
    }
    if (frontendValidation.axe < 90) {
      majors.push(`Axe accessibility score ${frontendValidation.axe} below 90%`);
    }

    // Gate 5: Documentation completeness
    const docsValidation = await validateDocumentation(state);
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
          timestamp: deterministic ? fixedTimestamp('build-validation') : new Date().toISOString(),
        },
      },
    };
  }
}
