import { expect, test } from '@playwright/test';
import { TestDatabase } from '../support/test-database';

/**
 * brAInwav Cortex-OS Authentication Flow E2E Tests
 *
 * Comprehensive testing of authentication workflows:
 * - User registration with email verification
 * - Login/logout with proper session management
 * - Social authentication (Google, GitHub)
 * - Password reset functionality
 * - Session persistence and expiration
 * - Role-based access control
 * - Security validation (CSRF, XSS protection)
 * - Multi-device session management
 */
test.describe('brAInwav Cortex-OS Authentication Flows', () => {
	let testDb: TestDatabase;

	test.beforeAll(async () => {
		testDb = new TestDatabase();
		await testDb.initialize();
		await testDb.seed();
	});

	test.afterAll(async () => {
		await testDb.cleanup();
	});

	test.beforeEach(async ({ page }) => {
		// Set up test context
		await page.addInitScript(() => {
			window.localStorage.setItem('test-mode', 'true');
		});

		// Navigate to home page
		await page.goto('/');

		// Clear any existing session
		await page.context().clearCookies();
		await page.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
		});
	});

	test.describe('User Registration Flow', () => {
		test('should register new user successfully with brAInwav branding', async ({ page }) => {
			await page.click('[data-testid="register-button"]');
			await expect(page).toHaveURL(/\/register/);

			// Fill registration form
			const userData = {
				firstName: 'John',
				lastName: 'Doe',
				email: 'john.doe@brainwav.ai',
				password: 'SecurePassword123!',
				confirmPassword: 'SecurePassword123!',
			};

			await page.fill('[data-testid="first-name-input"]', userData.firstName);
			await page.fill('[data-testid="last-name-input"]', userData.lastName);
			await page.fill('[data-testid="email-input"]', userData.email);
			await page.fill('[data-testid="password-input"]', userData.password);
			await page.fill('[data-testid="confirm-password-input"]', userData.confirmPassword);

			// Accept terms and privacy policy
			await page.check('[data-testid="terms-checkbox"]');
			await page.check('[data-testid="privacy-checkbox"]');

			// Verify brAInwav branding is present
			await expect(page.locator('text=brAInwav')).toBeVisible();
			await expect(page.locator('text=Cortex-OS')).toBeVisible();

			// Submit registration
			await page.click('[data-testid="register-submit-button"]');

			// Should redirect to email verification
			await expect(page).toHaveURL(/\/verify-email/);
			await expect(page.locator('text=Check your email')).toBeVisible();
			await expect(page.locator(`text=${userData.email}`)).toBeVisible();

			// Verify email content mentions brAInwav
			await expect(page.locator('text=brAInwav Cortex-OS')).toBeVisible();
		});

		test('should validate registration form fields correctly', async ({ page }) => {
			await page.goto('/register');

			// Test empty form validation
			await page.click('[data-testid="register-submit-button"]');

			await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
			await expect(page.locator('[data-testid="last-name-error"]')).toBeVisible();
			await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
			await expect(page.locator('[data-testid="password-error"]')).toBeVisible();

			// Test email format validation
			await page.fill('[data-testid="email-input"]', 'invalid-email');
			await page.click('[data-testid="register-submit-button"]');
			await expect(page.locator('text=Invalid email format')).toBeVisible();

			// Test password strength validation
			await page.fill('[data-testid="password-input"]', 'weak');
			await page.click('[data-testid="register-submit-button"]');
			await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();

			// Test password mismatch
			await page.fill('[data-testid="password-input"]', 'StrongPassword123!');
			await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
			await page.click('[data-testid="register-submit-button"]');
			await expect(page.locator('text=Passwords do not match')).toBeVisible();
		});

		test('should handle email verification flow', async ({ page }) => {
			// Start registration
			await page.goto('/register');

			const userData = {
				firstName: 'Jane',
				lastName: 'Smith',
				email: 'jane.smith@brainwav.ai',
				password: 'SecurePassword123!',
				confirmPassword: 'SecurePassword123!',
			};

			await page.fill('[data-testid="first-name-input"]', userData.firstName);
			await page.fill('[data-testid="last-name-input"]', userData.lastName);
			await page.fill('[data-testid="email-input"]', userData.email);
			await page.fill('[data-testid="password-input"]', userData.password);
			await page.fill('[data-testid="confirm-password-input"]', userData.confirmPassword);
			await page.check('[data-testid="terms-checkbox"]');
			await page.check('[data-testid="privacy-checkbox"]');
			await page.click('[data-testid="register-submit-button"]');

			// Should be on verification page
			await expect(page).toHaveURL(/\/verify-email/);

			// Simulate clicking verification link (in real test, this would come from email)
			await page.goto(
				`/verify-email?token=mock-verification-token&email=${encodeURIComponent(userData.email)}`,
			);

			// Should redirect to welcome page
			await expect(page).toHaveURL(/\/welcome/);
			await expect(page.locator('text=Welcome to brAInwav Cortex-OS')).toBeVisible();
			await expect(page.locator(`text=${userData.firstName}`)).toBeVisible();
		});
	});

	test.describe('Login Flow', () => {
		test('should login existing user successfully', async ({ page }) => {
			const testUsers = testDb.getTestUsers();

			await page.click('[data-testid="login-button"]');
			await expect(page).toHaveURL(/\/login/);

			// Fill login form
			await page.fill('[data-testid="email-input"]', testUsers.regularUser.email);
			await page.fill('[data-testid="password-input"]', testUsers.regularUser.password);

			// Verify brAInwav branding
			await expect(page.locator('text=brAInwav')).toBeVisible();
			await expect(page.locator('text=Cortex-OS')).toBeVisible();

			// Submit login
			await page.click('[data-testid="login-submit-button"]');

			// Should redirect to dashboard
			await expect(page).toHaveURL(/\/dashboard/);
			await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
			await expect(page.locator(`text=${testUsers.regularUser.email}`)).toBeVisible();
		});

		test('should handle invalid login credentials', async ({ page }) => {
			await page.goto('/login');

			await page.fill('[data-testid="email-input"]', 'invalid@brainwav.ai');
			await page.fill('[data-testid="password-input"]', 'wrongpassword');
			await page.click('[data-testid="login-submit-button"]');

			// Should show error message
			await expect(page.locator('text=Invalid email or password')).toBeVisible();
			await expect(page).toHaveURL(/\/login/);
		});

		test('should maintain session across page reloads', async ({ page }) => {
			const testUsers = testDb.getTestUsers();

			// Login
			await page.goto('/login');
			await page.fill('[data-testid="email-input"]', testUsers.regularUser.email);
			await page.fill('[data-testid="password-input"]', testUsers.regularUser.password);
			await page.click('[data-testid="login-submit-button"]');

			// Verify logged in
			await expect(page).toHaveURL(/\/dashboard/);
			await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

			// Reload page
			await page.reload();

			// Should still be logged in
			await expect(page).toHaveURL(/\/dashboard/);
			await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
		});

		test('should handle session expiration gracefully', async ({ page }) => {
			const testUsers = testDb.getTestUsers();

			// Login
			await page.goto('/login');
			await page.fill('[data-testid="email-input"]', testUsers.regularUser.email);
			await page.fill('[data-testid="password-input"]', testUsers.regularUser.password);
			await page.click('[data-testid="login-submit-button"]');

			// Simulate session expiration by clearing cookies
			await page.context().clearCookies();

			// Try to access protected page
			await page.goto('/dashboard');

			// Should redirect to login
			await expect(page).toHaveURL(/\/login/);
			await expect(page.locator('text=Your session has expired')).toBeVisible();
		});
	});

	test.describe('Social Authentication', () => {
		test('should handle Google OAuth flow', async ({ page }) => {
			await page.goto('/login');

			// Click Google login button
			await page.click('[data-testid="google-login-button"]');

			// Should redirect to Google OAuth (mocked in test environment)
			await expect(page).toHaveURL(/\/auth\/callback/);

			// Should complete authentication and redirect to dashboard
			await expect(page).toHaveURL(/\/dashboard/);
			await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
			await expect(page.locator('text=Google Account')).toBeVisible();
		});

		test('should handle GitHub OAuth flow', async ({ page }) => {
			await page.goto('/login');

			// Click GitHub login button
			await page.click('[data-testid="github-login-button"]');

			// Should redirect to GitHub OAuth (mocked in test environment)
			await expect(page).toHaveURL(/\/auth\/callback/);

			// Should complete authentication and redirect to dashboard
			await expect(page).toHaveURL(/\/dashboard/);
			await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
			await expect(page.locator('text=GitHub Account')).toBeVisible();
		});

		test('should handle OAuth error scenarios', async ({ page }) => {
			await page.goto('/auth/callback?error=access_denied&state=test-state');

			// Should show error message
			await expect(page.locator('text=Authentication failed')).toBeVisible();
			await expect(page.locator('text=Access denied by provider')).toBeVisible();
			await expect(page).toHaveURL(/\/login/);
		});
	});

	test.describe('Logout Flow', () => {
		test('should logout user successfully', async ({ page }) => {
			const testUsers = testDb.getTestUsers();

			// Login first
			await page.goto('/login');
			await page.fill('[data-testid="email-input"]', testUsers.regularUser.email);
			await page.fill('[data-testid="password-input"]', testUsers.regularUser.password);
			await page.click('[data-testid="login-submit-button"]');

			// Verify logged in
			await expect(page).toHaveURL(/\/dashboard/);

			// Logout
			await page.click('[data-testid="user-menu"]');
			await page.click('[data-testid="logout-button"]');

			// Should redirect to home page
			await expect(page).toHaveURL('/');
			await expect(page.locator('[data-testid="login-button"]')).toBeVisible();

			// Verify session is cleared
			await page.goto('/dashboard');
			await expect(page).toHaveURL(/\/login/);
		});

		test('should handle logout from all devices', async ({ page }) => {
			const testUsers = testDb.getTestUsers();

			// Login
			await page.goto('/login');
			await page.fill('[data-testid="email-input"]', testUsers.regularUser.email);
			await page.fill('[data-testid="password-input"]', testUsers.regularUser.password);
			await page.click('[data-testid="login-submit-button"]');

			// Go to account settings
			await page.goto('/account/settings');
			await expect(page.locator('text=Security Settings')).toBeVisible();

			// Click "Logout from all devices"
			await page.click('[data-testid="logout-all-devices-button"]');
			await page.click('[data-testid="confirm-logout-all-button"]');

			// Should be logged out
			await expect(page).toHaveURL('/login');
			await expect(page.locator('text=Logged out from all devices')).toBeVisible();
		});
	});

	test.describe('Password Reset Flow', () => {
		test('should handle password reset request', async ({ page }) => {
			await page.goto('/login');

			// Click "Forgot Password"
			await page.click('[data-testid="forgot-password-link"]');
			await expect(page).toHaveURL(/\/forgot-password/);

			// Enter email
			await page.fill('[data-testid="email-input"]', 'testuser@brainwav.ai');
			await page.click('[data-testid="reset-password-button"]');

			// Should show success message
			await expect(page.locator('text=Password reset link sent')).toBeVisible();
			await expect(page.locator('text=Check your email for instructions')).toBeVisible();

			// Verify brAInwav branding in success message
			await expect(page.locator('text=brAInwav Cortex-OS')).toBeVisible();
		});

		test('should handle password reset with valid token', async ({ page }) => {
			// Go to reset page with token
			await page.goto('/reset-password?token=mock-reset-token&email=testuser@brainwav.ai');

			// Fill new password
			await page.fill('[data-testid="new-password-input"]', 'NewSecurePassword123!');
			await page.fill('[data-testid="confirm-password-input"]', 'NewSecurePassword123!');
			await page.click('[data-testid="update-password-button"]');

			// Should show success message
			await expect(page.locator('text=Password updated successfully')).toBeVisible();

			// Should redirect to login
			await expect(page).toHaveURL('/login');
		});

		test('should handle invalid reset token', async ({ page }) => {
			await page.goto('/reset-password?token=invalid-token&email=testuser@brainwav.ai');

			// Should show error message
			await expect(page.locator('text=Invalid or expired reset link')).toBeVisible();
			await expect(page).toHaveURL('/forgot-password');
		});
	});

	test.describe('Security Validation', () => {
		test('should protect against CSRF attacks', async ({ page }) => {
			const testUsers = testDb.getTestUsers();

			// Login to get valid session
			await page.goto('/login');
			await page.fill('[data-testid="email-input"]', testUsers.regularUser.email);
			await page.fill('[data-testid="password-input"]', testUsers.regularUser.password);
			await page.click('[data-testid="login-submit-button"]');

			// Try to access protected endpoint without CSRF token
			const response = await page.request.post('/api/account/update', {
				form: {
					firstName: 'Hacked',
					lastName: 'User',
				},
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
				},
				failOnStatusCode: false,
			});

			expect(response.status()).toBe(403);
			const errorData = await response.json();
			expect(errorData.error).toContain('CSRF');
		});

		test('should implement rate limiting on login attempts', async ({ page }) => {
			// Attempt multiple failed logins
			for (let i = 0; i < 5; i++) {
				await page.goto('/login');
				await page.fill('[data-testid="email-input"]', 'test@brainwav.ai');
				await page.fill('[data-testid="password-input"]', 'wrongpassword');
				await page.click('[data-testid="login-submit-button"]');
				await page.waitForTimeout(100);
			}

			// Should show rate limiting message
			await expect(page.locator('text=Too many login attempts')).toBeVisible();
			await expect(page.locator('text=Please try again later')).toBeVisible();
		});

		test('should sanitize user input to prevent XSS', async ({ page }) => {
			await page.goto('/register');

			// Try to inject script in name field
			await page.fill('[data-testid="first-name-input"]', '<script>alert("XSS")</script>');
			await page.fill('[data-testid="last-name-input"]', 'Test');
			await page.fill('[data-testid="email-input"]', 'xss@brainwav.ai');
			await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
			await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
			await page.check('[data-testid="terms-checkbox"]');
			await page.check('[data-testid="privacy-checkbox"]');
			await page.click('[data-testid="register-submit-button"]');

			// Should not execute script
			await expect(page.locator('script')).toHaveCount(0);

			// Script should be escaped in displayed content
			await page.goto('/dashboard');
			const displayedName = await page.locator('[data-testid="user-name"]').textContent();
			expect(displayedName).not.toContain('<script>');
		});
	});

	test.describe('Role-Based Access Control', () => {
		test('should restrict admin routes to admin users', async ({ page }) => {
			const testUsers = testDb.getTestUsers();

			// Login as regular user
			await page.goto('/login');
			await page.fill('[data-testid="email-input"]', testUsers.regularUser.email);
			await page.fill('[data-testid="password-input"]', testUsers.regularUser.password);
			await page.click('[data-testid="login-submit-button"]');

			// Try to access admin panel
			await page.goto('/admin');

			// Should redirect to unauthorized page
			await expect(page).toHaveURL('/unauthorized');
			await expect(page.locator('text=Access Denied')).toBeVisible();
		});

		test('should allow admin users to access admin routes', async ({ page }) => {
			const testUsers = testDb.getTestUsers();

			// Login as admin
			await page.goto('/login');
			await page.fill('[data-testid="email-input"]', testUsers.admin.email);
			await page.fill('[data-testid="password-input"]', testUsers.admin.password);
			await page.click('[data-testid="login-submit-button"]');

			// Access admin panel
			await page.goto('/admin');

			// Should allow access
			await expect(page).toHaveURL('/admin');
			await expect(page.locator('text=Admin Dashboard')).toBeVisible();
			await expect(page.locator('text=brAInwav Administration')).toBeVisible();
		});
	});
});
