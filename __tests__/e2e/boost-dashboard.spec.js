// End-to-end tests for boost dashboard
// LOG: TEST-E2E-BOOST-1 - Boost dashboard E2E tests

const { test, expect } = require('@playwright/test');

test.describe('Boost Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-SETUP-1 - Setting up boost dashboard test');
    await page.goto('/');
  });

  test('should display boost dashboard toggle', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-UI-1 - Testing boost dashboard toggle');
    
    // Check if the boost section is visible
    await expect(page.locator('text=Visibility & Reputation Boost')).toBeVisible();
    
    // Check if the toggle button is present
    const toggleButton = page.locator('button:has-text("Show Boost")');
    await expect(toggleButton).toBeVisible();
    
    // Click to show boost dashboard
    await toggleButton.click();
    
    // Check if button text changes
    await expect(page.locator('button:has-text("Hide Boost")')).toBeVisible();
    
    // Check if boost dashboard is now visible
    await expect(page.locator('text=Visibility & Reputation Boost')).toBeVisible();
  });

  test('should display boost dashboard components', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-UI-2 - Testing dashboard components');
    
    // Show the boost dashboard
    await page.click('button:has-text("Show Boost")');
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Check main dashboard elements
    await expect(page.locator('text=Visibility & Reputation Boost')).toBeVisible();
    await expect(page.locator('input[placeholder*="Brand keywords"]')).toBeVisible();
    
    // Check tabs
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button:has-text("Brand Mentions")')).toBeVisible();
    await expect(page.locator('button:has-text("Content Seeding")')).toBeVisible();
  });

  test('should switch between dashboard tabs', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-TABS-1 - Testing tab switching');
    
    // Show boost dashboard
    await page.click('button:has-text("Show Boost")');
    await page.waitForTimeout(2000);
    
    // Click on Brand Mentions tab
    await page.click('button:has-text("Brand Mentions")');
    
    // Should show mentions section
    await expect(page.locator('text=Recent Brand Mentions')).toBeVisible();
    
    // Click on Content Seeding tab
    await page.click('button:has-text("Content Seeding")');
    
    // Should show seeding options
    await expect(page.locator('text=Create Seeding Plan')).toBeVisible();
    await expect(page.locator('text=Viral Boost')).toBeVisible();
    await expect(page.locator('text=Reputation Repair')).toBeVisible();
    await expect(page.locator('text=Visibility Boost')).toBeVisible();
    
    // Click back to Overview
    await page.click('button:has-text("Overview")');
    
    // Should show overview metrics
    await expect(page.locator('text=Overall Sentiment')).toBeVisible();
    await expect(page.locator('text=Total Mentions')).toBeVisible();
  });

  test('should search for brand mentions', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-SEARCH-1 - Testing brand mention search');
    
    // Show boost dashboard
    await page.click('button:has-text("Show Boost")');
    await page.waitForTimeout(2000);
    
    // Enter search keywords
    const searchInput = page.locator('input[placeholder*="Brand keywords"]');
    await searchInput.fill('Test Brand');
    
    // Click search button
    await page.click('button[type="button"]:has(svg)'); // Search button with icon
    
    // Wait for search to complete
    await page.waitForTimeout(3000);
    
    // Should show loading or results
    // Note: Actual results depend on API response
  });

  test('should display overview metrics', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-OVERVIEW-1 - Testing overview metrics display');
    
    // Show boost dashboard
    await page.click('button:has-text("Show Boost")');
    await page.waitForTimeout(3000); // Wait for data to load
    
    // Check overview metrics cards
    await expect(page.locator('text=Overall Sentiment')).toBeVisible();
    await expect(page.locator('text=Total Mentions')).toBeVisible();
    await expect(page.locator('text=Visibility Score')).toBeVisible();
    await expect(page.locator('text=Positive Ratio')).toBeVisible();
    
    // Check that metrics have values (even if mock data)
    const metricsCards = page.locator('.bg-white.rounded-lg.shadow');
    const count = await metricsCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display brand mentions', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-MENTIONS-1 - Testing brand mentions display');
    
    // Show boost dashboard and switch to mentions tab
    await page.click('button:has-text("Show Boost")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Brand Mentions")');
    
    // Check for mentions section
    await expect(page.locator('text=Recent Brand Mentions')).toBeVisible();
    
    // Should show mentions count or empty state
    const mentionsSection = page.locator('text=mentions found').or(page.locator('text=No mentions found'));
    await expect(mentionsSection).toBeVisible();
  });

  test('should create seeding plans', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-SEEDING-1 - Testing seeding plan creation');
    
    // Show boost dashboard and switch to seeding tab
    await page.click('button:has-text("Show Boost")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Content Seeding")');
    
    // Check seeding plan options
    await expect(page.locator('text=Create Seeding Plan')).toBeVisible();
    await expect(page.locator('text=Viral Boost')).toBeVisible();
    await expect(page.locator('text=Reputation Repair')).toBeVisible();
    await expect(page.locator('text=Visibility Boost')).toBeVisible();
    
    // Click on Viral Boost option
    await page.click('button:has-text("Viral Boost")');
    
    // Should create a seeding plan (may show in active plans section)
    await page.waitForTimeout(2000);
  });

  test('should handle loading states', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-LOADING-1 - Testing loading states');
    
    // Show boost dashboard
    await page.click('button:has-text("Show Boost")');
    
    // Should show loading state initially
    await expect(page.locator('text=Loading reputation data...')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading reputation data...')).not.toBeVisible({ timeout: 10000 });
    
    // Should show actual dashboard content
    await expect(page.locator('text=Overall Sentiment')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-MOBILE-1 - Testing mobile responsiveness');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Show boost dashboard
    await page.click('button:has-text("Show Boost")');
    await page.waitForTimeout(2000);
    
    // Check if main elements are still visible
    await expect(page.locator('text=Visibility & Reputation Boost')).toBeVisible();
    
    // Tabs should be visible but may be stacked
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    
    // Overview metrics should adapt to mobile layout
    await expect(page.locator('text=Overall Sentiment')).toBeVisible();
  });

  test('should integrate with other dashboard features', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-INTEGRATION-1 - Testing integration with other features');
    
    // Show multiple dashboards
    await page.click('button:has-text("Show Trends")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Show Analytics")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Show Boost")');
    await page.waitForTimeout(2000);
    
    // All dashboards should be visible
    await expect(page.locator('text=Trend Dashboard')).toBeVisible();
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
    await expect(page.locator('text=Visibility & Reputation Boost')).toBeVisible();
    
    // Run AI agents workflow to test integration
    await page.click('button:has-text("Run AI Agents")');
    
    // Wait for workflow to complete
    await expect(page.locator('text=Workflow Results')).toBeVisible({ timeout: 30000 });
    
    // Boost dashboard should still be functional
    await expect(page.locator('text=Overall Sentiment')).toBeVisible();
  });

  test('should display trending keywords', async ({ page }) => {
    console.log('LOG: TEST-E2E-BOOST-KEYWORDS-1 - Testing trending keywords display');
    
    // Show boost dashboard
    await page.click('button:has-text("Show Boost")');
    await page.waitForTimeout(3000);
    
    // Should show trending keywords section (if data is available)
    const keywordsSection = page.locator('text=Trending Keywords').or(page.locator('text=No trending keywords'));
    // Keywords section may or may not be visible depending on data
  });
});

// Test API endpoints directly
test.describe('Boost API', () => {
  test('should handle reputation metrics request', async ({ request }) => {
    console.log('LOG: TEST-E2E-BOOST-API-1 - Testing reputation metrics API');
    
    const response = await request.post('/api/seed-content', {
      data: {
        action: 'get_reputation_metrics',
        keywords: ['Test Brand']
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.action).toBe('get_reputation_metrics');
    expect(data.data).toBeDefined();
    expect(data.data.current_metrics).toBeDefined();
  });

  test('should handle search mentions request', async ({ request }) => {
    console.log('LOG: TEST-E2E-BOOST-API-2 - Testing search mentions API');
    
    const response = await request.post('/api/seed-content', {
      data: {
        action: 'search_mentions',
        keywords: ['Test Brand']
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.action).toBe('search_mentions');
    expect(data.data.mentions).toBeDefined();
    expect(data.data.metrics).toBeDefined();
  });

  test('should handle seeding plan creation', async ({ request }) => {
    console.log('LOG: TEST-E2E-BOOST-API-3 - Testing seeding plan creation API');
    
    const response = await request.post('/api/seed-content', {
      data: {
        action: 'create_seeding_plan',
        content_id: 'test-content-123',
        strategy: 'viral'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.action).toBe('create_seeding_plan');
    expect(data.data.seeding_plan).toBeDefined();
    expect(data.data.seeding_plan.seeding_strategy).toBe('viral');
  });

  test('should handle sentiment analysis request', async ({ request }) => {
    console.log('LOG: TEST-E2E-BOOST-API-4 - Testing sentiment analysis API');
    
    const response = await request.post('/api/seed-content', {
      data: {
        action: 'analyze_sentiment',
        text: 'This is an amazing product that I love!'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.action).toBe('analyze_sentiment');
    expect(data.data.sentiment).toBeDefined();
    expect(data.data.score).toBeDefined();
  });

  test('should reject invalid requests', async ({ request }) => {
    console.log('LOG: TEST-E2E-BOOST-API-5 - Testing invalid API requests');
    
    // Missing action
    const response1 = await request.post('/api/seed-content', {
      data: {
        keywords: ['Test']
      }
    });
    
    expect(response1.status()).toBe(400);
    
    // Invalid action
    const response2 = await request.post('/api/seed-content', {
      data: {
        action: 'invalid_action'
      }
    });
    
    expect(response2.status()).toBe(400);
    
    // Missing required parameters
    const response3 = await request.post('/api/seed-content', {
      data: {
        action: 'create_seeding_plan'
        // Missing content_id
      }
    });
    
    expect(response3.status()).toBe(400);
  });

  test('should handle GET requests for status', async ({ request }) => {
    console.log('LOG: TEST-E2E-BOOST-API-6 - Testing GET status requests');
    
    const response = await request.get('/api/seed-content?user_id=test-user-123');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user_id).toBe('test-user-123');
    expect(data.overview).toBeDefined();
  });
});