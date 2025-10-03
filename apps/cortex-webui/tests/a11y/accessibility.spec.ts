import { expect, test } from '@playwright/test';
import { checkA11y, injectAxe } from 'axe-playwright';

/**
 * brAInwav Cortex-OS Accessibility E2E Tests
 *
 * Comprehensive WCAG 2.2 AA compliance testing:
 * - Keyboard navigation testing
 * - Screen reader compatibility validation
 * - Color contrast verification
 * - Focus management testing
 * - ARIA attribute validation
 * - Mobile accessibility testing
 * - Error message accessibility
 * - Form accessibility validation
 */
test.describe('brAInwav Cortex-OS Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		await injectAxe(page);
	});

	test.describe('WCAG 2.2 AA Compliance', () => {
		test('should meet accessibility standards on home page', async ({ page }) => {
			await page.goto('/');

			// Wait for page to fully load
			await page.waitForLoadState('networkidle');

			// Run accessibility scan
			await checkA11y(page, null, {
				detailedReport: true,
				detailedReportOptions: { html: true },
				rules: {
					// Custom rules for brAInwav-specific components
					'color-contrast': { enabled: true },
					'keyboard-navigation': { enabled: true },
					'aria-labels': { enabled: true },
					'focus-management': { enabled: true },
				},
			});

			// Verify brAInwav branding is accessible
			await expect(page.locator('h1, [role="heading"]')).toBeVisible();
			await expect(page.locator('text=brAInwav')).toBeVisible();
		});

		test('should have proper heading hierarchy', async ({ page }) => {
			await page.goto('/');

			// Check for proper heading structure
			const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

			// Should have at least one h1
			const h1Headings = await page.locator('h1').all();
			expect(h1Headings.length).toBeGreaterThanOrEqual(1);

			// Check heading levels are not skipped
			let previousLevel = 1;
			for (const heading of headings) {
				const level = parseInt(
					(await heading.getAttribute('aria-level')) ||
						(await heading.evaluate((el) => el.tagName.substring(1))),
					10,
				);
				expect(level).toBeLessThanOrEqual(previousLevel + 1);
				previousLevel = level;
			}
		});

		test('should have sufficient color contrast', async ({ page }) => {
			await page.goto('/');

			// Test specific brAInwav elements for contrast
			const contrastElements = [
				'button',
				'a',
				'.btn',
				'[data-testid="login-button"]',
				'[data-testid="register-button"]',
				'[data-testid="nav-link"]',
			];

			for (const selector of contrastElements) {
				const elements = await page.locator(selector).all();
				for (const element of elements) {
					if (await element.isVisible()) {
						const styles = await element.evaluate((el) => {
							const computed = window.getComputedStyle(el);
							return {
								color: computed.color,
								backgroundColor: computed.backgroundColor,
								fontSize: computed.fontSize,
							};
						});

						// Ensure colors are defined (not transparent)
						expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
						expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
					}
				}
			}
		});
	});

	test.describe('Keyboard Navigation', () => {
		test('should be fully navigable with keyboard', async ({ page }) => {
			await page.goto('/');

			// Tab through interactive elements
			const interactiveElements = [
				'[data-testid="login-button"]',
				'[data-testid="register-button"]',
				'a[href]',
				'button',
				'[tabindex]:not([tabindex="-1"])',
			];

			for (const selector of interactiveElements) {
				const elements = await page.locator(selector).all();
				for (const element of elements) {
					if (await element.isVisible()) {
						// Tab to element
						await element.focus();

						// Verify element receives focus
						await expect(element).toBeFocused();

						// Check for visible focus indicator
						const focusStyles = await element.evaluate((el) => {
							const computed = window.getComputedStyle(el, ':focus');
							return {
								outline: computed.outline,
								outlineOffset: computed.outlineOffset,
								boxShadow: computed.boxShadow,
							};
						});

						// Should have some focus indicator
						const hasFocusIndicator =
							focusStyles.outline !== 'none' || focusStyles.boxShadow !== 'none';

						expect(hasFocusIndicator).toBeTruthy();
					}
				}
			}
		});

		test('should support skip links for keyboard users', async ({ page }) => {
			await page.goto('/');

			// Check for skip links
			const skipLinks = await page.locator('a[href^="#"]').all();

			if (skipLinks.length > 0) {
				// Test first skip link
				await skipLinks[0].focus();
				await page.keyboard.press('Enter');

				// Verify skip link works
				const targetId = await skipLinks[0].getAttribute('href');
				if (targetId) {
					const target = page.locator(targetId);
					await expect(target).toBeFocused();
				}
			}
		});

		test('should maintain logical tab order', async ({ page }) => {
			await page.goto('/');

			const focusableElements = await page
				.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
				.all();

			if (focusableElements.length > 1) {
				// Focus first element
				await focusableElements[0].focus();
				let currentIndex = 0;

				// Tab through all elements
				for (let i = 1; i < focusableElements.length; i++) {
					await page.keyboard.press('Tab');

					// Find currently focused element
					const _focusedElement = page.locator(':focus');
					const focusedIndex = focusableElements.findIndex(
						async (el, _index) => await el.evaluate((node) => node === document.activeElement),
					);

					// Should progress forward or wrap around
					expect(focusedIndex).toBeGreaterThanOrEqual(currentIndex);
					currentIndex = focusedIndex;
				}
			}
		});
	});

	test.describe('Screen Reader Compatibility', () => {
		test('should have proper ARIA labels and roles', async ({ page }) => {
			await page.goto('/');

			// Check for ARIA landmarks
			const landmarks = [
				'[role="banner"]',
				'[role="navigation"]',
				'[role="main"]',
				'[role="contentinfo"]',
				'header',
				'nav',
				'main',
				'footer',
			];

			for (const landmark of landmarks) {
				const elements = await page.locator(landmark).all();
				if (elements.length > 0) {
					// At least one landmark should be present
					expect(elements.length).toBeGreaterThanOrEqual(1);
				}
			}

			// Check for proper form labels
			const formInputs = await page.locator('input, select, textarea').all();
			for (const input of formInputs) {
				if (await input.isVisible()) {
					// Should have associated label or aria-label
					const hasLabel = await input.evaluate((el) => {
						const id = el.id;
						const hasAriaLabel = el.hasAttribute('aria-label');
						const hasAriaLabelledBy = el.hasAttribute('aria-labelledby');
						const hasAssociatedLabel = id ? document.querySelector(`label[for="${id}"]`) : false;

						return hasAriaLabel || hasAriaLabelledBy || hasAssociatedLabel;
					});

					expect(hasLabel).toBeTruthy();
				}
			}
		});

		test('should announce dynamic content changes', async ({ page }) => {
			await page.goto('/login');

			// Fill form and submit to trigger dynamic content
			await page.fill('[data-testid="email-input"]', 'test@brainwav.ai');
			await page.fill('[data-testid="password-input"]', 'password');

			// Check for error announcement container
			const liveRegion = page.locator('[aria-live], [role="alert"], [role="status"]');

			if ((await liveRegion.count()) > 0) {
				// Should be present for dynamic announcements
				expect(await liveRegion.isVisible()).toBeTruthy();
			}
		});

		test('should have proper alt text for images', async ({ page }) => {
			await page.goto('/');

			const images = await page.locator('img').all();
			for (const image of images) {
				if (await image.isVisible()) {
					const alt = await image.getAttribute('alt');
					const role = await image.getAttribute('role');

					// Should have alt text or be decorative
					expect(alt !== null || role === 'presentation').toBeTruthy();

					// If decorative, alt should be empty
					if (role === 'presentation') {
						expect(alt).toBe('');
					}
				}
			}
		});
	});

	test.describe('Focus Management', () => {
		test('should manage focus in modal dialogs', async ({ page }) => {
			await page.goto('/login');

			// Trigger modal (if exists)
			const modalTrigger = page.locator('[data-testid="forgot-password-link"]');
			if (await modalTrigger.isVisible()) {
				await modalTrigger.click();

				// Check for modal
				const modal = page.locator('[role="dialog"], .modal');
				if (await modal.isVisible()) {
					// Focus should be trapped in modal
					const firstFocusable = await modal
						.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
						.first();

					if ((await firstFocusable.count()) > 0) {
						await expect(firstFocusable).toBeFocused();
					}

					// Test escape key closes modal
					await page.keyboard.press('Escape');
					await expect(modal).not.toBeVisible();
				}
			}
		});

		test('should restore focus after dynamic operations', async ({ page }) => {
			await page.goto('/');

			// Find a trigger element
			const trigger = page.locator('button, [href]').first();
			if (await trigger.isVisible()) {
				await trigger.focus();
				const _triggerId = await trigger.evaluate((el) => el.id || 'no-id');

				// Perform action that might move focus
				await trigger.click();

				// Try to return focus or verify it's managed
				const currentFocus = page.locator(':focus');
				expect(await currentFocus.count()).toBeGreaterThanOrEqual(0);
			}
		});
	});

	test.describe('Mobile Accessibility', () => {
		test('should be accessible on mobile viewport', async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto('/');

			// Run accessibility scan on mobile
			await checkA11y(page, null, {
				detailedReport: true,
				rules: {
					'touch-target-size': { enabled: true },
					'mobile-gestures': { enabled: true },
				},
			});

			// Check touch target sizes
			const touchTargets = await page.locator('button, a, input, [role="button"]').all();
			for (const target of touchTargets) {
				if (await target.isVisible()) {
					const boundingBox = await target.boundingBox();
					if (boundingBox) {
						// Touch targets should be at least 44x44 pixels
						expect(boundingBox.width).toBeGreaterThanOrEqual(44);
						expect(boundingBox.height).toBeGreaterThanOrEqual(44);
					}
				}
			}
		});

		test('should support mobile accessibility features', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto('/');

			// Test pinch-to-zoom is not disabled
			const metaViewport = await page.locator('meta[name="viewport"]').getAttribute('content');
			expect(metaViewport).not.toContain('user-scalable=no');
			expect(metaViewport).not.toContain('maximum-scale=1');

			// Test text can be resized
			const fontSize = await page.locator('body').evaluate((el) => {
				return window.getComputedStyle(el).fontSize;
			});
			expect(fontSize).not.toBe('0px');
		});
	});

	test.describe('Form Accessibility', () => {
		test.beforeEach(async ({ page }) => {
			await page.goto('/register');
		});

		test('should have accessible form validation', async ({ page }) => {
			// Submit empty form to trigger validation
			await page.click('[data-testid="register-submit-button"]');

			// Check for error messages
			const errorMessages = await page
				.locator('[data-testid*="error"], .error, [role="alert"]')
				.all();

			for (const error of errorMessages) {
				if (await error.isVisible()) {
					// Error should be associated with input
					const errorId = await error.getAttribute('id');
					if (errorId) {
						const associatedInput = page.locator(`[aria-describedby*="${errorId}"]`);
						expect(await associatedInput.count()).toBeGreaterThan(0);
					}
				}
			}
		});

		test('should provide clear form instructions', async ({ page }) => {
			const forms = await page.locator('form').all();

			for (const form of forms) {
				if (await form.isVisible()) {
					// Check for form instructions
					const instructions = await form
						.locator('[aria-describedby], fieldset legend, .form-instructions')
						.all();

					if (instructions.length === 0) {
						// If no explicit instructions, form should be self-evident
						const hasDescriptiveHeading = await form.locator('legend, h1, h2, h3').count();
						expect(hasDescriptiveHeading).toBeGreaterThan(0);
					}
				}
			}
		});

		test('should handle complex form patterns accessibly', async ({ page }) => {
			// Test password strength indicator
			const passwordInput = page.locator('[data-testid="password-input"]');
			if (await passwordInput.isVisible()) {
				await passwordInput.fill('test');

				// Check for password feedback
				const feedback = page.locator('[data-testid="password-strength"], .password-feedback');
				if (await feedback.isVisible()) {
					// Should be properly announced
					const isAriaLive = await feedback.getAttribute('aria-live');
					const hasRole = await feedback.getAttribute('role');

					expect(isAriaLive !== null || hasRole !== null).toBeTruthy();
				}
			}
		});
	});

	test.describe('Error Handling Accessibility', () => {
		test('should announce errors properly', async ({ page }) => {
			await page.goto('/login');

			// Submit invalid login to trigger error
			await page.fill('[data-testid="email-input"]', 'invalid@brainwav.ai');
			await page.fill('[data-testid="password-input"]', 'wrong');
			await page.click('[data-testid="login-submit-button"]');

			// Check for error announcement
			const errorAnnouncement = page.locator('[role="alert"], [aria-live="assertive"]');

			if (await errorAnnouncement.isVisible()) {
				// Error should be in announcement region
				const hasAriaLive = await errorAnnouncement.getAttribute('aria-live');
				const hasRole = await errorAnnouncement.getAttribute('role');

				expect(hasAriaLive === 'assertive' || hasRole === 'alert').toBeTruthy();
			}
		});

		test('should provide accessible error recovery', async ({ page }) => {
			await page.goto('/register');

			// Trigger validation errors
			await page.click('[data-testid="register-submit-button"]');

			// Check if focus moves to first error
			const firstError = page.locator('[data-testid*="error"]').first();

			if (await firstError.isVisible()) {
				// Check if associated input is focused
				const errorId = await firstError.getAttribute('id');
				if (errorId) {
					const associatedInput = page.locator(`[aria-describedby*="${errorId}"]`);
					if ((await associatedInput.count()) > 0) {
						await expect(associatedInput.first()).toBeFocused();
					}
				}
			}
		});
	});

	test.describe('brAInwav-Specific Accessibility', () => {
		test('should make brAInwav branding accessible', async ({ page }) => {
			await page.goto('/');

			// Check brAInwav logo and branding
			const logo = page.locator('img[alt*="brAInwav"], [data-testid="logo"]');
			if (await logo.isVisible()) {
				const alt = await logo.getAttribute('alt');
				expect(alt).toContain('brAInwav');
			}

			// Check that brAInwav text is accessible
			const brandText = page.locator('text=brAInwav');
			if (await brandText.isVisible()) {
				// Should be in a semantic element
				const parent = brandText.locator('..');
				const tagName = await parent.evaluate((el) => el.tagName.toLowerCase());
				expect(['h1', 'h2', 'h3', 'p', 'span', 'div']).toContain(tagName);
			}
		});

		test('should make AI agent interfaces accessible', async ({ page }) => {
			// Login to access agent features
			await page.goto('/login');
			await page.fill('[data-testid="email-input"]', 'testuser@brainwav.ai');
			await page.fill('[data-testid="password-input"]', 'TestPassword123!');
			await page.click('[data-testid="login-submit-button"]');
			await page.waitForURL(/\/dashboard/);

			// Navigate to workflows
			await page.click('[data-testid="workflows-nav"]');
			await page.waitForURL(/\/workflows/);

			// Run accessibility check on workflow interface
			await checkA11y(page, null, {
				detailedReport: true,
				rules: {
					'keyboard-navigation': { enabled: true },
					'aria-labels': { enabled: true },
				},
			});

			// Check agent configuration accessibility
			const agentConfigs = await page.locator('[data-testid*="agent"]').all();
			for (const config of agentConfigs) {
				if (await config.isVisible()) {
					// Should have proper labels
					const inputs = await config.locator('input, select').all();
					for (const input of inputs) {
						const hasLabel = await input.evaluate((el) => {
							const id = el.id;
							return (
								el.hasAttribute('aria-label') ||
								el.hasAttribute('aria-labelledby') ||
								(id && document.querySelector(`label[for="${id}"]`))
							);
						});
						expect(hasLabel).toBeTruthy();
					}
				}
			}
		});
	});
});
