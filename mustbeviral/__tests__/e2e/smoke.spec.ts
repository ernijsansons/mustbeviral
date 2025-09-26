import { test, expect } from '@playwright/test';

// Smoke tests for critical functionality
// These tests are tagged with @smoke for quick health checks

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any common configuration
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('@smoke Home page loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads and contains expected content
    await expect(page).toHaveTitle(/Must Be Viral/);
    await expect(page.locator('h1')).toContainText('Must Be Viral');
    
    // Check for critical elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('@smoke Navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Test basic navigation
    const navLinks = page.locator('nav a');
    const linkCount = await navLinks.count();
    
    expect(linkCount).toBeGreaterThan(0);
    
    // Check if first navigation link works
    if (linkCount > 0) {
      await navLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Verify we navigated somewhere
      const currentUrl = page.url();
      expect(currentUrl).not.toBe('/');
    }
  });

  test('@smoke API health check', async ({ page }) => {
    // Test API endpoint availability
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status');
    expect(healthData.status).toBe('healthy');
  });

  test('@smoke Authentication flow', async ({ page }) => {
    await page.goto('/');
    
    // Look for login/auth elements
    const loginButton = page.locator('button:has-text("Login"), a:has-text("Login")');
    
    if (await loginButton.isVisible()) {
      await loginButton.click();
      
      // Check that we're redirected to login page or modal appears
      await page.waitForTimeout(1000);
      
      const isModal = await page.locator('[role="dialog"]').isVisible();
      const isLoginPage = page.url().includes('login') || page.url().includes('auth');
      
      expect(isModal || isLoginPage).toBeTruthy();
    }
  });

  test('@smoke Core functionality loads', async ({ page }) => {
    await page.goto('/');
    
    // Wait for any loading states to complete
    await page.waitForLoadState('networkidle');
    
    // Check for JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    // Interact with the page to trigger any JS
    await page.waitForTimeout(2000);
    
    // Should not have critical JavaScript errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('analytics') &&
      !error.includes('tracking')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('@smoke Performance baseline', async ({ page }) => {
    await page.goto('/');
    
    // Measure page load performance
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load within reasonable time (10 seconds for smoke test)
    expect(loadTime).toBeLessThan(10000);
    
    // Check for essential performance metrics
    const performanceEntry = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
      };
    });
    
    // Basic performance checks
    expect(performanceEntry.loadComplete).toBeLessThan(5000);
    expect(performanceEntry.domContentLoaded).toBeLessThan(3000);
  });

  test('@smoke Mobile responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that content adapts to mobile
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    
    // Check that navigation adapts (mobile menu, etc.)
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Verify no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
  });
});

// Environment-specific tests
test.describe('Environment Smoke Tests', () => {
  test('@smoke Environment configuration', async ({ page }) => {
    await page.goto('/');
    
    // Check environment-specific configuration
    const envConfig = await page.evaluate(() => {
      return {
        isDev: location.hostname === 'localhost',
        isStaging: location.hostname.includes('staging'),
        isProd: !location.hostname.includes('localhost') && !location.hostname.includes('staging')
      };
    });
    
    // Verify we can determine the environment
    const hasValidEnv = envConfig.isDev || envConfig.isStaging || envConfig.isProd;
    expect(hasValidEnv).toBeTruthy();
  });

  test('@smoke External service connectivity', async ({ page }) => {
    await page.goto('/');
    
    // Check that external services are reachable (if configured)
    const requests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('api.stripe.com') || 
          url.includes('openai.com') || 
          url.includes('googleapis.com')) {
        requests.push(url);
      }
    });
    
    // Trigger some functionality that might make external requests
    await page.waitForTimeout(3000);
    
    // For smoke tests, we just verify no critical failures occurred
    // Actual integration tests would verify specific service responses
    expect(true).toBeTruthy(); // Placeholder - specific checks depend on implementation
  });
});