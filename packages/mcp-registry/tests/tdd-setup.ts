import { createTDDCoach, InterventionLevel, TDDState } from '@cortex-os/tdd-coach';
import { createCliHarness } from './tdd-coach/cli-harness';

const coach = createTDDCoach({
	workspaceRoot: process.cwd(),
	config: {
		universalMode: false,
		adaptiveLearning: false,
		metricsCollection: false,
		emergencyBypassEnabled: false,
		defaultInterventionLevel: InterventionLevel.COACHING,
	},
});

const harness = createCliHarness(coach);

async function logPreflightStatus(): Promise<void> {
	try {
		const statusOutput = await harness.status({ workspace: process.cwd() });
		console.log('[brAInwav] Pre-test TDD status check');
		console.log(statusOutput);
	} catch (error) {
		console.warn('[brAInwav] TDD preflight warning', error instanceof Error ? error.message : error);
	}
}

// Kick off preflight without blocking Vitest setup pipeline
void logPreflightStatus();

// Provide a helper for tests that need a deterministic TDD state snapshot
export const tddCoachTestState = {
	state: TDDState.GREEN,
	interventionLevel: InterventionLevel.COACHING,
};
