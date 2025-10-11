import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = path.resolve(__dirname, './tests');
const outputDir = path.resolve(__dirname, './test-output');
const baseURL =
	process.env.E2E_DASHBOARD_BASE_URL ?? 'http://127.0.0.1:3026/apps/chatgpt-dashboard';

export default defineConfig({
	testDir,
	outputDir,
	timeout: 45_000,
	expect: { timeout: 5000 },
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	use: {
		baseURL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'off',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	globalSetup: path.resolve(__dirname, './global-setup.ts'),
	globalTeardown: path.resolve(__dirname, './global-teardown.ts'),
	reporter: [['list'], ['html', { outputFolder: path.resolve(outputDir, '../playwright-report') }]],
});
