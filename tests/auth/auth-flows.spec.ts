import { expect, test } from '@playwright/test';

// Test constants
const TEST_EMAIL = 'e2etest@example.com';
const TEST_PASSWORD = 'SecurePass123!';
const TEST_NAME = 'E2E Test User';
const REGISTER_URL = '/auth/register';
// const LOGIN_URL = '/auth/login';
// const DASHBOARD_URL = '/dashboard';
// const VERIFY_URL = '/auth/verify-email';
const EMAIL_SELECTOR = '[data-testid="email"]';
const PASSWORD_SELECTOR = '[data-testid="password"]';
const NAME_SELECTOR = '[data-testid="name"]';
const REGISTER_BUTTON_SELECTOR = '[data-testid="register-button"]';
const LOGIN_BUTTON_SELECTOR = '[data-testid="login-button"]';
const VERIFICATION_MESSAGE_SELECTOR = '[data-testid="verification-message"]';

test.describe('Authentication Flows', () => {
	test.beforeEach(async ({ page }) => {
		// Clear cookies and local storage before each test
		await page.context.clearCookies();
		await page.evaluate(() => localStorage.clear());
	});

	test.describe('User Registration and Login', () => {
		test('complete registration to dashboard flow', async ({ page }) => {
			// Navigate to registration page
			await page.goto(REGISTER_URL);

			// Fill registration form
			await page.fill(EMAIL_SELECTOR, TEST_EMAIL);
			await page.fill(PASSWORD_SELECTOR, TEST_PASSWORD);
			await page.fill(NAME_SELECTOR, TEST_NAME);
			await page.click(REGISTER_BUTTON_SELECTOR);

			// Should redirect to verification page
			await expect(page).toHaveURL(/\/auth\/verify-email/);
			await expect(page.locator(VERIFICATION_MESSAGE_SELECTOR)).toBeVisible();

			// Mock email verification for test environment
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent('emailVerified'));
			});

			// Should redirect to login after verification
			await expect(page).toHaveURL(/\/auth\/login/);

			// Login with new credentials
			await page.fill(EMAIL_SELECTOR, TEST_EMAIL);
			await page.fill(PASSWORD_SELECTOR, TEST_PASSWORD);
			await page.click(LOGIN_BUTTON_SELECTOR);

			// Should redirect to dashboard
			await expect(page).toHaveURL(/\/dashboard/);
			await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
			await expect(page.locator('[data-testid="welcome-message"]')).toContainText('E2E Test User');
		});

		test('login with invalid credentials shows error', async ({ page }) => {
			await page.goto('/auth/login');

			await page.fill('[data-testid="email"]', 'invalid@example.com');
			await page.fill('[data-testid="password"]', 'wrongpassword');
			await page.click(LOGIN_BUTTON_SELECTOR);

			await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
			await expect(page.locator('[data-testid="error-message"]')).toHaveText(
				/Invalid credentials/i,
			);
		});

		test('password validation during registration', async ({ page }) => {
			await page.goto(REGISTER_URL);

			// Try with weak password
			await page.fill('[data-testid="email"]', 'weak@example.com');
			await page.fill('[data-testid="password"]', 'weak');
			await page.fill('[data-testid="name"]', 'Weak User');
			await page.click(REGISTER_BUTTON_SELECTOR);

			await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
			await expect(page.locator('[data-testid="password-error"]')).toHaveText(
				/Password is too weak/i,
			);
		});

		test('email validation during registration', async ({ page }) => {
			await page.goto(REGISTER_URL);

			// Try with invalid email
			await page.fill('[data-testid="email"]', 'invalid-email');
			await page.fill(PASSWORD_SELECTOR, TEST_PASSWORD);
			await page.fill('[data-testid="name"]', 'Invalid Email User');
			await page.click(REGISTER_BUTTON_SELECTOR);

			await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
			await expect(page.locator('[data-testid="email-error"]')).toHaveText(/Invalid email format/i);
		});
	});

	test.describe('OAuth Authentication', () => {
		test('GitHub OAuth login flow', async ({ page }) => {
			await page.goto('/auth/login');

			// Click GitHub OAuth button
			await page.click('[data-testid="oauth-github"]');

			// Mock OAuth callback
			await page.route('**/auth/github/callback', (route) => {
				route.fulfill({
					status: 302,
					headers: {
						location: '/dashboard',
					},
				});
			});

			// Should redirect to dashboard after OAuth
			await expect(page).toHaveURL(/\/dashboard/);
			await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
		});

		test('Google OAuth login flow', async ({ page }) => {
			await page.goto('/auth/login');

			// Click Google OAuth button
			await page.click('[data-testid="oauth-google"]');

			// Mock OAuth callback
			await page.route('**/auth/google/callback', (route) => {
				route.fulfill({
					status: 302,
					headers: {
						location: '/dashboard',
					},
				});
			});

			// Should redirect to dashboard after OAuth
			await expect(page).toHaveURL(/\/dashboard/);
		});

		test('OAuth error handling', async ({ page }) => {
			await page.goto('/auth/login');

			// Mock OAuth error
			await page.route('**/auth/oauth/github', (route) => {
				route.fulfill({
					status: 302,
					headers: {
						location: '/auth/login?error=oauth_failed',
					},
				});
			});

			await page.click('[data-testid="oauth-github"]');

			// Should show error message
			await expect(page).toHaveURL(/\/auth\/login.*error/);
			await expect(page.locator('[data-testid="oauth-error"]')).toBeVisible();
		});
	});

	test.describe('Password Reset Flow', () => {
		test.beforeEach(async ({ page }) => {
			// Create a user first
			await page.goto(REGISTER_URL);
			await page.fill('[data-testid="email"]', 'reset@example.com');
			await page.fill('[data-testid="password"]', 'ResetPass123!');
			await page.fill('[data-testid="name"]', 'Reset User');
			await page.click(REGISTER_BUTTON_SELECTOR);

			// Mock email verification
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent('emailVerified'));
			});
		});

		test('request password reset', async ({ page }) => {
			await page.goto('/auth/forgot-password');

			await page.fill('[data-testid="email"]', 'reset@example.com');
			await page.click('[data-testid="reset-button"]');

			// Should show success message
			await expect(page.locator('[data-testid="reset-sent-message"]')).toBeVisible();
			await expect(page.locator('[data-testid="reset-sent-message"]')).toHaveText(
				/Check your email/i,
			);
		});

		test('reset password with valid token', async ({ page }) => {
			// Navigate to reset page with token
			await page.goto('/auth/reset-password?token=valid-reset-token');

			await page.fill('[data-testid="password"]', 'NewSecurePass123!');
			await page.fill('[data-testid="confirm-password"]', 'NewSecurePass123!');
			await page.click('[data-testid="update-password-button"]');

			// Should redirect to login with success message
			await expect(page).toHaveURL(/\/auth\/login.*reset=success/);
			await expect(page.locator('[data-testid="reset-success-message"]')).toBeVisible();
		});

		test('reset password with mismatched passwords', async ({ page }) => {
			await page.goto('/auth/reset-password?token=valid-reset-token');

			await page.fill('[data-testid="password"]', 'NewSecurePass123!');
			await page.fill('[data-testid="confirm-password"]', 'DifferentPass123!');
			await page.click('[data-testid="update-password-button"]');

			await expect(page.locator('[data-testid="password-mismatch-error"]')).toBeVisible();
		});
	});

	test.describe('Session Management', () => {
		test.beforeEach(async ({ page }) => {
			// Login user
			await page.goto('/auth/login');
			await page.fill('[data-testid="email"]', 'session@example.com');
			await page.fill('[data-testid="password"]', 'SessionPass123!');
			await page.click(LOGIN_BUTTON_SELECTOR);
			await expect(page).toHaveURL(/\/dashboard/);
		});

		test('view active sessions', async ({ page }) => {
			// Navigate to account settings
			await page.click('[data-testid="account-settings"]');

			// Go to sessions tab
			await page.click('[data-testid="sessions-tab"]');

			// Should show current session
			await expect(page.locator('[data-testid="current-session"]')).toBeVisible();
			await expect(page.locator('[data-testid="session-device"]')).toContainText('Current Device');
		});

		test('logout from current session', async ({ page }) => {
			// Click logout
			await page.click('[data-testid="logout-button"]');

			// Should redirect to login page
			await expect(page).toHaveURL(/\/auth\/login/);
			await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
		});

		test('revoke other session', async ({ page }) => {
			// Navigate to account settings
			await page.click('[data-testid="account-settings"]');
			await page.click('[data-testid="sessions-tab"]');

			// Revoke first other session
			const revokeButtons = await page.locator('[data-testid^="revoke-session-"]').all();
			if (revokeButtons.length > 0) {
				await revokeButtons[0].click();
				await expect(page.locator('[data-testid="session-revoked-message"]')).toBeVisible();
			}
		});
	});

	test.describe('Two-Factor Authentication', () => {
		test.beforeEach(async ({ page }) => {
			// Login user with 2FA enabled
			await page.goto('/auth/login');
			await page.fill('[data-testid="email"]', '2fa@example.com');
			await page.fill('[data-testid="password"]', 'TwoFactorPass123!');
			await page.click(LOGIN_BUTTON_SELECTOR);
		});

		test('setup 2FA with TOTP', async ({ page }) => {
			// Navigate to security settings
			await page.click('[data-testid="account-settings"]');
			await page.click('[data-testid="security-tab"]');

			// Enable 2FA
			await page.click('[data-testid="enable-2fa-button"]');

			// Should show QR code
			await expect(page.locator('[data-testid="totp-qr-code"]')).toBeVisible();
			await expect(page.locator('[data-testid="totp-secret"]')).toBeVisible();

			// Mock successful 2FA setup
			await page.fill('[data-testid="totp-code"]', '123456');
			await page.click('[data-testid="verify-2fa-button"]');

			await expect(page.locator('[data-testid="2fa-enabled-message"]')).toBeVisible();
		});

		test('login with 2FA', async ({ page }) => {
			// After initial login, should show 2FA prompt
			await expect(page).toHaveURL(/\/auth\/verify-2fa/);
			await expect(page.locator('[data-testid="2fa-input"]')).toBeVisible();

			// Enter correct 2FA code
			await page.fill('[data-testid="2fa-input"]', '123456');
			await page.click('[data-testid="verify-2fa-button"]');

			// Should redirect to dashboard
			await expect(page).toHaveURL(/\/dashboard/);
		});

		test('2FA with invalid code', async ({ page }) => {
			await expect(page).toHaveURL(/\/auth\/verify-2fa/);

			// Enter invalid 2FA code
			await page.fill('[data-testid="2fa-input"]', '000000');
			await page.click('[data-testid="verify-2fa-button"]');

			await expect(page.locator('[data-testid="2fa-error"]')).toBeVisible();
		});
	});

	test.describe('Profile Management', () => {
		test.beforeEach(async ({ page }) => {
			// Login user
			await page.goto('/auth/login');
			await page.fill('[data-testid="email"]', 'profile@example.com');
			await page.fill('[data-testid="password"]', 'ProfilePass123!');
			await page.click(LOGIN_BUTTON_SELECTOR);
		});

		test('update profile information', async ({ page }) => {
			// Navigate to profile settings
			await page.click('[data-testid="account-settings"]');
			await page.click('[data-testid="profile-tab"]');

			// Update name
			await page.fill('[data-testid="name"]', 'Updated Name');
			await page.click('[data-testid="save-profile-button"]');

			// Should show success message
			await expect(page.locator('[data-testid="profile-saved-message"]')).toBeVisible();

			// Verify update persisted
			await page.reload();
			await expect(page.locator('[data-testid="name"]')).toHaveValue('Updated Name');
		});

		test('upload profile picture', async ({ page }) => {
			await page.click('[data-testid="account-settings"]');
			await page.click('[data-testid="profile-tab"]');

			// Upload file
			const fileInput = await page.locator('[data-testid="avatar-upload"]');
			await fileInput.setInputFiles('tests/fixtures/test-avatar.jpg');

			// Should show preview
			await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible();

			// Save changes
			await page.click('[data-testid="save-profile-button"]');
			await expect(page.locator('[data-testid="profile-saved-message"]')).toBeVisible();
		});
	});

	test.describe('Security Features', () => {
		test('rate limiting on login attempts', async ({ page }) => {
			// Attempt multiple failed logins
			for (let i = 0; i < 6; i++) {
				await page.goto('/auth/login');
				await page.fill('[data-testid="email"]', 'ratelimit@example.com');
				await page.fill('[data-testid="password"]', 'wrongpassword');
				await page.click(LOGIN_BUTTON_SELECTOR);
			}

			// Should show rate limiting message
			await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
		});

		test('CSRF protection on auth forms', async ({ page }) => {
			await page.goto('/auth/login');

			// Should have CSRF token in form
			const csrfToken = await page.locator('[data-testid="csrf-token"]');
			await expect(csrfToken).toBeVisible();
			expect(await csrfToken.getAttribute('value')).toMatch(/^[a-f0-9]+$/);
		});

		test('secure cookie attributes', async ({ page }) => {
			// Login to set cookies
			await page.goto('/auth/login');
			await page.fill('[data-testid="email"]', 'cookies@example.com');
			await page.fill('[data-testid="password"]', 'CookiePass123!');
			await page.click(LOGIN_BUTTON_SELECTOR);

			// Check cookie attributes
			const cookies = await page.context.cookies();
			const authCookie = cookies.find((c) => c.name.includes('auth'));

			expect(authCookie).toBeTruthy();
			expect(authCookie?.secure).toBe(true);
			expect(authCookie?.httpOnly).toBe(true);
			expect(authCookie?.sameSite).toBe('Strict');
		});
	});

	test.describe('Cross-Device Authentication', () => {
		test('maintain authentication across page refresh', async ({ page }) => {
			// Login
			await page.goto('/auth/login');
			await page.fill('[data-testid="email"]', 'refresh@example.com');
			await page.fill('[data-testid="password"]', 'RefreshPass123!');
			await page.click(LOGIN_BUTTON_SELECTOR);
			await expect(page).toHaveURL(/\/dashboard/);

			// Refresh page
			await page.reload();

			// Should still be authenticated
			await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
		});

		test('handle expired session gracefully', async ({ page }) => {
			// Mock expired session
			await page.addInitScript(() => {
				Object.defineProperty(window, 'localStorage', {
					value: {
						getItem: () =>
							JSON.stringify({
								token: 'expired-token',
								expires: Date.now() - 1000,
							}),
						setItem: () => {},
						removeItem: () => {},
						clear: () => {},
					},
					writable: false,
				});
			});

			await page.goto('/dashboard');

			// Should redirect to login with session expired message
			await expect(page).toHaveURL(/\/auth\/login.*expired/);
			await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
		});
	});

	test.describe('Accessibility', () => {
		test('keyboard navigation through login form', async ({ page }) => {
			await page.goto('/auth/login');

			// Navigate using keyboard
			await page.keyboard.press('Tab');
			await expect(page.locator('[data-testid="email"]')).toBeFocused();

			await page.keyboard.press('Tab');
			await expect(page.locator('[data-testid="password"]')).toBeFocused();

			await page.keyboard.press('Tab');
			await expect(page.locator('[data-testid="login-button"]')).toBeFocused();

			// Submit with Enter
			await page.keyboard.press('Enter');

			// Should show validation errors (empty form)
			await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
		});

		test('screen reader support for auth forms', async ({ page }) => {
			await page.goto(REGISTER_URL);

			// Check for proper ARIA labels
			await expect(page.locator('[data-testid="email"]')).toHaveAttribute('aria-label', /email/i);
			await expect(page.locator('[data-testid="password"]')).toHaveAttribute(
				'aria-label',
				/password/i,
			);
			await expect(page.locator('[data-testid="register-button"]')).toHaveAttribute(
				'aria-describedby',
				/registration-help/i,
			);

			// Check error announcements
			await page.click(REGISTER_BUTTON_SELECTOR);
			const errors = await page.locator('[role="alert"]').all();
			expect(errors.length).toBeGreaterThan(0);
		});
	});

	test.describe('Mobile Responsiveness', () => {
		test.use({ viewport: { width: 375, height: 667 } }); // iPhone 8

		test('auth forms work on mobile', async ({ page }) => {
			await page.goto('/auth/login');

			// Form should be properly sized
			const form = await page.locator('[data-testid="login-form"]');
			const box = await form.boundingBox();
			expect(box?.width).toBeLessThan(400);

			// Input fields should be touch-friendly
			const emailInput = await page.locator('[data-testid="email"]');
			const emailBox = await emailInput.boundingBox();
			expect(emailBox?.height).toBeGreaterThan(40);

			// Can complete login flow
			await page.fill('[data-testid="email"]', 'mobile@example.com');
			await page.fill('[data-testid="password"]', 'MobilePass123!');
			await page.click(LOGIN_BUTTON_SELECTOR);

			await expect(page).toHaveURL(/\/dashboard/);
		});
	});

	test.describe('Performance', () => {
		test('login page loads within performance budget', async ({ page }) => {
			const startTime = Date.now();
			await page.goto('/auth/login');
			const loadTime = Date.now() - startTime;

			// Should load within 2 seconds
			expect(loadTime).toBeLessThan(2000);

			// Largest Contentful Paint should be reasonable
			const lcp = await page.evaluate(() => {
				return new Promise((resolve) => {
					const observer = new PerformanceObserver((list) => {
						const entries = list.getEntries();
						const lcpEntry = entries[entries.length - 1];
						resolve(lcpEntry.startTime);
					});
					observer.observe({ type: 'largest-contentful-paint', buffered: true });
				});
			});

			expect(lcp).toBeLessThan(1500);
		});

		test('auth requests complete within SLA', async ({ page }) => {
			// Mock slow network
			await page.route('**/auth/**', (route) => {
				setTimeout(() => route.continue(), 100);
			});

			const startTime = Date.now();
			await page.goto('/auth/login');
			await page.fill('[data-testid="email"]', 'perf@example.com');
			await page.fill('[data-testid="password"]', 'PerfPass123!');
			await page.click(LOGIN_BUTTON_SELECTOR);

			const endTime = Date.now();
			expect(endTime - startTime).toBeLessThan(3000); // 3 second SLA
		});
	});
});
