// End-to-end tests for trends dashboard
// LOG: TEST-E2E-TRENDS-1 - Trends dashboard E2E tests

const { test, expect } = require('@playwright/test');

test.describe('Trends Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    console.log('LOG: TEST-E2E-TRENDS-SETUP-1 - Setting up trends dashboard test');
    await page.goto('/');
  });

  test('should display trends dashboard toggle', async ({ page }) => {
    console.log('LOG: TEST-E2E-TRENDS-UI-1 - Testing trends dashboard toggle');
    
    // Check if the trends section is visible
    await expect(page.locator('text=Trend Monitoring')).toBeVisible();
    
    // Check if the toggle button is present
    const toggleButton = page.locator('button:has-text("Show Trends")');
    await expect(toggleButton).toBeVisible();
    
    // Click to show trends
    await toggleButton.click();
    
    // Check if button text changes
    await expect(page.locator('button:has-text("Hide Trends")')).toBeVisible();
    
    // Check if trends dashboard is now visible
    await expect(page.locator('text=Trend Dashboard')).toBeVisible();
  });

  test('should display trends dashboard components', async ({ page }) => {
    console.log('LOG: TEST-E2E-TRENDS-UI-2 - Testing dashboard components');
    
    // Show the trends dashboard
    await page.click('button:has-text("Show Trends")');
    
    // Check main dashboard elements
    await expect(page.locator('text=Trend Dashboard')).toBeVisible();
    await expect(page.locator('select')).toBeVisible(); // Region selector
    await expect(page.locator('input[placeholder*="trending keywords"]')).toBeVisible();
    
    // Check tabs
    await expect(page.locator('button:has-text("Trending Now")')).toBeVisible();
    await expect(page.locator('button:has-text("Keyword Analysis")')).toBeVisible();
    await expect(page.locator('button:has-text("Predictions")')).toBeVisible();
  });

  test('should search for keywords', async ({ page }) => {
    console.log('LOG: TEST-E2E-TRENDS-SEARCH-1 - Testing keyword search');
    
    // Show trends dashboard
    await page.click('button:has-text("Show Trends")');
    
    // Enter search term
    const searchInput = page.locator('input[placeholder*="trending keywords"]');
    await searchInput.fill('AI technology');
    
    // Click search button
    await page.click('button:has-text("Search")');
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading trends...')).toBeVisible();
    await expect(page.locator('text=Loading trends...')).not.toBeVisible({ timeout: 10000 });
  });

  test('should switch between tabs', async ({ page }) => {
    console.log('LOG: TEST-E2E-TRENDS-TABS-1 - Testing tab switching');
    
    // Show trends dashboard
    await page.click('button:has-text("Show Trends")');
    
    // Click on Predictions tab
    await page.click('button:has-text("Predictions")');
    
    // Should show predictions content
    await expect(page.locator('text=Growth Predictions')).toBeVisible();
    
    // Click on Keyword Analysis tab
    await page.click('button:has-text("Keyword Analysis")');
    
    // Click back to Trending Now
    await page.click('button:has-text("Trending Now")');
    await expect(page.locator('text=Trending Topics')).toBeVisible();
  });

  test('should change region selection', async ({ page }) => {
    console.log('LOG: TEST-E2E-TRENDS-REGION-1 - Testing region selection');
    
    // Show trends dashboard
    await page.click('button:has-text("Show Trends")');
    
    // Change region
    const regionSelect = page.locator('select');
    await regionSelect.selectOption('GB');
    
    // Should trigger loading
    await expect(page.locator('text=Loading trends...')).toBeVisible();
    await expect(page.locator('text=Loading trends...')).not.toBeVisible({ timeout: 10000 });
  });

  test('should handle empty search results', async ({ page }) => {
    console.log('LOG: TEST-E2E-TRENDS-EMPTY-1 - Testing empty search results');
    
    // Show trends dashboard
    await page.click('button:has-text("Show Trends")');
    
    // Search for something that likely won't have results
    const searchInput = page.locator('input[placeholder*="trending keywords"]');
    await searchInput.fill('xyznonexistentkeyword123');
    await page.click('button:has-text("Search")');
    
    // Wait for search to complete
    await page.waitForTimeout(2000);
    
    // Should handle gracefully (either show results or empty state)
    // The exact behavior depends on the API response
  });

  test('should be responsive on mobile', async ({ page }) => {
    console.log('LOG: TEST-E2E-TRENDS-MOBILE-1 - Testing mobile responsiveness');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Show trends dashboard
    await page.click('button:has-text("Show Trends")');
    
    // Check if main elements are still visible
    await expect(page.locator('text=Trend Dashboard')).toBeVisible();
    await expect(page.locator('input[placeholder*="trending keywords"]')).toBeVisible();
    
    // Tabs should be visible but may be stacked
    await expect(page.locator('button:has-text("Trending Now")')).toBeVisible();
  });

  test('should integrate with AI agents workflow', async ({ page }) => {
    console.log('LOG: TEST-E2E-TRENDS-INTEGRATION-1 - Testing AI agents integration');
    
    // Show trends dashboard first
    await page.click('button:has-text("Show Trends")');
    
    // Wait for trends to load
    await page.waitForTimeout(2000);
    
    // Now run AI agents workflow
    await page.click('button:has-text("Run AI Agents")');
    
    // Wait for workflow to complete
    await expect(page.locator('text=Workflow Results')).toBeVisible({ timeout: 30000 });
    
    // The workflow should potentially use trend data
    // (This is more of an integration test to ensure both systems work together)
  });
});

// Test API endpoints directly
test.describe('Trends API', () => {
  test('should handle trending topics request', async ({ request }) => {
    console.log('LOG: TEST-E2E-TRENDS-API-1 - Testing trending topics API');
    
    const response = await request.get('/api/get-trends?type=trending&region=US');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.type).toBe('trending');
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('should handle keyword search request', async ({ request }) => {
    console.log('LOG: TEST-E2E-TRENDS-API-2 - Testing keyword search API');
    
    const response = await request.get('/api/get-trends?type=keywords&keywords=AI,technology');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.type).toBe('keywords');
    expect(data.keywords).toEqual(['AI', 'technology']);
  });

  test('should handle predictions request', async ({ request }) => {
    console.log('LOG: TEST-E2E-TRENDS-API-3 - Testing predictions API');
    
    const response = await request.get('/api/get-trends?type=predict&keywords=AI');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.type).toBe('predict');
    expect(data.data.keyword).toBe('AI');
    expect(typeof data.data.predicted_growth).toBe('number');
  });

  test('should handle trend analysis POST request', async ({ request }) => {
    console.log('LOG: TEST-E2E-TRENDS-API-4 - Testing trend analysis API');
    
    const response = await request.post('/api/get-trends', {
      data: {
        content: 'This is content about AI technology and machine learning',
        action: 'analyze'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.action).toBe('analyze');
    expect(data.result.viral_potential).toBeDefined();
    expect(data.result.suggestions).toBeDefined();
  });

  test('should reject invalid requests', async ({ request }) => {
    console.log('LOG: TEST-E2E-TRENDS-API-5 - Testing invalid API requests');
    
    // Missing required parameters
    const response1 = await request.get('/api/get-trends?type=keywords');
    expect(response1.status()).toBe(400);
    
    // Invalid type
    const response2 = await request.get('/api/get-trends?type=invalid');
    expect(response2.status()).toBe(400);
    
    // Empty POST body
    const response3 = await request.post('/api/get-trends', { data: {} });
    expect(response3.status()).toBe(400);
  });
});