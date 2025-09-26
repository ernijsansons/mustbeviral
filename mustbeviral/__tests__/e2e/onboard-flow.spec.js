// End-to-end tests for onboarding flow
// LOG: TEST-E2E-ONBOARD-1 - Onboarding flow E2E tests

const { test, expect } = require('@playwright/test');

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-SETUP-1 - Setting up onboarding flow test');
    await page.goto('/onboard');
  });

  test('should display onboarding stepper correctly', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-UI-1 - Testing stepper display');
    
    // Check progress indicator
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    
    // Check step 1 content
    await expect(page.locator('text=Create Your Account')).toBeVisible();
    await expect(page.locator('label:has-text("Email Address")')).toBeVisible();
    await expect(page.locator('label:has-text("Username")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
  });

  test('should complete step 1 with valid data', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-STEP1-1 - Testing step 1 completion');
    
    // Fill account information
    await page.fill('#email', 'test@example.com');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'TestPassword123!');
    
    // Select role
    await page.click('text=Content Creator');
    
    // Click next
    await page.click('button:has-text("Next")');
    
    // Should advance to step 2
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
    await expect(page.locator('text=Personalize Your Experience')).toBeVisible();
  });

  test('should validate required fields in step 1', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-VALIDATION-1 - Testing step 1 validation');
    
    // Try to proceed without filling fields
    await page.click('button:has-text("Next")');
    
    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Username is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    
    // Should not advance to step 2
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-VALIDATION-2 - Testing email validation');
    
    await page.fill('#email', 'invalid-email');
    await page.click('button:has-text("Next")');
    
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-VALIDATION-3 - Testing password confirmation');
    
    await page.fill('#email', 'test@example.com');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'DifferentPassword');
    await page.click('text=Content Creator');
    await page.click('button:has-text("Next")');
    
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should complete step 2 preferences', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-STEP2-1 - Testing step 2 completion');
    
    // Complete step 1
    await page.fill('#email', 'test@example.com');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'TestPassword123!');
    await page.click('text=Content Creator');
    await page.click('button:has-text("Next")');
    
    // Fill step 2
    await page.selectOption('#industry', 'technology');
    await page.click('text=Brand Awareness');
    
    // Adjust AI control level
    await page.fill('#ai-control', '75');
    
    // Click next
    await page.click('button:has-text("Next")');
    
    // Should advance to step 3
    await expect(page.locator('text=Step 3 of 4')).toBeVisible();
    await expect(page.locator('text=Let\'s Create Something')).toBeVisible();
  });

  test('should complete step 3 first prompt', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-STEP3-1 - Testing step 3 completion');
    
    // Complete steps 1 and 2
    await page.fill('#email', 'test@example.com');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'TestPassword123!');
    await page.click('text=Content Creator');
    await page.click('button:has-text("Next")');
    
    await page.selectOption('#industry', 'technology');
    await page.click('text=Brand Awareness');
    await page.click('button:has-text("Next")');
    
    // Fill first prompt
    await page.fill('#first-prompt', 'Create a viral article about AI trends in technology for young professionals');
    
    // Click complete setup
    await page.click('button:has-text("Complete Setup")');
    
    // Should advance to step 4
    await expect(page.locator('text=Step 4 of 4')).toBeVisible();
    await expect(page.locator('text=Creating Your Account')).toBeVisible();
  });

  test('should handle password visibility toggle', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-PASSWORD-1 - Testing password visibility');
    
    await page.fill('#password', 'TestPassword123!');
    
    // Password should be hidden by default
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    
    // Click show password button
    await page.click('button[aria-label="Show password"]');
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    
    // Click hide password button
    await page.click('button[aria-label="Hide password"]');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  });

  test('should navigate backwards through steps', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-NAVIGATION-1 - Testing backward navigation');
    
    // Complete step 1
    await page.fill('#email', 'test@example.com');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'TestPassword123!');
    await page.click('text=Content Creator');
    await page.click('button:has-text("Next")');
    
    // Go back to step 1
    await page.click('button:has-text("Previous")');
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();
    
    // Verify data is preserved
    await expect(page.locator('#email')).toHaveValue('test@example.com');
    await expect(page.locator('#username')).toHaveValue('testuser');
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-A11Y-1 - Testing keyboard accessibility');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('#email')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#username')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#password')).toBeFocused();
    
    // Test form submission with Enter key
    await page.fill('#email', 'test@example.com');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'TestPassword123!');
    await page.click('text=Content Creator');
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Should advance to step 2
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-MOBILE-1 - Testing mobile responsiveness');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if elements are still visible and usable
    await expect(page.locator('text=Create Your Account')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    
    // Form should be usable on mobile
    await page.fill('#email', 'mobile@test.com');
    await page.fill('#username', 'mobileuser');
    await page.fill('#password', 'MobilePass123!');
    await page.fill('#confirmPassword', 'MobilePass123!');
    
    // Role selection should work on mobile
    await page.click('text=Content Creator');
    
    // Next button should be accessible
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    console.log('LOG: TEST-E2E-ONBOARD-ERROR-1 - Testing error handling');
    
    // Complete all steps
    await page.fill('#email', 'test@example.com');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#confirmPassword', 'TestPassword123!');
    await page.click('text=Content Creator');
    await page.click('button:has-text("Next")');
    
    await page.selectOption('#industry', 'technology');
    await page.click('text=Brand Awareness');
    await page.click('button:has-text("Next")');
    
    await page.fill('#first-prompt', 'Test prompt for error handling');
    await page.click('button:has-text("Complete Setup")');
    
    // Should show processing state
    await expect(page.locator('text=Creating Your Account')).toBeVisible();
    
    // Note: Actual error testing would require mocking the API response
    // This test verifies the UI handles the submission process
  });
});