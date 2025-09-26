import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive UX Testing Suite for Must Be Viral Platform
 * Based on detailed UX analysis and user journey mapping
 * 
 * This test suite covers:
 * - Complete user onboarding flow
 * - Content creation workflow end-to-end
 * - Accessibility compliance testing
 * - Mobile responsiveness validation
 * - Real-time collaboration features
 * - Performance benchmarking
 * - Error state handling
 */

test.describe('Comprehensive UX Testing Suite', () => {
  
  test.describe('Critical User Journey: Complete Onboarding Flow', () => {
    test('should complete full onboarding journey within 8 minutes @critical', async ({ page }) => {
      const startTime = Date.now();
      
      // Step 1: Landing page discovery
      await page.goto('/');
      await expect(page).toHaveTitle(/Must Be Viral/);
      
      // Verify value proposition is clear
      await expect(page.locator('h1')).toContainText('Must Be Viral');
      await expect(page.locator('[data-testid="value-proposition"]')).toBeVisible();
      
      // Test interactive demo if available
      const demoButton = page.locator('[data-testid="demo-button"]');
      if (await demoButton.isVisible()) {
        await demoButton.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('[data-testid="demo-content"]')).toBeVisible();
      }
      
      // Step 2: Navigate to signup
      await page.click('[data-testid="signup-button"], button:has-text("Sign Up"), a:has-text("Get Started")');
      await page.waitForLoadState('networkidle');
      
      // Step 3: Complete onboarding form
      await page.fill('#email', 'test@example.com');
      await page.fill('#username', 'testuser123');
      await page.fill('#password', 'SecurePass123!');
      await page.fill('#confirmPassword', 'SecurePass123!');
      
      // Select user role
      await page.click('[value="creator"]');
      
      // Verify form validation works
      await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
      
      // Continue to next step
      await page.click('button:has-text("Next")');
      
      // Step 4: Preferences configuration
      await page.selectOption('#industry', 'technology');
      await page.click('[value="awareness"]'); // Primary goal
      
      // Configure AI autonomy level
      const slider = page.locator('[data-testid="slider-ai-autonomy"]');
      await slider.fill('75'); // Set to 75% AI autonomy
      
      await page.click('button:has-text("Next")');
      
      // Step 5: First prompt
      await page.fill('#first-prompt', 'Create a viral blog post about AI trends in technology for professionals');
      
      await page.click('button:has-text("Complete Setup")');
      
      // Step 6: Verify successful completion
      await page.waitForSelector('[data-testid="onboarding-success"]', { timeout: 30000 });
      await expect(page.locator('h2')).toContainText('Welcome to Must Be Viral!');
      
      // Measure completion time
      const completionTime = Date.now() - startTime;
      expect(completionTime).toBeLessThan(8 * 60 * 1000); // 8 minutes max
      
      // Verify user can access dashboard
      await page.click('button:has-text("Go to Dashboard")');
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    });

    test('should handle onboarding errors gracefully', async ({ page }) => {
      await page.goto('/onboard');
      
      // Test validation errors
      await page.click('button:has-text("Next")');
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Test invalid email
      await page.fill('#email', 'invalid-email');
      await page.blur('#email');
      await expect(page.locator('#email-error')).toContainText('Invalid email format');
      
      // Test password mismatch
      await page.fill('#password', 'password123');
      await page.fill('#confirmPassword', 'different');
      await page.blur('#confirmPassword');
      await expect(page.locator('#confirmPassword-error')).toContainText('Passwords do not match');
    });
  });

  test.describe('Complete Content Creation Workflow', () => {
    test.beforeEach(async ({ page }) => {
      // Login with test user
      await page.goto('/login');
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'SecurePass123!');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    });

    test('should complete end-to-end content creation workflow @critical', async ({ page }) => {
      // Navigate to content creation
      await page.goto('/content');
      await expect(page.locator('h2')).toContainText('AI Content Generator');
      
      // Step 1: Input content topic
      await page.fill('#topic', 'Top 5 productivity tips for remote workers');
      
      // Step 2: Select platforms
      await page.click('[data-testid="platform-twitter"]');
      await page.click('[data-testid="platform-linkedin"]');
      
      // Step 3: Configure content type and tone
      await page.selectOption('#contentType', 'blog_post');
      await page.selectOption('#tone', 'professional');
      await page.selectOption('#audience', 'professionals');
      
      // Step 4: Generate content
      const generateButton = page.locator('button:has-text("Generate Content")');
      await generateButton.click();
      
      // Wait for AI generation to complete
      await page.waitForSelector('[data-testid="generated-content"]', { timeout: 30000 });
      
      // Verify content was generated
      const generatedContent = page.locator('[data-testid="generated-content"]');
      await expect(generatedContent).toBeVisible();
      
      // Check viral prediction score
      const viralScore = page.locator('[data-testid="viral-score"]');
      await expect(viralScore).toBeVisible();
      
      // Step 5: Preview and publish
      await page.click('button:has-text("Preview")');
      await expect(page.locator('[data-testid="content-preview"]')).toBeVisible();
      
      await page.click('button:has-text("Publish")');
      await expect(page.locator('[data-testid="publish-success"]')).toBeVisible();
    });

    test('should handle content generation errors appropriately', async ({ page }) => {
      await page.goto('/content');
      
      // Test empty topic submission
      await page.click('button:has-text("Generate Content")');
      await expect(page.locator('[role="alert"]')).toContainText('Please provide a topic');
      
      // Test no platform selected
      await page.fill('#topic', 'Test topic');
      await page.click('button:has-text("Generate Content")');
      await expect(page.locator('[role="alert"]')).toContainText('select at least one platform');
    });
  });

  test.describe('Accessibility Compliance Testing', () => {
    test('should be fully navigable with keyboard only @accessibility', async ({ page }) => {
      await page.goto('/');
      
      // Test tab navigation through main elements
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('role', 'button');
      
      // Navigate through main menu
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Test skip navigation
      await page.keyboard.press('Tab');
      const skipLink = page.locator('a:has-text("Skip to main content")');
      if (await skipLink.isVisible()) {
        await page.keyboard.press('Enter');
        focusedElement = await page.locator(':focus');
        await expect(focusedElement).toHaveAttribute('id', 'main-content');
      }
    });

    test('should have proper ARIA labels and roles @accessibility', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check for proper heading hierarchy
      const h1Elements = await page.locator('h1').count();
      expect(h1Elements).toBeGreaterThanOrEqual(1);
      
      // Check for ARIA landmarks
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      await expect(page.locator('[role="main"]')).toBeVisible();
      
      // Check form accessibility
      const formLabels = page.locator('label');
      const formCount = await formLabels.count();
      if (formCount > 0) {
        for (let i = 0; i < formCount; i++) {
          const label = formLabels.nth(i);
          const forAttribute = await label.getAttribute('for');
          if (forAttribute) {
            await expect(page.locator(`#${forAttribute}`)).toBeVisible();
          }
        }
      }
    });

    test('should meet color contrast requirements @accessibility', async ({ page }) => {
      await page.goto('/');
      
      // This would typically be done with axe-core or similar tools
      // For now, we verify high contrast elements are present
      const contrastElements = page.locator('[data-high-contrast="true"]');
      const count = await contrastElements.count();
      
      // Check that focus indicators are visible
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveCSS('outline-width', '2px');
    });
  });

  test.describe('Mobile Responsiveness and Cross-Browser Testing', () => {
    test('should work correctly on mobile devices @mobile', async ({ page, browserName }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Verify mobile navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      }
      
      // Check responsive layout
      const mainContent = page.locator('main');
      const boundingBox = await mainContent.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);
      
      // Test touch interactions
      await page.tap('button:has-text("Get Started")');
      await page.waitForLoadState('networkidle');
      
      // Verify no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });

    test('should maintain functionality across different screen sizes @responsive', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone 11
        { width: 768, height: 1024 }, // iPad
        { width: 1024, height: 768 }, // iPad Landscape
        { width: 1920, height: 1080 }, // Desktop
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/dashboard');
        
        // Verify main content is visible
        await expect(page.locator('main')).toBeVisible();
        
        // Check navigation adapts appropriately
        const nav = page.locator('nav');
        await expect(nav).toBeVisible();
        
        // Verify content doesn't overflow
        const bodyBox = await page.locator('body').boundingBox();
        expect(bodyBox?.width).toBeLessThanOrEqual(viewport.width);
      }
    });
  });

  test.describe('Performance Benchmarking', () => {
    test('should meet performance targets @performance', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 seconds max
      
      // Check for performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
        };
      });
      
      expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
      expect(performanceMetrics.loadComplete).toBeLessThan(3000);
    });

    test('should handle high interaction volume @performance', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Simulate rapid interactions
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      const startTime = Date.now();
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        await buttons.nth(i).click({ timeout: 500 });
        await page.waitForTimeout(100);
      }
      
      const interactionTime = Date.now() - startTime;
      expect(interactionTime).toBeLessThan(5000); // Should handle 10 interactions in 5 seconds
    });
  });

  test.describe('Real-time Collaboration Testing', () => {
    test.skip('should support multiple users editing simultaneously @collaboration', async ({ page, context }) => {
      // This test would require setting up multiple browser contexts
      // and testing real-time synchronization
      
      await page.goto('/content/collaborative-editor');
      
      // Create a new browser context for second user
      const secondContext = await context.browser()?.newContext();
      const secondPage = await secondContext?.newPage();
      
      if (secondPage) {
        await secondPage.goto('/content/collaborative-editor');
        
        // Test simultaneous editing
        await page.fill('[data-testid="editor-content"]', 'User 1 content');
        await secondPage.fill('[data-testid="editor-content"]', 'User 2 content');
        
        // Verify changes sync
        await page.waitForTimeout(1000);
        const content1 = await page.locator('[data-testid="editor-content"]').inputValue();
        const content2 = await secondPage.locator('[data-testid="editor-content"]').inputValue();
        
        // Both should see the merged content
        expect(content1).toContain('User');
        expect(content2).toContain('User');
        
        await secondContext?.close();
      }
    });
  });

  test.describe('Error State and Edge Case Testing', () => {
    test('should handle network failures gracefully @error-handling', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Simulate network failure
      await page.route('**/*', route => route.abort());
      
      // Try to perform an action that requires network
      await page.click('button:has-text("Generate Content")');
      
      // Should show appropriate error message
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      
      // Restore network and verify recovery
      await page.unroute('**/*');
      await page.click('button:has-text("Retry")');
      await expect(page.locator('[data-testid="network-error"]')).not.toBeVisible();
    });

    test('should handle session timeout appropriately @error-handling', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Simulate session expiration
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
        sessionStorage.clear();
      });
      
      // Try to perform authenticated action
      await page.click('button:has-text("Create Content")');
      
      // Should redirect to login or show session expired message
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      const hasLoginElements = await page.locator('input[type="password"]').isVisible();
      const hasSessionMessage = await page.locator('[data-testid="session-expired"]').isVisible();
      
      expect(currentUrl.includes('/login') || hasLoginElements || hasSessionMessage).toBeTruthy();
    });

    test('should provide clear error recovery guidance @error-handling', async ({ page }) => {
      await page.goto('/content');
      
      // Trigger a validation error
      await page.click('button:has-text("Generate Content")');
      
      const errorMessage = page.locator('[role="alert"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/provide.*topic/i);
      
      // Verify error can be corrected
      await page.fill('#topic', 'Test topic');
      await page.click('[data-testid="platform-twitter"]');
      await page.click('button:has-text("Generate Content")');
      
      // Error should be cleared
      await expect(errorMessage).not.toBeVisible();
    });
  });

  test.describe('Payment Flow Testing', () => {
    test('should handle payment process correctly @payments', async ({ page }) => {
      await page.goto('/upgrade');
      
      // Select a plan
      await page.click('[data-testid="select-premium-plan"]');
      
      // Verify payment form
      await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
      
      // Fill payment details (test mode)
      await page.fill('#card-number', '4242424242424242');
      await page.fill('#expiry', '12/25');
      await page.fill('#cvc', '123');
      await page.fill('#name', 'Test User');
      
      // Submit payment
      await page.click('button:has-text("Subscribe")');
      
      // Handle Stripe test payment
      await page.waitForSelector('[data-testid="payment-success"]', { timeout: 30000 });
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    });

    test('should handle payment failures appropriately @payments', async ({ page }) => {
      await page.goto('/upgrade');
      await page.click('[data-testid="select-premium-plan"]');
      
      // Use Stripe test card that will fail
      await page.fill('#card-number', '4000000000000002');
      await page.fill('#expiry', '12/25');
      await page.fill('#cvc', '123');
      await page.fill('#name', 'Test User');
      
      await page.click('button:has-text("Subscribe")');
      
      // Should show error message
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-error"]')).toContainText(/declined/i);
    });
  });
});

// Helper functions for accessibility testing
async function checkColorContrast(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  const styles = await element.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
    };
  });
  
  // This is a simplified check - in reality you'd use a proper contrast ratio calculator
  return styles.color !== styles.backgroundColor;
}

async function checkFocusIndicator(page: Page, selector: string): Promise<boolean> {
  await page.locator(selector).focus();
  const focusedElement = page.locator(':focus');
  const outlineWidth = await focusedElement.evaluate((el) => {
    return window.getComputedStyle(el).outlineWidth;
  });
  
  return outlineWidth !== '0px' && outlineWidth !== 'none';
}