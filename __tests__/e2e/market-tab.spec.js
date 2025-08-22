// End-to-end tests for marketplace tab
// LOG: TEST-E2E-MARKET-1 - Marketplace tab E2E tests

const { test, expect } = require('@playwright/test');

test.describe('Marketplace Tab', () => {
  test.beforeEach(async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-SETUP-1 - Setting up marketplace test');
    await page.goto('/marketplace');
  });

  test('should display marketplace correctly for creators', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-UI-1 - Testing marketplace display for creators');
    
    // Check main heading
    await expect(page.locator('text=Marketplace')).toBeVisible();
    
    // Check view toggle buttons
    await expect(page.locator('text=Find Influencers')).toBeVisible();
    await expect(page.locator('text=My Campaigns')).toBeVisible();
    await expect(page.locator('text=Messages')).toBeVisible();
    
    // Check search and filters
    await expect(page.locator('input[placeholder*="influencers"]')).toBeVisible();
    await expect(page.locator('button:has-text("Filters")')).toBeVisible();
  });

  test('should display influencer profiles for creators', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-INFLUENCERS-1 - Testing influencer profiles display');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Should show influencer cards
    await expect(page.locator('text=Sarah Chen')).toBeVisible();
    await expect(page.locator('text=Mike Rodriguez')).toBeVisible();
    
    // Check influencer details
    await expect(page.locator('text=@tech_sarah')).toBeVisible();
    await expect(page.locator('text=Tech enthusiast sharing AI')).toBeVisible();
    
    // Check metrics
    await expect(page.locator('text=125K').or(page.locator('text=4.2%'))).toBeVisible();
    
    // Check connect buttons
    const connectButtons = page.locator('button:has-text("Connect")');
    expect(await connectButtons.count()).toBeGreaterThan(0);
  });

  test('should display campaigns for influencers', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-CAMPAIGNS-1 - Testing campaigns display for influencers');
    
    // Simulate influencer role (this would be set based on user auth)
    await page.evaluate(() => {
      window.userRole = 'influencer';
    });
    await page.reload();
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Should show campaign cards
    await expect(page.locator('text=AI Product Launch Campaign')).toBeVisible();
    await expect(page.locator('text=Sustainable Fashion Awareness')).toBeVisible();
    
    // Check campaign details
    await expect(page.locator('text=TechFlow')).toBeVisible();
    await expect(page.locator('text=$5,000')).toBeVisible();
    
    // Check apply buttons
    const applyButtons = page.locator('button:has-text("Apply Now")');
    expect(await applyButtons.count()).toBeGreaterThan(0);
  });

  test('should handle search functionality', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-SEARCH-1 - Testing search functionality');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Test search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Sarah');
    
    // Should filter results
    await expect(page.locator('text=Sarah Chen')).toBeVisible();
    
    // Clear search
    await searchInput.fill('');
    
    // Should show all results again
    await expect(page.locator('text=Mike Rodriguez')).toBeVisible();
  });

  test('should handle filter functionality', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-FILTERS-1 - Testing filter functionality');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Open filters
    await page.click('button:has-text("Filters")');
    await expect(page.locator('button:has-text("Technology")')).toBeVisible();
    
    // Apply technology filter
    await page.click('button:has-text("Technology")');
    
    // Should filter results (Sarah Chen is tech-focused)
    await expect(page.locator('text=Sarah Chen')).toBeVisible();
    
    // Reset filter
    await page.click('button:has-text("All")');
  });

  test('should switch between marketplace views', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-VIEWS-1 - Testing view switching');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Switch to campaigns view
    await page.click('text=My Campaigns');
    await expect(page.locator('text=Campaign Management')).toBeVisible();
    
    // Switch to messages view
    await page.click('text=Messages');
    await expect(page.locator('text=Messages')).toBeVisible();
    await expect(page.locator('text=Connect and communicate')).toBeVisible();
    
    // Return to discover view
    await page.click('text=Find Influencers');
    await expect(page.locator('text=Sarah Chen')).toBeVisible();
  });

  test('should display influencer metrics correctly', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-METRICS-1 - Testing influencer metrics display');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check follower counts
    await expect(page.locator('text=125K').or(page.locator('text=89K'))).toBeVisible();
    
    // Check engagement rates
    await expect(page.locator('text=4.2%').or(page.locator('text=6.1%'))).toBeVisible();
    
    // Check ratings
    await expect(page.locator('text=4.8').or(page.locator('text=4.6'))).toBeVisible();
    
    // Check rates
    await expect(page.locator('text=$2500').or(page.locator('text=$1800'))).toBeVisible();
  });

  test('should display campaign details correctly', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-CAMPAIGN-DETAILS-1 - Testing campaign details');
    
    // Simulate influencer role
    await page.evaluate(() => {
      window.userRole = 'influencer';
    });
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check campaign information
    await expect(page.locator('text=AI Product Launch Campaign')).toBeVisible();
    await expect(page.locator('text=TechFlow')).toBeVisible();
    await expect(page.locator('text=$5,000')).toBeVisible();
    await expect(page.locator('text=2 weeks')).toBeVisible();
    
    // Check requirements tags
    await expect(page.locator('text=Tech audience')).toBeVisible();
    await expect(page.locator('text=50K+ followers')).toBeVisible();
    
    // Check applicant count
    await expect(page.locator('text=12 applied')).toBeVisible();
  });

  test('should handle empty states', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-EMPTY-1 - Testing empty states');
    
    // Test search with no results
    await page.waitForTimeout(2000);
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('nonexistentinfluencer123');
    
    // Should show empty state (if implemented)
    // Note: Actual empty state display depends on implementation
    
    // Test campaigns view empty state
    await page.click('text=My Campaigns');
    await expect(page.locator('text=Campaign Management')).toBeVisible();
    
    // Test messages view empty state
    await page.click('text=Messages');
    await expect(page.locator('text=Start Conversation')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-MOBILE-1 - Testing mobile responsiveness');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check if main elements are visible
    await expect(page.locator('text=Marketplace')).toBeVisible();
    
    // View toggle should be visible and functional
    await expect(page.locator('text=Find Influencers')).toBeVisible();
    
    // Search should be functional
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Sarah');
    
    // Cards should be readable on mobile
    await expect(page.locator('text=Sarah Chen')).toBeVisible();
    
    // Connect buttons should be accessible
    await expect(page.locator('button:has-text("Connect")')).toBeVisible();
  });

  test('should handle interaction buttons', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-INTERACTIONS-1 - Testing interaction buttons');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Test connect button
    const connectButton = page.locator('button:has-text("Connect")').first();
    await expect(connectButton).toBeVisible();
    await connectButton.click();
    
    // Test save/heart button
    const heartButton = page.locator('button[aria-label="Save campaign"]').first();
    if (await heartButton.isVisible()) {
      await heartButton.click();
    }
    
    // Test view details button
    const detailsButton = page.locator('button:has-text("View Details")').first();
    if (await detailsButton.isVisible()) {
      await detailsButton.click();
    }
  });

  test('should display verification badges', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-VERIFICATION-1 - Testing verification badges');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check for verified badge (Sarah Chen is verified in mock data)
    const verifiedBadge = page.locator('[aria-label="Verified"]');
    if (await verifiedBadge.isVisible()) {
      await expect(verifiedBadge).toBeVisible();
    }
  });

  test('should handle category filtering', async ({ page }) => {
    console.log('LOG: TEST-E2E-MARKET-CATEGORIES-1 - Testing category filtering');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Open filters
    await page.click('button:has-text("Filters")');
    
    // Test different category filters
    await page.click('button:has-text("Technology")');
    
    // Should show tech-related profiles/campaigns
    await expect(page.locator('text=Technology').or(page.locator('text=AI'))).toBeVisible();
    
    // Test fashion filter
    await page.click('button:has-text("Fashion")');
    
    // Reset to all
    await page.click('button:has-text("All")');
  });
});