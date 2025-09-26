// End-to-end tests for AI tool selector
// LOG: TEST-E2E-TOOL-SELECTOR-1 - Tool selector E2E tests

const { test, expect } = require('@playwright/test');

test.describe('AI Tool Selector', () => {
  test.beforeEach(async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-SETUP-1 - Setting up tool selector test');
    await page.goto('/');
  });

  test('should display tool selector component', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-UI-1 - Testing tool selector display');
    
    // Add tool selector to the page (assuming it's integrated)
    await expect(page.locator('text=AI Tool Selector')).toBeVisible();
    await expect(page.locator('text=Select Your Plan')).toBeVisible();
  });

  test('should show available tiers', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-TIERS-1 - Testing tier display');
    
    // Check for tier cards
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Standard')).toBeVisible();
    await expect(page.locator('text=Premium')).toBeVisible();
    
    // Check tier pricing
    await expect(page.locator('text=$0')).toBeVisible();
    await expect(page.locator('text=$19')).toBeVisible();
    await expect(page.locator('text=$49')).toBeVisible();
  });

  test('should allow tier selection', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-SELECT-1 - Testing tier selection');
    
    // Click on Standard tier
    await page.click('text=Standard');
    
    // Should show selected state
    await expect(page.locator('.border-indigo-500')).toBeVisible();
    
    // Should load models for selected tier
    await expect(page.locator('text=Available Models')).toBeVisible();
  });

  test('should display quality and cost sliders', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-SLIDERS-1 - Testing slider display');
    
    // Check for slider labels
    await expect(page.locator('text=Quality Level:')).toBeVisible();
    await expect(page.locator('text=Cost Preference:')).toBeVisible();
    
    // Check for slider inputs
    const qualitySlider = page.locator('input[type="range"]').first();
    const costSlider = page.locator('input[type="range"]').last();
    
    await expect(qualitySlider).toBeVisible();
    await expect(costSlider).toBeVisible();
  });

  test('should interact with quality slider', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-SLIDERS-2 - Testing slider interaction');
    
    const qualitySlider = page.locator('input[type="range"]').first();
    
    // Set slider to maximum
    await qualitySlider.fill('10');
    
    // Check if label updates
    await expect(page.locator('text=Quality Level: 10/10')).toBeVisible();
    
    // Set slider to minimum
    await qualitySlider.fill('1');
    await expect(page.locator('text=Quality Level: 1/10')).toBeVisible();
  });

  test('should interact with cost slider', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-SLIDERS-3 - Testing cost slider interaction');
    
    const costSlider = page.locator('input[type="range"]').last();
    
    // Set slider to maximum
    await costSlider.fill('10');
    
    // Check if label updates
    await expect(page.locator('text=Cost Preference: 10/10')).toBeVisible();
    
    // Set slider to minimum
    await costSlider.fill('1');
    await expect(page.locator('text=Cost Preference: 1/10')).toBeVisible();
  });

  test('should show available models after tier selection', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-MODELS-1 - Testing model display');
    
    // Select Standard tier
    await page.click('text=Standard');
    
    // Wait for models to load
    await page.waitForTimeout(2000);
    
    // Should show available models section
    await expect(page.locator('text=Available Models')).toBeVisible();
    
    // Should show model cards
    const modelCards = page.locator('.border.rounded-lg').filter({ hasText: 'Llama' });
    await expect(modelCards.first()).toBeVisible();
  });

  test('should allow model selection', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-MODELS-2 - Testing model selection');
    
    // Select Standard tier first
    await page.click('text=Standard');
    await page.waitForTimeout(2000);
    
    // Click on a model card
    const modelCard = page.locator('.border.rounded-lg').first();
    await modelCard.click();
    
    // Should show selected state
    await expect(page.locator('.border-indigo-500.bg-indigo-50')).toBeVisible();
  });

  test('should display usage information', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-USAGE-1 - Testing usage display');
    
    // Should show daily usage section
    await expect(page.locator('text=Daily Usage')).toBeVisible();
    
    // Should show usage bars
    await expect(page.locator('text=Text Tokens')).toBeVisible();
    await expect(page.locator('text=Image Generations')).toBeVisible();
    
    // Should show progress bars
    const progressBars = page.locator('.bg-gray-200.rounded-full.h-2');
    expect(await progressBars.count()).toBeGreaterThan(0);
  });

  test('should show different models for different tiers', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-TIER-MODELS-1 - Testing tier-specific models');
    
    // Select Free tier
    await page.click('text=Free');
    await page.waitForTimeout(2000);
    
    // Should show limited models
    let modelCount = await page.locator('.border.rounded-lg').filter({ hasText: 'Llama' }).count();
    expect(modelCount).toBeGreaterThanOrEqual(1);
    
    // Select Premium tier
    await page.click('text=Premium');
    await page.waitForTimeout(2000);
    
    // Should show more models
    let premiumModelCount = await page.locator('.border.rounded-lg').count();
    expect(premiumModelCount).toBeGreaterThan(modelCount);
  });

  test('should be responsive on mobile', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-MOBILE-1 - Testing mobile responsiveness');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Should still show main elements
    await expect(page.locator('text=AI Tool Selector')).toBeVisible();
    await expect(page.locator('text=Select Your Plan')).toBeVisible();
    
    // Tier cards should stack on mobile
    const tierCards = page.locator('.border-2.rounded-lg');
    expect(await tierCards.count()).toBe(3);
  });

  test('should handle loading states', async ({ page }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-LOADING-1 - Testing loading states');
    
    // Select a tier to trigger loading
    await page.click('text=Standard');
    
    // Should show loading indicator briefly
    await expect(page.locator('text=Updating...')).toBeVisible({ timeout: 5000 });
    
    // Loading should disappear
    await expect(page.locator('text=Updating...')).not.toBeVisible({ timeout: 10000 });
  });
});

// Test API endpoints directly
test.describe('AI Tool Selector API', () => {
  test('should handle get tiers request', async ({ request }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-API-1 - Testing get tiers API');
    
    const response = await request.get('/api/select-tool?action=get_tiers');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.tiers).toBeDefined();
    expect(data.data.tiers.length).toBe(3);
  });

  test('should handle tier selection request', async ({ request }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-API-2 - Testing tier selection API');
    
    const response = await request.post('/api/select-tool', {
      data: {
        action: 'select_tier',
        user_id: 'test-user',
        tier_id: 'standard'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.tier_selected).toBe(true);
    expect(data.data.current_tier.id).toBe('standard');
  });

  test('should handle get models request', async ({ request }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-API-3 - Testing get models API');
    
    const response = await request.post('/api/select-tool', {
      data: {
        action: 'get_models',
        user_id: 'test-user',
        tier_id: 'premium'
      }
    });
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.available_models).toBeDefined();
    expect(data.data.available_models.length).toBeGreaterThan(0);
  });

  test('should handle usage request', async ({ request }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-API-4 - Testing usage API');
    
    const response = await request.get('/api/select-tool?action=get_usage&user_id=test-user');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.current_tier).toBeDefined();
    expect(data.data.daily_usage).toBeDefined();
    expect(data.data.usage_percentages).toBeDefined();
  });

  test('should reject invalid requests', async ({ request }) => {
    console.log('LOG: TEST-E2E-TOOL-SELECTOR-API-5 - Testing invalid requests');
    
    // Missing action
    const response1 = await request.post('/api/select-tool', {
      data: {
        user_id: 'test-user'
      }
    });
    
    expect(response1.status()).toBe(400);
    
    // Invalid action
    const response2 = await request.post('/api/select-tool', {
      data: {
        action: 'invalid_action',
        user_id: 'test-user'
      }
    });
    
    expect(response2.status()).toBe(400);
    
    // Missing required parameters
    const response3 = await request.post('/api/select-tool', {
      data: {
        action: 'select_tier',
        user_id: 'test-user'
        // Missing tier_id
      }
    });
    
    expect(response3.status()).toBe(400);
  });
});