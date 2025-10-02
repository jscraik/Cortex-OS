import { describe, expect, it, vi } from 'vitest';
import { createCliHarness } from './cli-harness';

type MockedCoach = {
	getStatus: ReturnType<typeof vi.fn>;
	validateChange: ReturnType<typeof vi.fn>;
};

const TDD_STATE_GREEN = 'GREEN';
const INTERVENTION_LEVEL_COACHING = 'coaching';

interface MockValidationResponse {
	allowed: boolean;
	state: {
		current: string;
		failingTests: unknown[];
		passingTests: unknown[];
		lastValidatedChange: unknown;
		testCoverage: number;
		timestamp: string;
		sessionId: string;
	};
	coaching: {
		level: string;
		message: string;
		suggestedActions: string[];
		learningResources: string[];
	};
	metadata: {
		sessionId: string;
		timestamp: string;
	};
}

const createMockCoach = (): MockedCoach => {
	const status = {
		state: TDD_STATE_GREEN,
		testsStatus: { passing: 12, failing: 0, total: 12 },
		lastUpdate: new Date().toISOString(),
		coaching: 'All systems green - continue refactoring',
	};

	const statusFn = vi.fn().mockResolvedValue(status);

	const validationResponse: MockValidationResponse = {
		allowed: true,
		state: {
			current: TDD_STATE_GREEN,
			failingTests: [],
			passingTests: [],
			lastValidatedChange: null,
			testCoverage: 97.5,
			timestamp: new Date().toISOString(),
			sessionId: 'mock-session',
		},
		coaching: {
			level: INTERVENTION_LEVEL_COACHING,
			message: 'Great job starting with tests. Consider tightening assertions.',
			suggestedActions: ['Review mutation score targets'],
			learningResources: [],
		},
		metadata: {
			sessionId: 'mock-session',
			timestamp: new Date().toISOString(),
		},
	};

	const validateFn = vi.fn().mockResolvedValue(validationResponse);

	return {
		getStatus: statusFn,
		validateChange: validateFn,
	};
};

describe('TDD Coach Integration', () => {
	it('exposes CLI status summary without invoking pnpm exec', async () => {
		const coach = createMockCoach();
		const harness = createCliHarness(coach);

		const output = await harness.status({ workspace: process.cwd() });

		expect(coach.getStatus).toHaveBeenCalledTimes(1);
		expect(output).toContain('[brAInwav] TDD State: GREEN');
		expect(output).toContain('[brAInwav] TDD Coach Status');
	});

	it('validates staged files via harnessed CLI invocation', async () => {
		const coach = createMockCoach();
		const harness = createCliHarness(coach);

		const workspace = process.cwd();
		const files = ['tests/tdd-coach/integration.test.ts'];
		const output = await harness.validate({ workspace, files, qualityGates: true });

		expect(coach.validateChange).toHaveBeenCalledTimes(1);
		const payload = coach.validateChange.mock.calls[0]?.[0];
		expect(payload?.proposedChanges.totalChanges).toBe(files.length);
		expect(payload?.proposedChanges.files[0]?.path).toBe(files[0]);
		expect(output).toContain('[brAInwav] TDD Coach Validation Summary');
		expect(output).toContain('[brAInwav] Quality gates: enforced');
	});
});
