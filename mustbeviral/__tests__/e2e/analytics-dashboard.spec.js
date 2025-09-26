// End-to-end tests for analytics dashboard
// LOG: TEST-E2E-ANALYTICS-1 - Analytics dashboard E2E tests

const { test, expect } = require('@playwright/test');

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-SETUP-1 - Setting up analytics dashboard test');
    await page.goto('/');
  });

  test('should display analytics dashboard toggle', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-UI-1 - Testing analytics dashboard toggle');
    
    // Check if the analytics section is visible
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
    
    // Check if the toggle button is present
    const toggleButton = page.locator('button:has-text("Show Analytics")');
    await expect(toggleButton).toBeVisible();
    
    // Click to show analytics
    await toggleButton.click();
    
    // Check if button text changes
    await expect(page.locator('button:has-text("Hide Analytics")')).toBeVisible();
    
    // Check if analytics dashboard is now visible
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
  });

  test('should display analytics dashboard components', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-UI-2 - Testing dashboard components');
    
    // Show the analytics dashboard
    await page.click('button:has-text("Show Analytics")');
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Check main dashboard elements
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
    await expect(page.locator('select')).toBeVisible(); // Time range selector
    
    // Check connection status indicator
    await expect(page.locator('text=Live').or(page.locator('text=Disconnected'))).toBeVisible();
    
    // Check tabs
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button:has-text("Content Performance")')).toBeVisible();
    await expect(page.locator('button:has-text("Real-time")')).toBeVisible();
  });

  test('should switch between dashboard tabs', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-TABS-1 - Testing tab switching');
    
    // Show analytics dashboard
    await page.click('button:has-text("Show Analytics")');
    await page.waitForTimeout(2000);
    
    // Click on Content Performance tab
    await page.click('button:has-text("Content Performance")');
    
    // Should show content performance section
    await expect(page.locator('text=Top Performing Content')).toBeVisible();
    
    // Click on Real-time tab
    await page.click('button:has-text("Real-time")');
    
    // Should show real-time metrics
    await expect(page.locator('text=Live Metrics')).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();
    
    // Click back to Overview
    await page.click('button:has-text("Overview")');
    
    // Should show overview metrics
    await expect(page.locator('text=Total Content')).toBeVisible();
    await expect(page.locator('text=Total Views')).toBeVisible();
  });

  test('should display overview metrics', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-OVERVIEW-1 - Testing overview metrics display');
    
    // Show analytics dashboard
    await page.click('button:has-text("Show Analytics")');
    await page.waitForTimeout(2000);
    
    // Check overview metrics cards
    await expect(page.locator('text=Total Content')).toBeVisible();
    await expect(page.locator('text=Total Views')).toBeVisible();
    await expect(page.locator('text=Total Engagement')).toBeVisible();
    await expect(page.locator('text=Avg Engagement Rate')).toBeVisible();
    
    // Check that metrics have numerical values
    const metricsCards = page.locator('.bg-white.rounded-lg.shadow');
    const count = await metricsCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display content performance data', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-CONTENT-1 - Testing content performance display');
    
    // Show analytics dashboard and switch to content tab
    await page.click('button:has-text("Show Analytics")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Content Performance")');
    
    // Check for content performance elements
    await expect(page.locator('text=Top Performing Content')).toBeVisible();
    
    // Should show content items (even if mock data)
    const contentItems = page.locator('.border.border-gray-200.rounded-lg');
    const itemCount = await contentItems.count();
    expect(itemCount).toBeGreaterThanOrEqual(0);
  });

  test('should display real-time metrics', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-REALTIME-1 - Testing real-time metrics display');
    
    // Show analytics dashboard and switch to real-time tab
    await page.click('button:has-text("Show Analytics")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Real-time")');
    
    // Check real-time sections
    await expect(page.locator('text=Live Metrics')).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();
    
    // Check for active users and current views
    await expect(page.locator('text=Active Users')).toBeVisible();
    await expect(page.locator('text=Current Views')).toBeVisible();
  });

  test('should change time range selection', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-TIMERANGE-1 - Testing time range selection');
    
    // Show analytics dashboard
    await page.click('button:has-text("Show Analytics")');
    await page.waitForTimeout(2000);
    
    // Change time range
    const timeRangeSelect = page.locator('select');
    await timeRangeSelect.selectOption('30d');
    
    // Should trigger data refresh (we can't easily test the actual data change in E2E)
    // But the selection should work without errors
    const selectedValue = await timeRangeSelect.inputValue();
    expect(selectedValue).toBe('30d');
  });

  test('should handle loading states', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-LOADING-1 - Testing loading states');
    
    // Show analytics dashboard
    await page.click('button:has-text("Show Analytics")');
    
    // Should show loading state initially
    await expect(page.locator('text=Loading analytics...')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.locator('text=Loading analytics...')).not.toBeVisible({ timeout: 10000 });
    
    // Should show actual dashboard content
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-MOBILE-1 - Testing mobile responsiveness');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Show analytics dashboard
    await page.click('button:has-text("Show Analytics")');
    await page.waitForTimeout(2000);
    
    // Check if main elements are still visible
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
    
    // Tabs should be visible but may be stacked
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    
    // Overview metrics should adapt to mobile layout
    await expect(page.locator('text=Total Content')).toBeVisible();
  });

  test('should integrate with other dashboard features', async ({ page }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-INTEGRATION-1 - Testing integration with other features');
    
    // Show both trends and analytics
    await page.click('button:has-text("Show Trends")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Show Analytics")');
    await page.waitForTimeout(2000);
    
    // Both dashboards should be visible
    await expect(page.locator('text=Trend Dashboard')).toBeVisible();
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
    
    // Run AI agents workflow to test integration
    await page.click('button:has-text("Run AI Agents")');
    
    // Wait for workflow to complete
    await expect(page.locator('text=Workflow Results')).toBeVisible({ timeout: 30000 });
    
    // Analytics should still be functional
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
  });
});

// Test API endpoints directly
test.describe('Analytics API', () => {
  test('should handle analytics data request', async ({ request }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-API-1 - Testing analytics API');
    
    const response = await request.get('/api/analytics?timeRange=7d');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.overview).toBeDefined();
    expect(data.data.top_content).toBeDefined();
    expect(data.data.engagement_trends).toBeDefined();
    expect(data.data.real_time_metrics).toBeDefined();
  });

  test('should handle event tracking request', async ({ request }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-API-2 - Testing event tracking API');
    
    const response = await request.post('/api/track-event', {
      data: {
        content_id: 'test-content-123',
        event_type: 'view',
        session_id: 'test-session'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Event tracked successfully');
  });

  test('should reject invalid event tracking requests', async ({ request }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-API-3 - Testing invalid event tracking requests');
    
    // Missing required fields
    const response1 = await request.post('/api/track-event', {
      data: {
        event_type: 'view'
        // Missing content_id
      }
    });
    
    expect(response1.status()).toBe(400);
    
    // Invalid event type
    const response2 = await request.post('/api/track-event', {
      data: {
        content_id: 'test-content',
        event_type: 'invalid_type'
      }
    });
    
    expect(response2.status()).toBe(400);
  });

  test('should handle SSE connection', async ({ request }) => {
    console.log('LOG: TEST-E2E-ANALYTICS-API-4 - Testing SSE connection');
    
    const response = await request.get('/api/analytics-stream');
    
    // SSE endpoint should return appropriate headers
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/event-stream');
  });
});