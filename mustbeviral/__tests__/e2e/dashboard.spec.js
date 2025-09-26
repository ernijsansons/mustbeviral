// End-to-end tests for dashboard component
// LOG: TEST-E2E-DASHBOARD-1 - Dashboard E2E tests

const { test, expect } = require('@playwright/test');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-SETUP-1 - Setting up dashboard test');
    await page.goto('/dashboard');
  });

  test('should display dashboard overview correctly', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-UI-1 - Testing dashboard overview display');
    
    // Check main heading
    await expect(page.locator('text=Dashboard Overview')).toBeVisible();
    
    // Check stats cards
    await expect(page.locator('text=Content')).toBeVisible();
    await expect(page.locator('text=Views')).toBeVisible();
    await expect(page.locator('text=Engagement')).toBeVisible();
    await expect(page.locator('text=Strategies')).toBeVisible();
    
    // Check recent content section
    await expect(page.locator('text=Recent Content')).toBeVisible();
  });

  test('should navigate between tabs on desktop', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-TABS-1 - Testing desktop tab navigation');
    
    // Click on Content tab
    await page.click('button:has-text("Content")');
    await expect(page.locator('text=Content Library')).toBeVisible();
    
    // Click on Strategies tab
    await page.click('button:has-text("Strategies")');
    await expect(page.locator('text=Active Strategies')).toBeVisible();
    
    // Click on Analytics tab
    await page.click('button:has-text("Analytics")');
    await expect(page.locator('text=Analytics')).toBeVisible();
    
    // Return to Overview
    await page.click('button:has-text("Overview")');
    await expect(page.locator('text=Dashboard Overview')).toBeVisible();
  });

  test('should display mobile navigation correctly', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-MOBILE-1 - Testing mobile navigation');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile header
    await expect(page.locator('text=Must Be Viral')).toBeVisible();
    
    // Check mobile menu button
    const menuButton = page.locator('button[aria-label="Toggle menu"]');
    await expect(menuButton).toBeVisible();
    
    // Open mobile menu
    await menuButton.click();
    await expect(page.locator('[role="navigation"][aria-label="Main navigation"]')).toBeVisible();
    
    // Check navigation items
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button:has-text("Content")')).toBeVisible();
    await expect(page.locator('button:has-text("Strategies")')).toBeVisible();
    await expect(page.locator('button:has-text("Analytics")')).toBeVisible();
  });

  test('should use mobile bottom navigation', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-MOBILE-2 - Testing mobile bottom navigation');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check bottom navigation
    const bottomNav = page.locator('[role="navigation"][aria-label="Bottom navigation"]');
    await expect(bottomNav).toBeVisible();
    
    // Test tab switching via bottom nav
    await page.click('button[aria-label="Switch to Content tab"]');
    await expect(page.locator('text=Content Library')).toBeVisible();
    
    await page.click('button[aria-label="Switch to Strategies tab"]');
    await expect(page.locator('text=Active Strategies')).toBeVisible();
    
    await page.click('button[aria-label="Switch to Overview tab"]');
    await expect(page.locator('text=Dashboard Overview')).toBeVisible();
  });

  test('should display stats cards with data', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-STATS-1 - Testing stats cards display');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check that stats have numerical values
    const statsCards = page.locator('.bg-white.rounded-lg.shadow');
    const count = await statsCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
    
    // Check specific stats
    await expect(page.locator('text=12').or(page.locator('text=8.4K')).or(page.locator('text=642'))).toBeVisible();
  });

  test('should display recent content list', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-CONTENT-1 - Testing recent content display');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check recent content section
    await expect(page.locator('text=Recent Content')).toBeVisible();
    
    // Should show content items
    await expect(page.locator('text=AI Revolution in Content Creation')).toBeVisible();
    await expect(page.locator('text=Future of Social Media Marketing')).toBeVisible();
    
    // Check status badges
    await expect(page.locator('text=Published')).toBeVisible();
    await expect(page.locator('text=Draft')).toBeVisible();
  });

  test('should display active strategies', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-STRATEGIES-1 - Testing active strategies display');
    
    // Navigate to strategies tab
    await page.click('button:has-text("Strategies")');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check strategies section
    await expect(page.locator('text=Active Strategies')).toBeVisible();
    
    // Should show strategy cards
    await expect(page.locator('text=Viral Brand Awareness')).toBeVisible();
    await expect(page.locator('text=Affiliate Funnel Setup')).toBeVisible();
    
    // Check progress bars
    const progressBars = page.locator('.bg-indigo-600.h-2.rounded-full');
    expect(await progressBars.count()).toBeGreaterThan(0);
  });

  test('should handle loading states', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-LOADING-1 - Testing loading states');
    
    // Should show loading state initially
    await expect(page.locator('text=Loading your dashboard...')).toBeVisible();
    
    // Loading should disappear
    await expect(page.locator('text=Loading your dashboard...')).not.toBeVisible({ timeout: 10000 });
    
    // Should show dashboard content
    await expect(page.locator('text=Dashboard Overview')).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-A11Y-1 - Testing keyboard accessibility');
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Tab through navigation elements
    await page.keyboard.press('Tab');
    
    // Should be able to navigate to create button
    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("Create")').or(page.locator('button:has-text("New Content")'))).toBeFocused();
    
    // Test keyboard navigation in sidebar (desktop)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Tab to sidebar navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Use arrow keys or Enter to navigate
    await page.keyboard.press('Enter');
  });

  test('should handle mobile menu interactions', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-MOBILE-3 - Testing mobile menu interactions');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');
    
    // Navigate to different sections
    await page.click('button:has-text("Content")');
    await expect(page.locator('text=Content Library')).toBeVisible();
    
    // Menu should close after selection
    await expect(page.locator('[role="navigation"][aria-label="Main navigation"]')).not.toBeVisible();
  });

  test('should display create buttons and actions', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-ACTIONS-1 - Testing action buttons');
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Check create button in overview
    await expect(page.locator('button:has-text("Create")')).toBeVisible();
    
    // Navigate to content tab
    await page.click('button:has-text("Content")');
    await expect(page.locator('button:has-text("New Content")')).toBeVisible();
    
    // Navigate to strategies tab
    await page.click('button:has-text("Strategies")');
    await expect(page.locator('button:has-text("New Strategy")')).toBeVisible();
  });

  test('should handle search functionality', async ({ page }) => {
    console.log('LOG: TEST-E2E-DASHBOARD-SEARCH-1 - Testing search functionality');
    
    // Navigate to content tab
    await page.click('button:has-text("Content")');
    
    // Check search input
    const searchInput = page.locator('input[placeholder="Search content..."]');
    await expect(searchInput).toBeVisible();
    
    // Test search input
    await searchInput.fill('AI Revolution');
    await expect(searchInput).toHaveValue('AI Revolution');
  });
});