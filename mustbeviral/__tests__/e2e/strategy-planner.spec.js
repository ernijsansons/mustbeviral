// End-to-end tests for strategy planner
// LOG: TEST-E2E-STRATEGY-1 - Strategy planner E2E tests

const { test, expect } = require('@playwright/test');

test.describe('Strategy Planner', () => {
  test.beforeEach(async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-SETUP-1 - Setting up strategy planner test');
    await page.goto('/');
  });

  test('should display strategy planner component', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-UI-1 - Testing strategy planner display');
    
    // Check if strategy planner is visible (assuming it's integrated)
    await expect(page.locator('text=Strategy Planner')).toBeVisible();
    await expect(page.locator('text=Basic Information')).toBeVisible();
    
    // Check step indicators
    const stepIndicators = page.locator('.w-8.h-8.rounded-full');
    expect(await stepIndicators.count()).toBe(4);
  });

  test('should complete step 1 - basic information', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-STEP1-1 - Testing step 1 completion');
    
    // Fill brand name
    await page.fill('input[placeholder="Enter your brand name"]', 'Test Brand');
    
    // Select industry
    await page.selectOption('select', 'technology');
    
    // Fill target audience
    await page.fill('input[placeholder*="Young professionals"]', 'Tech enthusiasts aged 25-35');
    
    // Click next
    await page.click('button:has-text("Next")');
    
    // Should move to step 2
    await expect(page.locator('text=Goals and Budget')).toBeVisible();
  });

  test('should complete step 2 - goals and budget', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-STEP2-1 - Testing step 2 completion');
    
    // Complete step 1 first
    await page.fill('input[placeholder="Enter your brand name"]', 'Test Brand');
    await page.selectOption('select', 'technology');
    await page.fill('input[placeholder*="Young professionals"]', 'Tech enthusiasts');
    await page.click('button:has-text("Next")');
    
    // Select primary goal
    await page.click('text=Affiliate Revenue');
    
    // Select budget range
    await page.click('text=Medium ($5K-$15K)');
    
    // Click analyze
    await page.click('button:has-text("Analyze")');
    
    // Should move to step 3
    await expect(page.locator('text=Strategy Analysis')).toBeVisible();
  });

  test('should display analysis results in step 3', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-STEP3-1 - Testing analysis results');
    
    // Complete steps 1 and 2
    await page.fill('input[placeholder="Enter your brand name"]', 'Test Brand');
    await page.selectOption('select', 'technology');
    await page.fill('input[placeholder*="Young professionals"]', 'Tech enthusiasts');
    await page.click('button:has-text("Next")');
    
    await page.click('text=Affiliate Revenue');
    await page.click('text=Medium ($5K-$15K)');
    await page.click('button:has-text("Analyze")');
    
    // Wait for analysis to complete
    await expect(page.locator('text=Analyzing your requirements...')).toBeVisible();
    await expect(page.locator('text=Analyzing your requirements...')).not.toBeVisible({ timeout: 10000 });
    
    // Check analysis results
    await expect(page.locator('text=Feasibility')).toBeVisible();
    await expect(page.locator('text=Timeline')).toBeVisible();
    await expect(page.locator('text=Budget')).toBeVisible();
  });

  test('should generate strategy in step 4', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-STEP4-1 - Testing strategy generation');
    
    // Complete all previous steps
    await page.fill('input[placeholder="Enter your brand name"]', 'Test Brand');
    await page.selectOption('select', 'technology');
    await page.fill('input[placeholder*="Young professionals"]', 'Tech enthusiasts');
    await page.click('button:has-text("Next")');
    
    await page.click('text=Affiliate Revenue');
    await page.click('text=Medium ($5K-$15K)');
    await page.click('button:has-text("Analyze")');
    
    // Wait for analysis and generate strategy
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Generate Strategy")');
    
    // Wait for strategy generation
    await expect(page.locator('text=Your Personalized Strategy')).toBeVisible({ timeout: 15000 });
    
    // Check strategy results
    await expect(page.locator('text=Success Probability')).toBeVisible();
    await expect(page.locator('text=Timeline')).toBeVisible();
    await expect(page.locator('text=Budget Estimate')).toBeVisible();
    await expect(page.locator('text=Strategy Steps')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-VALIDATION-1 - Testing field validation');
    
    // Try to proceed without filling required fields
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeDisabled();
    
    // Fill brand name only
    await page.fill('input[placeholder="Enter your brand name"]', 'Test Brand');
    await expect(nextButton).toBeDisabled();
    
    // Fill industry
    await page.selectOption('select', 'technology');
    await expect(nextButton).toBeEnabled();
  });

  test('should allow navigation between steps', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-NAVIGATION-1 - Testing step navigation');
    
    // Complete step 1
    await page.fill('input[placeholder="Enter your brand name"]', 'Test Brand');
    await page.selectOption('select', 'technology');
    await page.fill('input[placeholder*="Young professionals"]', 'Tech enthusiasts');
    await page.click('button:has-text("Next")');
    
    // Go back to step 1
    await page.click('button:has-text("Previous")');
    await expect(page.locator('text=Basic Information')).toBeVisible();
    
    // Verify data is preserved
    await expect(page.locator('input[placeholder="Enter your brand name"]')).toHaveValue('Test Brand');
  });

  test('should display different goal options', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-GOALS-1 - Testing goal options');
    
    // Navigate to step 2
    await page.fill('input[placeholder="Enter your brand name"]', 'Test Brand');
    await page.selectOption('select', 'technology');
    await page.fill('input[placeholder*="Young professionals"]', 'Tech enthusiasts');
    await page.click('button:has-text("Next")');
    
    // Check all goal options are present
    await expect(page.locator('text=Brand Awareness')).toBeVisible();
    await expect(page.locator('text=Engagement')).toBeVisible();
    await expect(page.locator('text=Conversion')).toBeVisible();
    await expect(page.locator('text=Affiliate Revenue')).toBeVisible();
    
    // Test goal selection
    await page.click('text=Brand Awareness');
    await expect(page.locator('.border-indigo-500')).toBeVisible();
  });

  test('should display budget options', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-BUDGET-1 - Testing budget options');
    
    // Navigate to step 2
    await page.fill('input[placeholder="Enter your brand name"]', 'Test Brand');
    await page.selectOption('select', 'technology');
    await page.fill('input[placeholder*="Young professionals"]', 'Tech enthusiasts');
    await page.click('button:has-text("Next")');
    
    // Check budget options
    await expect(page.locator('text=Low ($1K-$5K)')).toBeVisible();
    await expect(page.locator('text=Medium ($5K-$15K)')).toBeVisible();
    await expect(page.locator('text=High ($15K+)')).toBeVisible();
    
    // Test budget selection
    await page.click('text=High ($15K+)');
    await expect(page.locator('.bg-red-100')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-MOBILE-1 - Testing mobile responsiveness');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if main elements are visible
    await expect(page.locator('text=Strategy Planner')).toBeVisible();
    await expect(page.locator('text=Basic Information')).toBeVisible();
    
    // Step indicators should be visible
    const stepIndicators = page.locator('.w-8.h-8.rounded-full');
    expect(await stepIndicators.count()).toBe(4);
    
    // Form should be usable on mobile
    await page.fill('input[placeholder="Enter your brand name"]', 'Mobile Test');
    await expect(page.locator('input[placeholder="Enter your brand name"]')).toHaveValue('Mobile Test');
  });

  test('should handle loading states', async ({ page }) => {
    console.log('LOG: TEST-E2E-STRATEGY-LOADING-1 - Testing loading states');
    
    // Complete steps to reach analysis
    await page.fill('input[placeholder="Enter your brand name"]', 'Test Brand');
    await page.selectOption('select', 'technology');
    await page.fill('input[placeholder*="Young professionals"]', 'Tech enthusiasts');
    await page.click('button:has-text("Next")');
    
    await page.click('text=Affiliate Revenue');
    await page.click('text=Medium ($5K-$15K)');
    await page.click('button:has-text("Analyze")');
    
    // Should show loading state
    await expect(page.locator('text=Analyzing your requirements...')).toBeVisible();
    
    // Loading should eventually disappear
    await expect(page.locator('text=Analyzing your requirements...')).not.toBeVisible({ timeout: 10000 });
  });
});

// Test API endpoints directly
test.describe('Strategy API', () => {
  test('should handle get templates request', async ({ request }) => {
    console.log('LOG: TEST-E2E-STRATEGY-API-1 - Testing get templates API');
    
    const response = await request.get('/api/get-strategy?action=get_templates');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.templates).toBeDefined();
    expect(data.data.templates.length).toBeGreaterThan(0);
  });

  test('should handle strategy generation request', async ({ request }) => {
    console.log('LOG: TEST-E2E-STRATEGY-API-2 - Testing strategy generation API');
    
    const response = await request.post('/api/get-strategy', {
      data: {
        action: 'generate_strategy',
        user_id: 'test-user',
        strategy_request: {
          user_id: 'test-user',
          brand_name: 'Test Brand',
          industry: 'technology',
          target_audience: 'developers',
          budget_range: 'medium',
          primary_goal: 'affiliate_revenue',
          timeline: '3 months',
          existing_channels: ['website']
        }
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.strategy).toBeDefined();
    expect(data.data.strategy.brand_name).toBe('Test Brand');
  });

  test('should handle request analysis', async ({ request }) => {
    console.log('LOG: TEST-E2E-STRATEGY-API-3 - Testing request analysis API');
    
    const response = await request.post('/api/get-strategy', {
      data: {
        action: 'analyze_request',
        user_id: 'test-user',
        strategy_request: {
          user_id: 'test-user',
          brand_name: 'Test Brand',
          industry: 'technology',
          target_audience: 'developers',
          budget_range: 'high',
          primary_goal: 'awareness',
          timeline: '2 months',
          existing_channels: ['website', 'social_media']
        }
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.feasibility_score).toBeDefined();
    expect(data.data.estimated_timeline).toBeDefined();
    expect(data.data.budget_recommendations).toBeDefined();
  });

  test('should reject invalid requests', async ({ request }) => {
    console.log('LOG: TEST-E2E-STRATEGY-API-4 - Testing invalid requests');
    
    // Missing action
    const response1 = await request.post('/api/get-strategy', {
      data: {
        user_id: 'test-user'
      }
    });
    
    expect(response1.status()).toBe(400);
    
    // Invalid action
    const response2 = await request.post('/api/get-strategy', {
      data: {
        action: 'invalid_action',
        user_id: 'test-user'
      }
    });
    
    expect(response2.status()).toBe(400);
    
    // Missing required parameters
    const response3 = await request.post('/api/get-strategy', {
      data: {
        action: 'generate_strategy',
        user_id: 'test-user'
        // Missing strategy_request
      }
    });
    
    expect(response3.status()).toBe(400);
  });
});