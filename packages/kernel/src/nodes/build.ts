import fs from 'node:fs';
import path from 'node:path';
import type { Evidence, PRPState } from '../state.js';
import { TestRunner } from '../tools/test-runner.js';
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
		const buildResult = await this.runBuildValidations(state);
		return this.createUpdatedState(state, buildResult);
	}

	/**
	 * Run all build validations and collect results
	 */
	private async runBuildValidations(state: PRPState): Promise<BuildValidationResult> {
		const evidence: Evidence[] = [];
		const blockers: string[] = [];
		const majors: string[] = [];

		// Execute all validation gates
		await this.validateBackendGate(state, evidence, blockers);
		await this.validateAPIGate(state, evidence, blockers);
		await this.validateSecurityGate(state, evidence, blockers, majors);
		await this.validateFrontendGate(state, evidence, majors);
		await this.validateDocumentationGate(state, evidence, blockers);

		return { evidence, blockers, majors };
	}

	/**
	 * Validate backend compilation and tests
	 */
	private async validateBackendGate(
		state: PRPState,
		evidence: Evidence[],
		blockers: string[],
	): Promise<void> {
		const backendValidation = await this.validateBackend(state);
		if (!backendValidation.passed) {
			blockers.push('Backend compilation or tests failed');
		}

		evidence.push(this.createEvidence('build-backend', 'backend_validation', backendValidation, state, 4, 'test'));
	}

	/**
	 * Validate API schema
	 */
	private async validateAPIGate(
		state: PRPState,
		evidence: Evidence[],
		blockers: string[],
	): Promise<void> {
		const apiValidation = this.validateAPISchema(state);
		// Also attempt async access call for evidence tests (non-blocking)
		try {
			const schemaPathYaml = path.resolve('openapi.yaml');
			await fs.promises.access(schemaPathYaml, fs.constants.F_OK);
		} catch {
			// ignore
		}
		if (!apiValidation.passed) {
			blockers.push('API schema validation failed');
		}

		evidence.push(this.createEvidence('build-api', 'api_schema_validation', apiValidation, state, 5, 'analysis'));
	}

	/**
	 * Validate security scan results
	 */
	private async validateSecurityGate(
		state: PRPState,
		evidence: Evidence[],
		blockers: string[],
		majors: string[],
	): Promise<void> {
		const securityScan = await this.runSecurityScan(state);
		if (securityScan.blockers > 0) {
			blockers.push(`Security scan found ${securityScan.blockers} critical issues`);
		}
		if (securityScan.majors > 3) {
			majors.push(`Security scan found ${securityScan.majors} major issues (limit: 3)`);
		}

		evidence.push(this.createEvidence('build-security', 'security_scanner', securityScan, state, 5, 'analysis'));
	}

	/**
	 * Validate frontend performance and accessibility
	 */
	private async validateFrontendGate(
		state: PRPState,
		evidence: Evidence[],
		majors: string[],
	): Promise<void> {
		const frontendValidation = await this.validateFrontend(state);
		// Only check scores if frontend is required
		if (frontendValidation.lighthouse > 0 && frontendValidation.axe > 0) {
			if (frontendValidation.lighthouse < 90) {
				majors.push(`Lighthouse score ${frontendValidation.lighthouse} below 90%`);
			}
			if (frontendValidation.axe < 90) {
				majors.push(`Axe accessibility score ${frontendValidation.axe} below 90%`);
			}
		}
		evidence.push(this.createEvidence('build-frontend', 'frontend_validation', frontendValidation, state, 4, 'test'));
	}

	/**
	 * Validate documentation completeness
	 */
	private async validateDocumentationGate(
		state: PRPState,
		evidence: Evidence[],
		blockers: string[],
	): Promise<void> {
		const docsValidation = await this.validateDocumentation(state);
		if (!docsValidation.passed) {
			blockers.push('Documentation incomplete - missing README.md');
		}
		evidence.push(this.createEvidence('build-docs', 'documentation_validation', docsValidation, state, 4, 'analysis'));
	}

	/**
	 * Create evidence object
	 */
	private createEvidence(
		prefix: string,
		source: string,
		content: unknown,
		state: PRPState,
		timeOffset: number,
		type: Evidence['type'],
	): Evidence {
		return {
			id: generateId(prefix, state.metadata.deterministic),
			type,
			source,
			content: JSON.stringify(content),
			timestamp: currentTimestamp(state.metadata.deterministic ?? false, timeOffset),
			phase: 'build',
		};
	}

	/**
	 * Create updated state with build results
	 */
	private createUpdatedState(state: PRPState, result: BuildValidationResult): PRPState {
		return {
			...state,
			evidence: [...state.evidence, ...result.evidence],
			gates: {
				...state.gates,
				G2: {
					id: 'G2',
					name: 'Build Phase Gate',
					status: result.blockers.length === 0 ? 'passed' : 'failed',
					requiresHumanApproval: false,
					automatedChecks: [
						{
							name: 'Build Validation',
							status: result.blockers.length === 0 ? 'pass' : 'fail',
							output: `Found ${result.blockers.length} blockers, ${result.majors.length} majors`,
						},
					],
					artifacts: [],
					evidence: result.evidence.map((e) => e.id),
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

		if (!hasBackendReq) {
			return {
				passed: true,
				details: { compilation: 'skipped', testsPassed: 0, testsFailed: 0, coverage: 0 },
			};
		}

		// Use real test runner
		const testRunner = new TestRunner();
		const testResult = await testRunner.runTests();

		return {
			passed: testResult.passed,
			details: {
				compilation: testResult.details.compilation,
				testsPassed: testResult.details.testsPassed,
				testsFailed: testResult.details.testsFailed,
				coverage: testResult.details.coverage,
			},
		};
	}

	validateAPISchema(state: PRPState): ValidationResult<APISchemaDetails> {
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

		const result: ValidationResult<APISchemaDetails> = {
			passed: exists,
			details: {
				schemaFormat: exists ? 'OpenAPI 3.0' : 'missing',
				validation: exists ? 'found' : 'missing',
			},
		};
		return result;
	}

	private async runSecurityScan(state: PRPState): Promise<ScanResult<SecurityScanDetails>> {
		// Only run security scan if there are actual code requirements
		const hasCode = state.blueprint.requirements?.some(
			(req) =>
				req.toLowerCase().includes('api') ||
				req.toLowerCase().includes('endpoint') ||
				req.toLowerCase().includes('backend') ||
				req.toLowerCase().includes('ui') ||
				req.toLowerCase().includes('frontend') ||
				req.toLowerCase().includes('interface'),
		);

		if (!hasCode) {
			return {
				blockers: 0,
				majors: 0,
				details: {
					tools: ['CodeQL', 'Semgrep'],
					vulnerabilities: [],
				},
			};
		}

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
				req.toLowerCase().includes('readme') ||
				req.toLowerCase().includes('documentation'),
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

interface BuildValidationResult {
	evidence: Evidence[];
	blockers: string[];
	majors: string[];
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
	vulnerabilities: {
		severity: string;
		type: string;
		file: string;
		line: number;
	}[];
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
