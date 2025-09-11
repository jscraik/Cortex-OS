import { beforeEach, describe, expect, it } from 'vitest';
import type { ChangeSet, TDDCoach } from '../src/index.js';
import { createTDDCoach } from '../src/index.js';

describe('TDD Coach Integration', () => {
	let coach: TDDCoach;
	const workspaceRoot = process.cwd();

	beforeEach(() => {
		coach = createTDDCoach({
			workspaceRoot,
			config: {
				universalMode: false, // Disable test watching for testing
				defaultInterventionLevel: 'coaching' as const,
				adaptiveLearning: true,
			},
			testConfig: {
				// Use mock test execution for testing
				mockMode: true,
			},
		});
	});

	it('should detect TDD state when initialized', async () => {
		const status = await coach.getStatus();
		expect(status.state).toBeDefined();
		expect(['RED', 'GREEN', 'REFACTOR', 'UNCLEAR']).toContain(status.state);
	});

	it('should validate test file changes in RED phase', async () => {
		const testFileChange: ChangeSet = {
			files: [
				{
					path: 'src/example.test.ts',
					status: 'modified',
					diff: '+  it("should validate TDD", () => { expect(false).toBe(true); });',
					linesAdded: 1,
					linesDeleted: 0,
				},
			],
			totalChanges: 1,
			timestamp: new Date().toISOString(),
			author: 'test-user',
		};

		const response = await coach.validateChange({
			proposedChanges: testFileChange,
		});

		expect(response).toBeDefined();
		expect(response.allowed).toBeDefined();
		expect(response.state).toBeDefined();
		expect(response.coaching).toBeDefined();
		expect(response.coaching.level).toBeDefined();
		expect(response.coaching.message).toBeDefined();
		expect(response.metadata).toBeDefined();
		expect(response.metadata.sessionId).toBeDefined();
	});

	it('should provide coaching for implementation changes', async () => {
		const implementationChange: ChangeSet = {
			files: [
				{
					path: 'src/implementation.ts',
					status: 'modified',
					diff: '+  function newFeature() { return "implemented"; }',
					linesAdded: 1,
					linesDeleted: 0,
				},
			],
			totalChanges: 1,
			timestamp: new Date().toISOString(),
			author: 'test-user',
		};

		const response = await coach.validateChange({
			proposedChanges: implementationChange,
		});

		expect(response.coaching.suggestedActions).toBeDefined();
		expect(Array.isArray(response.coaching.suggestedActions)).toBe(true);
		expect(response.coaching.suggestedActions.length).toBeGreaterThan(0);
	});

	it('should provide test reporter information', () => {
		const reporters = coach.getTestReporterInfo();
		expect(Array.isArray(reporters)).toBe(true);
		expect(reporters.length).toBeGreaterThan(0);

		// Should include major test frameworks
		const reporterNames = reporters.map((r) => r.name);
		expect(reporterNames).toContain('vitest');
		expect(reporterNames).toContain('pytest');
		expect(reporterNames).toContain('rust-test');
	});

	it('should handle empty changes gracefully', async () => {
		const emptyChangeSet: ChangeSet = {
			files: [],
			totalChanges: 0,
			timestamp: new Date().toISOString(),
			author: 'test-user',
		};

		const response = await coach.validateChange({
			proposedChanges: emptyChangeSet,
		});

		// Should not throw, but handle gracefully
		expect(response).toBeDefined();
		expect(response.allowed).toBeDefined();
	});

	it('should track TDD state progression', async () => {
		// Initial state should be UNCLEAR
		const initialStatus = await coach.getStatus();
		expect(initialStatus.state).toBe('UNCLEAR');

		// Coaching should provide guidance
		expect(initialStatus.coaching).toContain('Start with a failing test');
	});
});
