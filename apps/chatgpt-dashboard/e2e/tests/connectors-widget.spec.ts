import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const logDir = path.resolve(
	repoRoot,
	'tasks/connectors-manifest-runtime/test-logs/apps-preview',
);

async function ensureLogDir() {
	await fs.mkdir(logDir, { recursive: true });
}

test.describe('ChatGPT Apps dashboard preview', () => {
	test.beforeAll(async () => {
		await ensureLogDir();
	});

	test('loads manifest, hydrates lazy sections, and refreshes data', async ({ page, request }) => {
		page.on('console', (message) => {
			if (message.type() === 'error') {
				test.info().annotations.push({
					type: 'console-error',
					description: message.text(),
				});
			}
		});

		const dashboardUrl =
			process.env.E2E_DASHBOARD_BASE_URL ?? 'http://127.0.0.1:3026/apps/chatgpt-dashboard/';

		await page.goto(dashboardUrl, { waitUntil: 'networkidle' });
		await expect(page.getByRole('heading', { name: 'System Overview' })).toBeVisible();

		// Wait for initial service map fetch to populate the UI.
		await expect(page.getByText('Cortex-OS Dashboard')).toBeVisible();
		await page.waitForSelector('text=Perplexity Search', { timeout: 15_000 });

		// Verify TTL indicator rendered.
		await expect(page.locator('text=/TTL:/i')).toBeVisible();

		// Lazy sections: logs first.
		const logsSection = page.locator('#logs');
		await logsSection.scrollIntoViewIfNeeded();
		await expect(page.getByRole('heading', { name: 'Recent Logs' })).toBeVisible();

		// Lazy section: connectors.
		const connectorsSection = page.locator('#connectors');
		await connectorsSection.scrollIntoViewIfNeeded();
		await expect(page.getByRole('heading', { name: 'Connector Status' })).toBeVisible();
		await expect(page.getByText('Perplexity Search')).toBeVisible();

		// Trigger refresh and ensure a subsequent service-map fetch occurs.
		const refreshResponsePromise = page.waitForResponse((response) => {
			return (
				response.url().endsWith('/v1/connectors/service-map') &&
				response.request().method() === 'GET' &&
				response.status() === 200
			);
		});

		await page.getByRole('button', { name: /Refresh dashboard data/i }).click();
		const refreshResponse = await refreshResponsePromise;
		const serviceMap = await refreshResponse.json();

		expect(serviceMap).toHaveProperty('payload');
		expect(serviceMap?.payload?.connectors?.length).toBeGreaterThan(0);
		expect(serviceMap).toHaveProperty('signature');

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		await fs.writeFile(
			path.join(logDir, `connectors-service-map-${timestamp}.json`),
			JSON.stringify(serviceMap, null, 2),
			'utf8',
		);

		await page.screenshot({
			path: path.join(logDir, `dashboard-preview-${timestamp}.png`),
			fullPage: true,
		});

		// Verify ASBR route returns signed payload with auth token emitted during setup.
		const asbrBaseUrl = process.env.E2E_ASBR_BASE_URL ?? 'http://127.0.0.1:7439';
		const asbrToken = process.env.E2E_ASBR_TOKEN;
		expect(asbrToken, 'ASBR token from global setup').toBeTruthy();

		const asbrResponse = await request.get(`${asbrBaseUrl}/v1/connectors/service-map`, {
			headers: {
				Authorization: `Bearer ${asbrToken}`,
			},
		});

		expect(asbrResponse.ok()).toBeTruthy();
		const asbrJson = await asbrResponse.json();
		expect(asbrJson?.signature).toBeTruthy();
		expect(asbrJson?.connectors?.length ?? 0).toBeGreaterThan(0);

		await fs.writeFile(
			path.join(logDir, `asbr-service-map-${timestamp}.json`),
			JSON.stringify(asbrJson, null, 2),
			'utf8',
		);
	});
});
