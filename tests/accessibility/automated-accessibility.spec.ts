import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routesToScan = ['/', '/dashboard'];

const focusableSelector = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

test.describe('Automated accessibility compliance', () => {
	test.describe('WCAG regression scan', () => {
		for (const route of routesToScan) {
			test(`route ${route} has no critical accessibility violations`, async ({ page }) => {
				const response = await page.goto(route, { waitUntil: 'networkidle' });
				expect(
					response,
					`brAInwav accessibility: ${route} navigation failed (no response)`,
				).not.toBeNull();
				expect(
					response.status(),
					`brAInwav accessibility: ${route} returned an unexpected status`,
				).toBeLessThan(400);

				const { violations } = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
					.analyze();

				const blockingViolations = violations.filter(
					(violation) => violation.impact === 'critical' || violation.impact === 'serious',
				);

				expect(
					blockingViolations,
					`brAInwav accessibility regression detected on ${route}: ${blockingViolations
						.map((violation) => violation.id)
						.join(', ')}`,
				).toEqual([]);
			});
		}
	});

	test('dashboard maintains a logical heading structure', async ({ page }) => {
		await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

		const headingLevels = await page.$$eval('h1, h2, h3, h4, h5, h6', (nodes) =>
			nodes.map((node) => Number.parseInt(node.tagName.substring(1), 10)),
		);

		expect(
			headingLevels.length,
			'brAInwav accessibility: missing headings in dashboard view',
		).toBeGreaterThan(0);
		expect(
			headingLevels.includes(1),
			'brAInwav accessibility: missing level-one heading for context',
		).toBe(true);

		for (let index = 1; index < headingLevels.length; index += 1) {
			const previousLevel = headingLevels[index - 1];
			const currentLevel = headingLevels[index];
			expect(
				currentLevel,
				`brAInwav accessibility: heading level skipped from h${previousLevel} to h${currentLevel}`,
			).toBeLessThanOrEqual(previousLevel + 1);
		}
	});

	test('primary navigation supports keyboard focus', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const focusableElements = page.locator(focusableSelector);
		await expect(
			focusableElements.first(),
			'brAInwav accessibility: at least one focusable element is required',
		).toBeVisible();

		await page.keyboard.press('Tab');

		const activeElementTag = await page.evaluate(() => document.activeElement?.tagName ?? '');
		expect(
			activeElementTag.length,
			'brAInwav accessibility: focus did not move after Tab navigation',
		).toBeGreaterThan(0);

		const navigationLocator = page.locator('nav, [role="navigation"]').first();
		await expect(
			navigationLocator,
			'brAInwav accessibility: navigation landmark must be visible',
		).toBeVisible();

		const navigationFocusable = navigationLocator.locator(focusableSelector);
		await expect(
			navigationFocusable.first(),
			'brAInwav accessibility: navigation requires focusable items',
		).toBeVisible();

		await navigationFocusable.first().focus();
		await expect(
			navigationFocusable.first(),
			'brAInwav accessibility: navigation item is not keyboard focusable',
		).toBeFocused();
	});
});
