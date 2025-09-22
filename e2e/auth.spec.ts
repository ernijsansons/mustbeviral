// E2E Tests: Authentication Flow
// Critical user journey: Registration → Login → Logout

import { _test, expect, Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// Test data helpers
const generateTestUser = () => ({
  email: `test.${randomBytes(8).toString('hex')}@mustbeviral.com`,
  username: `user_${randomBytes(4).toString('hex')}`,
  password: 'TestPassword123!',
  role: 'creator'
});

// Page object for auth pages
class AuthPage {
  constructor(private page: Page) {}

  async navigateToRegister() {
    await this.page.goto('/register');
    await expect(this.page).toHaveURL(/.*register/);
  }

  async navigateToLogin() {
    await this.page.goto('/login');
    await expect(this.page).toHaveURL(/.*login/);
  }

  async fillRegistrationForm(user: unknown) {
    await this.page.fill('[data-testid="register-email"]', user.email);
    await this.page.fill('[data-testid="register-username"]', user.username);
    await this.page.fill('[data-testid="register-password"]', user.password);
    await this.page.fill('[data-testid="register-confirm-password"]', user.password);
    await this.page.selectOption('[data-testid="register-role"]', user.role);
  }

  async fillLoginForm(email: string, password: string) {
    await this.page.fill('[data-testid="login-email"]', email);
    await this.page.fill('[data-testid="login-password"]', password);
  }

  async submitForm() {
    await this.page.click('[data-testid="submit-button"]');
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
  }
}

test.describe('Authentication Flow', () => {
  let authPage: AuthPage;
  let testUser: ReturnType<typeof generateTestUser>;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    testUser = generateTestUser();
  });

  test('User can register a new account', async ({ page }) => {
    // Navigate to registration page
    await authPage.navigateToRegister();

    // Fill registration form
    await authPage.fillRegistrationForm(testUser);

    // Submit form
    await authPage.submitForm();

    // Verify registration success
    await expect(page).toHaveURL(/.*dashboard|onboarding/);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome');

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('User can login with valid credentials', async ({ page }) => {
    // First register a user
    await authPage.navigateToRegister();
    await authPage.fillRegistrationForm(testUser);
    await authPage.submitForm();

    // Logout
    await authPage.logout();

    // Navigate to login page
    await authPage.navigateToLogin();

    // Fill login form
    await authPage.fillLoginForm(testUser.email, testUser.password);

    // Submit form
    await authPage.submitForm();

    // Verify login success
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('User cannot login with invalid credentials', async ({ page }) => {
    // Navigate to login page
    await authPage.navigateToLogin();

    // Fill login form with invalid credentials
    await authPage.fillLoginForm('invalid@example.com', 'WrongPassword');

    // Submit form
    await authPage.submitForm();

    // Verify login failure
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid credentials|Authentication failed/i);
    await expect(page).toHaveURL(/.*login/);
  });

  test('User can logout successfully', async ({ page }) => {
    // Register and login
    await authPage.navigateToRegister();
    await authPage.fillRegistrationForm(testUser);
    await authPage.submitForm();

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Logout
    await authPage.logout();

    // Verify logout success
    await expect(page).toHaveURL(/.*/(login|$)/);
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
  });

  test('Registration validates required fields', async ({ page }) => {
    // Navigate to registration page
    await authPage.navigateToRegister();

    // Try to submit empty form
    await authPage.submitForm();

    // Verify validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="username-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('Registration validates email format', async ({ page }) => {
    // Navigate to registration page
    await authPage.navigateToRegister();

    // Fill form with invalid email
    await page.fill('[data-testid="register-email"]', 'invalidemail');
    await authPage.submitForm();

    // Verify email validation error
    await expect(page.locator('[data-testid="email-error"]')).toContainText(/valid email|invalid/i);
  });

  test('Registration validates password strength', async ({ page }) => {
    // Navigate to registration page
    await authPage.navigateToRegister();

    // Fill form with weak password
    await page.fill('[data-testid="register-email"]', testUser.email);
    await page.fill('[data-testid="register-username"]', testUser.username);
    await page.fill('[data-testid="register-password"]', 'weak');
    await page.fill('[data-testid="register-confirm-password"]', 'weak');
    await authPage.submitForm();

    // Verify password validation error
    await expect(page.locator('[data-testid="password-error"]')).toContainText(/strong|requirements/i);
  });

  test('Registration validates password confirmation', async ({ page }) => {
    // Navigate to registration page
    await authPage.navigateToRegister();

    // Fill form with mismatched passwords
    await page.fill('[data-testid="register-email"]', testUser.email);
    await page.fill('[data-testid="register-username"]', testUser.username);
    await page.fill('[data-testid="register-password"]', 'TestPassword123!');
    await page.fill('[data-testid="register-confirm-password"]', 'DifferentPassword123!');
    await authPage.submitForm();

    // Verify password mismatch error
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText(/match/i);
  });

  test('Protected routes redirect to login when not authenticated', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');

    // Verify redirect to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('Session persists across page refreshes', async ({ page }) => {
    // Register and login
    await authPage.navigateToRegister();
    await authPage.fillRegistrationForm(testUser);
    await authPage.submitForm();

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Refresh page
    await page.reload();

    // Verify user is still logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });
});