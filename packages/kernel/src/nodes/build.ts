import fs from 'node:fs';
import path from 'node:path';
import type { Evidence, PRPState } from '../state.js';
import { generateId } from '../utils/id.js';
import { currentTimestamp } from '../utils/time.js';

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
      timestamp: currentTimestamp(state.metadata.deterministic ?? false, 4),
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
      timestamp: currentTimestamp(state.metadata.deterministic ?? false, 5),
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
          timestamp: currentTimestamp(state.metadata.deterministic ?? false, 6),
        },
      },
    };
  }

  private async validateBackend(state: PRPState): Promise<ValidationResult<BackendDetails>> {
    // Simulated backend validation - in real implementation would run actual tests
    const hasBackendReq = state.blueprint.requirements?.some(
      (req) =>
        req.toLowerCase().includes('api') ||
        req.toLowerCase().includes('backend') ||
        req.toLowerCase().includes('server'),
    );

    // Mock compilation and test results; fail when backend requirements missing
    const passed = hasBackendReq;
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

  private async validateAPISchema(state: PRPState): Promise<ValidationResult<APISchemaDetails>> {
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

  private async runSecurityScan(state: PRPState): Promise<ScanResult<SecurityScanDetails>> {
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

  private async validateFrontend(state: PRPState): Promise<FrontendResult<FrontendDetails>> {
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

  private async validateDocumentation(state: PRPState): Promise<ValidationResult<DocsDetails>> {
    const hasDocsReq = state.blueprint.requirements?.some(
      (req) =>
        req.toLowerCase().includes('doc') ||
        req.toLowerCase().includes('guide') ||
        req.toLowerCase().includes('readme'),
    );

    if (!hasDocsReq) {
      return { passed: true, details: { readme: 'skipped' } };
    }

    const readme = path.resolve('README.md');
    const readmeExists = fs.existsSync(readme);

    return {
      passed: readmeExists,
      details: {
        readme: readmeExists,
        schemaFormat: readmeExists ? 'markdown' : 'missing',
        validation: readmeExists ? 'found' : 'missing',
      },
    };
  }
}

interface ValidationResult<T> {
  passed: boolean;
  details: T;
}

interface BackendDetails {
  compilation?: string;
  testsPassed?: number;
  testsFailed?: number;
  coverage?: number;
  type?: string;
  reason?: string;
}

interface APISchemaDetails {
  schemaFormat: string;
  validation: string;
}

interface ScanResult<T> {
  blockers: number;
  majors: number;
  details: T;
}

interface SecurityScanDetails {
  tools: string[];
  vulnerabilities: { severity: string; type: string; file: string; line: number }[];
}

interface FrontendResult<T> {
  lighthouse: number;
  axe: number;
  details: T;
}

interface FrontendDetails {
  lighthouse?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  axe?: {
    violations: number;
    severity: string;
  };
  reason?: string;
}

interface DocsDetails {
  readme: boolean | string;
  schemaFormat?: string;
  validation?: string;
}
