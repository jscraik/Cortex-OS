import { createTDDCoach } from '@cortex-os/tdd-coach';
import { afterAll, beforeAll } from 'vitest';

const coach = createTDDCoach({
	workspaceRoot: process.cwd(),
	config: {
		universalMode: true,
	},
	// Keep watchers lightweight for Vitest sessions
	testConfig: {
		workspaceRoot: process.cwd(),
		coverage: false,
		parallel: false,
	},
});

beforeAll(async () => {
	try {
		await coach.startTestWatching();
	} catch (error) {
		console.warn('[tdd-coach] Unable to start test watcher:', error);
	}
});

afterAll(async () => {
	try {
		await coach.stopTestWatching();
	} catch (error) {
		console.warn('[tdd-coach] Unable to stop test watcher:', error);
	}
});
