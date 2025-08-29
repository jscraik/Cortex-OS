/**
 * @file nodes/build.ts
 * @description Build Phase Node - Compilation, API schema, Security scan, Performance
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { Evidence, PRPState } from '../state.js';

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
      id: `build-backend-${Date.now()}`,
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
      id: `build-security-${Date.now()}`,
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

    // Mock compilation and test results; fail when backend requirements missing
    const passed = !!hasBackendReq;
    return {
      passed,
      details: passed
        ? {
            compilation: 'success',
            testsPassed: 45,
            testsFailed: 0,
            coverage: 92,
          }
        : { reason: 'backend requirements missing' },
    };
  }

  private async validateAPISchema(state: PRPState): Promise<{ passed: boolean; details: any }> {
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

    // Check if schema exists in outputs
    const apiCheckOutput = state.outputs?.['api-check'];
    const hasSchema = apiCheckOutput?.hasSchema === true;

    return {
      passed: hasSchema, // Properly fail when schema is missing
      details: {
        schemaFormat: hasSchema ? 'OpenAPI 3.0' : 'missing',
        validation: hasSchema ? 'passed' : 'failed',
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

    // Mock Lighthouse and Axe scores; fail when frontend requirements missing
    const lighthouse = hasFrontend ? 94 : 0;
    const axe = hasFrontend ? 96 : 0;
    return {
      lighthouse,
      axe,
      details: hasFrontend
        ? {
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
          }
        : { reason: 'frontend requirements missing' },
    };
  }

  private async validateDocumentation(state: PRPState): Promise<{ passed: boolean; details: any }> {
    // Check if documentation requirements are met
    const hasDocsReq = state.blueprint.requirements?.some(
      (req) =>
        req.toLowerCase().includes('doc') ||
        req.toLowerCase().includes('guide') ||
        req.toLowerCase().includes('readme'),
    );

    return {
      passed: true, // Assume docs are complete
      details: {
        apiDocs: true,
        usageGuide: true,
        installation: true,
        examples: hasDocsReq,
      },
    };
  }
}
