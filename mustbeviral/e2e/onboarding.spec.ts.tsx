// E2E Tests: Onboarding Flow
// Critical user journey: Registration → Onboarding → Dashboard

import { _test, expect, Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// Page object for onboarding flow
class OnboardingPage {
  constructor(private page: Page) {}

  async completeStep1_ProfileSetup() {
    // Fill profile information
    await this.page.fill('[data-testid="bio"]', 'I am a content creator focused on tech and innovation.');
    await this.page.fill('[data-testid="website"]', 'https://mywebsite.com');
    await this.page.fill('[data-testid="twitter"]', '@mytwitterhandle');
    await this.page.fill('[data-testid="instagram"]', '@myinstagram');

    // Select interests
    await this.page.click('[data-testid="interest-tech"]');
    await this.page.click('[data-testid="interest-business"]');
    await this.page.click('[data-testid="interest-marketing"]');

    // Continue to next step
    await this.page.click('[data-testid="continue-button"]');
  }

  async completeStep2_AIPreferences() {
    // Set AI assistance level
    await this.page.locator('[data-testid="ai-slider"]').fill('75');

    // Select AI features to enable
    await this.page.check('[data-testid="ai-content-generation"]');
    await this.page.check('[data-testid="ai-optimization"]');
    await this.page.check('[data-testid="ai-analytics"]');

    // Set content tone
    await this.page.selectOption('[data-testid="content-tone"]', 'professional');

    // Continue to next step
    await this.page.click('[data-testid="continue-button"]');
  }

  async completeStep3_Goals() {
    // Set primary goal
    await this.page.selectOption('[data-testid="primary-goal"]', 'grow-audience');

    // Set target metrics
    await this.page.fill('[data-testid="target-followers"]', '10000');
    await this.page.fill('[data-testid="target-engagement"]', '5');

    // Set content frequency
    await this.page.selectOption('[data-testid="posting-frequency"]', 'daily');

    // Complete onboarding
    await this.page.click('[data-testid="complete-onboarding"]');
  }

  async skipOnboarding() {
    await this.page.click('[data-testid="skip-onboarding"]');
  }

  async isOnboardingComplete() {
    return await this.page.locator('[data-testid="dashboard-welcome"]').isVisible();
  }
}

test.describe('Onboarding Flow', () => {
  let onboardingPage: OnboardingPage;
  let testUser: unknown;

  test.beforeEach(async ({ page }) => {
    onboardingPage = new OnboardingPage(page);
    testUser = {
      email: `test.${randomBytes(8).toString('hex')}@mustbeviral.com`,
      username: `user_${randomBytes(4).toString('hex')}`,
      password: 'TestPassword123!',
      role: 'creator'
    };

    // Register a new user to trigger onboarding
    await page.goto('/register');
    await page.fill('[data-testid="register-email"]', testUser.email);
    await page.fill('[data-testid="register-username"]', testUser.username);
    await page.fill('[data-testid="register-password"]', testUser.password);
    await page.fill('[data-testid="register-confirm-password"]', testUser.password);
    await page.selectOption('[data-testid="register-role"]', testUser.role);
    await page.click('[data-testid="submit-button"]');

    // Wait for redirect to onboarding
    await page.waitForURL(/.*onboarding/);
  });

  test('New user is redirected to onboarding after registration', async ({ page }) => {
    // Verify we're on the onboarding page
    await expect(page).toHaveURL(/.*onboarding/);
    await expect(page.locator('[data-testid="onboarding-welcome"]')).toBeVisible();
    await expect(page.locator('[data-testid="onboarding-progress"]')).toContainText('Step 1');
  });

  test('User can complete full onboarding flow', async ({ page }) => {
    // Step 1: Profile Setup
    await expect(page.locator('[data-testid="step-title"]')).toContainText('Profile Setup');
    await onboardingPage.completeStep1_ProfileSetup();

    // Verify progression to step 2
    await expect(page.locator('[data-testid="onboarding-progress"]')).toContainText('Step 2');

    // Step 2: AI Preferences
    await expect(page.locator('[data-testid="step-title"]')).toContainText('AI Preferences');
    await onboardingPage.completeStep2_AIPreferences();

    // Verify progression to step 3
    await expect(page.locator('[data-testid="onboarding-progress"]')).toContainText('Step 3');

    // Step 3: Goals
    await expect(page.locator('[data-testid="step-title"]')).toContainText('Set Your Goals');
    await onboardingPage.completeStep3_Goals();

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();
    await expect(page.locator('[data-testid="onboarding-complete-badge"]')).toBeVisible();
  });

  test('User can skip onboarding', async ({ page }) => {
    // Click skip button
    await onboardingPage.skipOnboarding();

    // Confirm skip in modal
    await page.click('[data-testid="confirm-skip"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();

    // Verify onboarding incomplete indicator
    await expect(page.locator('[data-testid="complete-profile-prompt"]')).toBeVisible();
  });

  test('User can navigate back through onboarding steps', async ({ page }) => {
    // Complete step 1
    await onboardingPage.completeStep1_ProfileSetup();

    // Go back to step 1
    await page.click('[data-testid="back-button"]');
    await expect(page.locator('[data-testid="onboarding-progress"]')).toContainText('Step 1');

    // Verify form data is preserved
    const bioValue = await page.inputValue('[data-testid="bio"]');
    expect(bioValue).toContain('content creator');
  });

  test('Onboarding progress is saved between sessions', async ({ _page, context }) => {
    // Complete step 1
    await onboardingPage.completeStep1_ProfileSetup();

    // Store cookies
    const cookies = await context.cookies();

    // Create new context with same cookies
    const newContext = await context.browser()!.newContext();
    await newContext.addCookies(cookies);
    const newPage = await newContext.newPage();

    // Navigate to onboarding
    await newPage.goto('/onboarding');

    // Verify we're on step 2
    await expect(newPage.locator('[data-testid="onboarding-progress"]')).toContainText('Step 2');

    await newContext.close();
  });

  test('Onboarding validates required fields', async ({ page }) => {
    // Try to continue without filling required fields
    await page.click('[data-testid="continue-button"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="bio-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="bio-error"]')).toContainText(/required/i);
  });

  test('AI preference slider updates in real-time', async ({ page }) => {
    // Complete step 1 to get to AI preferences
    await onboardingPage.completeStep1_ProfileSetup();

    // Move AI slider
    const slider = page.locator('[data-testid="ai-slider"]');
    await slider.fill('25');

    // Verify UI updates
    await expect(page.locator('[data-testid="ai-level-label"]')).toContainText('Low');

    await slider.fill('75');
    await expect(page.locator('[data-testid="ai-level-label"]')).toContainText('High');

    await slider.fill('100');
    await expect(page.locator('[data-testid="ai-level-label"]')).toContainText('Maximum');
  });

  test('Completed onboarding users bypass onboarding on return', async ({ page }) => {
    // Complete onboarding
    await onboardingPage.completeStep1_ProfileSetup();
    await onboardingPage.completeStep2_AIPreferences();
    await onboardingPage.completeStep3_Goals();

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Login again
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="submit-button"]');

    // Verify direct redirect to dashboard, not onboarding
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page).not.toHaveURL(/.*onboarding/);
  });

  test('Onboarding shows role-specific options', async ({ page }) => {
    // For creator role (already set in beforeEach)
    await expect(page.locator('[data-testid="content-creation-options"]')).toBeVisible();

    // Register as influencer
    await page.goto('/register');
    const influencerUser = {
      email: `influencer.${randomBytes(8).toString('hex')}@mustbeviral.com`,
      username: `inf_${randomBytes(4).toString('hex')}`,
      password: 'TestPassword123!',
      role: 'influencer'
    };

    await page.fill('[data-testid="register-email"]', influencerUser.email);
    await page.fill('[data-testid="register-username"]', influencerUser.username);
    await page.fill('[data-testid="register-password"]', influencerUser.password);
    await page.fill('[data-testid="register-confirm-password"]', influencerUser.password);
    await page.selectOption('[data-testid="register-role"]', 'influencer');
    await page.click('[data-testid="submit-button"]');

    // Wait for onboarding
    await page.waitForURL(/.*onboarding/);

    // Verify influencer-specific options
    await expect(page.locator('[data-testid="audience-metrics-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="collaboration-preferences"]')).toBeVisible();
  });
});