// End-to-end tests for AI agents workflow
// LOG: TEST-E2E-AGENTS-1 - AI agents workflow E2E tests

const { test, expect } = require('@playwright/test');

test.describe('AI Agents Workflow', () => {
  test.beforeEach(async ({ page }) => {
    console.log('LOG: TEST-E2E-AGENTS-SETUP-1 - Setting up agents workflow test');
    await page.goto('/');
  });

  test('should display AI control slider', async ({ page }) => {
    console.log('LOG: TEST-E2E-AGENTS-UI-1 - Testing AI control slider display');
    
    // Check if the slider component is visible
    await expect(page.locator('text=AI Control Level')).toBeVisible();
    
    // Check if the slider input is present
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    
    // Check if preset buttons are visible
    await expect(page.locator('button:has-text("Manual")')).toBeVisible();
    await expect(page.locator('button:has-text("Balanced")')).toBeVisible();
    await expect(page.locator('button:has-text("AI-First")')).toBeVisible();
  });

  test('should interact with AI control slider', async ({ page }) => {
    console.log('LOG: TEST-E2E-AGENTS-UI-2 - Testing slider interaction');
    
    const slider = page.locator('input[type="range"]');
    
    // Test slider movement
    await slider.fill('75');
    
    // Check if the percentage display updates
    await expect(page.locator('text=75%')).toBeVisible();
    
    // Check if description updates
    await expect(page.locator('text=AI-first')).toBeVisible();
  });

  test('should use preset buttons', async ({ page }) => {
    console.log('LOG: TEST-E2E-AGENTS-UI-3 - Testing preset buttons');
    
    // Click Manual preset
    await page.click('button:has-text("Manual")');
    await expect(page.locator('text=10%')).toBeVisible();
    
    // Click AI-First preset
    await page.click('button:has-text("AI-First")');
    await expect(page.locator('text=90%')).toBeVisible();
    
    // Click Balanced preset
    await page.click('button:has-text("Balanced")');
    await expect(page.locator('text=50%')).toBeVisible();
  });

  test('should display agents demo section', async ({ page }) => {
    console.log('LOG: TEST-E2E-AGENTS-UI-4 - Testing agents demo section');
    
    await expect(page.locator('text=AI Agents Demo')).toBeVisible();
    await expect(page.locator('text=6-agent system')).toBeVisible();
    await expect(page.locator('button:has-text("Run AI Agents")')).toBeVisible();
  });

  test('should run agents workflow', async ({ page }) => {
    console.log('LOG: TEST-E2E-AGENTS-WORKFLOW-1 - Testing agents workflow execution');
    
    // Set a specific control level
    const slider = page.locator('input[type="range"]');
    await slider.fill('60');
    
    // Click the run agents button
    const runButton = page.locator('button:has-text("Run AI Agents")');
    await runButton.click();
    
    // Check if button shows loading state
    await expect(page.locator('text=Running Agents...')).toBeVisible();
    
    // Wait for the workflow to complete (with timeout)
    await expect(page.locator('text=Workflow Results')).toBeVisible({ timeout: 30000 });
    
    // Check if results are displayed
    await expect(page.locator('text=Generated Content')).toBeVisible();
    await expect(page.locator('text=Analytics')).toBeVisible();
    await expect(page.locator('text=Ethics Status')).toBeVisible();
  });

  test('should display workflow results correctly', async ({ page }) => {
    console.log('LOG: TEST-E2E-AGENTS-WORKFLOW-2 - Testing workflow results display');
    
    // Run the workflow first
    await page.click('button:has-text("Run AI Agents")');
    
    // Wait for results
    await expect(page.locator('text=Workflow Results')).toBeVisible({ timeout: 30000 });
    
    // Check result sections
    await expect(page.locator('text=Generated Content')).toBeVisible();
    await expect(page.locator('text=Analytics')).toBeVisible();
    
    // Check specific result fields
    await expect(page.locator('text=Ethics Status:')).toBeVisible();
    await expect(page.locator('text=Influencer Matches:')).toBeVisible();
    await expect(page.locator('text=Estimated Reach:')).toBeVisible();
  });

  test('should handle different control levels', async ({ page }) => {
    console.log('LOG: TEST-E2E-AGENTS-WORKFLOW-3 - Testing different control levels');
    
    // Test with low control level
    const slider = page.locator('input[type="range"]');
    await slider.fill('20');
    
    await page.click('button:has-text("Run AI Agents")');
    await expect(page.locator('text=Running Agents...')).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('text=Workflow Results', { timeout: 30000 });
    
    // Test with high control level
    await slider.fill('90');
    
    await page.click('button:has-text("Run AI Agents")');
    await expect(page.locator('text=Running Agents...')).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('text=Workflow Results', { timeout: 30000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    console.log('LOG: TEST-E2E-AGENTS-MOBILE-1 - Testing mobile responsiveness');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if slider is still visible and functional
    await expect(page.locator('text=AI Control Level')).toBeVisible();
    
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    
    // Test slider on mobile
    await slider.fill('70');
    await expect(page.locator('text=70%')).toBeVisible();
    
    // Check if run button is visible
    await expect(page.locator('button:has-text("Run AI Agents")')).toBeVisible();
  });
});

// Test API endpoints directly
test.describe('Agents API', () => {
  test('should handle valid workflow request', async ({ request }) => {
    console.log('LOG: TEST-E2E-AGENTS-API-1 - Testing agents API');
    
    const response = await request.post('/api/run-agents', {
      data: {
        input: 'Create content about AI trends',
        user_id: 'test-user',
        control_level: 50
      }
    });
    
    expect(response.status()).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.workflow_id).toBeDefined();
    expect(result.results).toBeDefined();
  });

  test('should reject invalid requests', async ({ request }) => {
    console.log('LOG: TEST-E2E-AGENTS-API-2 - Testing invalid API requests');
    
    // Missing required fields
    const response1 = await request.post('/api/run-agents', {
      data: {
        input: 'Test input'
        // Missing user_id
      }
    });
    
    expect(response1.status()).toBe(400);
    
    // Invalid control level
    const response2 = await request.post('/api/run-agents', {
      data: {
        input: 'Test input',
        user_id: 'test-user',
        control_level: 150 // Invalid range
      }
    });
    
    expect(response2.status()).toBe(400);
  });

  test('should handle workflow status requests', async ({ request }) => {
    console.log('LOG: TEST-E2E-AGENTS-API-3 - Testing workflow status API');
    
    const response = await request.get('/api/run-agents?workflow_id=test-workflow-123');
    
    expect(response.status()).toBe(200);
    
    const result = await response.json();
    expect(result.workflow_id).toBe('test-workflow-123');
    expect(result.status).toBeDefined();
  });
});