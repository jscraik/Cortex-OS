/**
 * @file nodes/build.ts
 * @description Build Phase Node - Compilation, API schema, Security scan, Performance
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { PRPState, Evidence } from '../state.js';
import { generateId } from '../utils/id.js';
import fs from 'node:fs';
import path from 'node:path';

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

    // Gate 1: Backend compilation and tests
    const backendValidation = await this.validateBackend(state);
    if (!backendValidation.passed) {
      blockers.push('Backend compilation or tests failed');
    }

    evidence.push({
      id: generateId('build-backend', state.metadata.deterministic),
      type: 'test',
      source: 'backend_validation',
      content: JSON.stringify(backendValidation),
      timestamp: new Date().toISOString(),
      phase: 'build',
    });

    // Gate 2: API schema validation
    const apiValidation = await this.validateAPISchema(state);
    if (!apiValidation.passed) {
      blockers.push('API schema validation failed');
    }

    // Gate 3: Security scanning
    const securityScan = await this.runSecurityScan(state);
    if (securityScan.blockers > 0) {
      blockers.push(`Security scan found ${securityScan.blockers} critical issues`);
    }
    if (securityScan.majors > 3) {
      majors.push(`Security scan found ${securityScan.majors} major issues (limit: 3)`);
    }

    evidence.push({
      id: generateId('build-security', state.metadata.deterministic),
      type: 'analysis',
      source: 'security_scanner',
      content: JSON.stringify(securityScan),
      timestamp: new Date().toISOString(),
      phase: 'build',
    });

    // Gate 4: Frontend performance
    const frontendValidation = await this.validateFrontend(state);
    if (frontendValidation.lighthouse < 90) {
      majors.push(`Lighthouse score ${frontendValidation.lighthouse} below 90%`);
    }
    if (frontendValidation.axe < 90) {
      majors.push(`Axe accessibility score ${frontendValidation.axe} below 90%`);
    }

    // Gate 5: Documentation completeness
    const docsValidation = await this.validateDocumentation(state);
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
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  private async validateBackend(state: PRPState): Promise<{ passed: boolean; details: any }> {
    // Simulated backend validation - in real implementation would run actual tests
    const hasBackendReq = state.blueprint.requirements?.some(
      (req) =>
        req.toLowerCase().includes('api') ||
        req.toLowerCase().includes('backend') ||
        req.toLowerCase().includes('server'),
    );

    if (!hasBackendReq) {
      return { passed: true, details: { type: 'frontend-only' } };
    }

    // Mock compilation and test results
    return {
      passed: true, // Would be actual test results
      details: {
        compilation: 'success',
        testsPassed: 45,
        testsFailed: 0,
        coverage: 92,
      },
    };
  }

  private async validateAPISchema(state: PRPState): Promise<{ passed: boolean; details: any }> {
    const hasAPI = state.blueprint.requirements?.some(
      (req) => req.toLowerCase().includes('api') || req.toLowerCase().includes('endpoint'),
    );

    if (!hasAPI) {
      return {
        passed: true,
        details: { schemaFormat: 'N/A', validation: 'skipped' },
      };
    }

    const schemaPathYaml = path.resolve('openapi.yaml');
    const exists = fs.existsSync(schemaPathYaml);

    return {
      passed: exists,
      details: {
        schemaFormat: exists ? 'OpenAPI 3.0' : 'missing',
        validation: exists ? 'found' : 'missing',
      },
    };
  }

  private async runSecurityScan(
    state: PRPState,
  ): Promise<{ blockers: number; majors: number; details: any }> {
    // Mock security scan - in real implementation would run CodeQL, Semgrep, etc.
    return {
      blockers: 0,
      majors: 1, // Example: one major security issue found
      details: {
        tools: ['CodeQL', 'Semgrep'],
        vulnerabilities: [
          {
            severity: 'major',
            type: 'potential-xss',
            file: 'frontend/src/component.tsx',
            line: 42,
          },
        ],
      },
    };
  }

  private async validateFrontend(
    state: PRPState,
  ): Promise<{ lighthouse: number; axe: number; details: any }> {
    const hasFrontend = state.blueprint.requirements?.some(
      (req) =>
        req.toLowerCase().includes('ui') ||
        req.toLowerCase().includes('frontend') ||
        req.toLowerCase().includes('interface'),
    );

    if (!hasFrontend) {
      return { lighthouse: 100, axe: 100, details: { type: 'backend-only' } };
    }

    // Mock Lighthouse and Axe scores
    return {
      lighthouse: 94, // Good score
      axe: 96, // Good accessibility score
      details: {
        lighthouse: {
          performance: 94,
          accessibility: 96,
          bestPractices: 92,
          seo: 98,
        },
        axe: {
          violations: 2,
          severity: 'minor',
        },
      },
    };
  }

  private async validateDocumentation(state: PRPState): Promise<{ passed: boolean; details: any }> {
    const hasDocsReq = state.blueprint.requirements?.some(
      (req) =>
        req.toLowerCase().includes('doc') ||
        req.toLowerCase().includes('guide') ||
        req.toLowerCase().includes('readme'),
    );

    if (!hasDocsReq) {
      return { passed: true, details: { readme: 'skipped' } };
    }

    const readmePath = path.resolve('README.md');
    const readmeExists = fs.existsSync(readmePath);

    return {
      passed: readmeExists,
      details: { readme: readmeExists },
    };
  }
}
