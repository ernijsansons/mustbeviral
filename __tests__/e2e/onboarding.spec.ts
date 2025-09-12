// E2E tests for onboarding flow
// LOG: ONBOARD-E2E-1 - Onboarding end-to-end tests

import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display Sign Up button in navbar', async ({ page }) => {
    // Check if Sign Up button exists
    const signUpButton = page.getByTestId('button-sign-up');
    await expect(signUpButton).toBeVisible();
    await expect(signUpButton).toHaveText('Sign Up');
  });

  test('should navigate to onboarding page when Sign Up is clicked', async ({ page }) => {
    // Click Sign Up button
    await page.getByTestId('button-sign-up').click();
    
    // Should navigate to onboarding page
    await expect(page).toHaveURL('/onboard');
    
    // Should show onboarding form
    await expect(page.getByText('Create Your Account')).toBeVisible();
    await expect(page.getByText('Join the AI-powered content revolution')).toBeVisible();
  });

  test('should display social sign-in buttons', async ({ page }) => {
    await page.goto('/onboard');
    
    // Check Google sign-in button
    const googleButton = page.getByTestId('button-google-signin');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toHaveText(/Google/);
    
    // Check Twitter sign-in button  
    const twitterButton = page.getByTestId('button-twitter-signin');
    await expect(twitterButton).toBeVisible();
    await expect(twitterButton).toHaveText(/Twitter/);
  });

  test('should show form validation errors for empty fields', async ({ page }) => {
    await page.goto('/onboard');
    
    // Try to proceed without filling required fields
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Should show validation errors
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Username is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page.getByText('Please select your role')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/onboard');
    
    // Enter invalid email
    await page.fill('#email', 'invalid-email');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Should show email format error
    await expect(page.getByText('Invalid email format')).toBeVisible();
  });

  test('should complete email signup flow', async ({ page }) => {
    await page.goto('/onboard');
    
    // Fill in Step 1: Account Setup
    await page.fill('#email', 'test@example.com');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'password123');
    
    // Select role
    await page.click('label:has-text("Content Creator")');
    
    // Proceed to Step 2
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Personalize Your Experience')).toBeVisible();
    
    // Fill in Step 2: Preferences
    await page.selectOption('#industry', 'technology');
    await page.click('label:has-text("Brand Awareness")');
    
    // Check AI autonomy slider
    const slider = page.getByTestId('slider-ai-autonomy');
    await expect(slider).toBeVisible();
    
    // Set slider to 75%
    await slider.fill('75');
    await expect(page.getByText('75%')).toBeVisible();
    await expect(page.getByText('🔮 AI-Powered - AI optimizes everything automatically')).toBeVisible();
    
    // Proceed to Step 3
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText("Let's Create Something")).toBeVisible();
    
    // Fill in Step 3: First Prompt
    await page.fill('#first-prompt', 'Create a viral LinkedIn post about AI trends in technology for software developers');
    
    // Complete setup (this would normally submit to API)
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    
    // Should show loading state initially
    await expect(page.getByText('Creating Your Account')).toBeVisible();
  });

  test('should handle OAuth redirects', async ({ page }) => {
    await page.goto('/onboard');
    
    // Mock OAuth redirect by intercepting navigation
    await page.route('/api/oauth/google', route => {
      // In a real test, this would redirect to Google OAuth
      route.fulfill({
        status: 302,
        headers: {
          'Location': 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=http://localhost:5000/api/oauth/google/callback&response_type=code'
        }
      });
    });
    
    // Click Google sign-in button
    const googleButton = page.getByTestId('button-google-signin');
    await googleButton.click();
    
    // Should attempt to navigate to OAuth endpoint
    // In a real scenario, this would redirect to Google's OAuth page
  });

  test('should be mobile responsive', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/onboard');
    
    // Check that form is still usable on mobile
    await expect(page.getByText('Create Your Account')).toBeVisible();
    await expect(page.getByTestId('button-google-signin')).toBeVisible();
    await expect(page.getByTestId('button-twitter-signin')).toBeVisible();
    
    // Check that progress bar is visible
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    
    // Social buttons should be in a grid layout
    const socialButtons = page.locator('.grid.grid-cols-2');
    await expect(socialButtons).toBeVisible();
  });

  test('should show progress bar correctly', async ({ page }) => {
    await page.goto('/onboard');
    
    // Check initial progress
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
    await expect(page.getByText('25%')).toBeVisible();
    
    // Fill step 1 and proceed
    await page.fill('#email', 'test@example.com');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'password123');
    await page.click('label:has-text("Content Creator")');
    await page.getByRole('button', { name: 'Next' }).click();
    
    // Check step 2 progress
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
    await expect(page.getByText('50%')).toBeVisible();
  });
});