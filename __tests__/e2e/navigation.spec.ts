// E2E tests for navigation functionality
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display responsive navigation bar', async ({ page }) => {
    // Check desktop navigation
    await expect(page.getByRole('navigation').first()).toBeVisible();
    await expect(page.getByText('Must Be Viral')).toBeVisible();
    
    // Check main navigation links
    await expect(page.getByTestId('link-dashboard')).toBeVisible();
    await expect(page.getByTestId('link-content')).toBeVisible();
    await expect(page.getByTestId('link-matches')).toBeVisible();
    
    // Check action buttons
    await expect(page.getByTestId('button-get-started')).toBeVisible();
    await expect(page.getByTestId('button-sign-up')).toBeVisible();
  });

  test('should navigate to dashboard and show active state', async ({ page }) => {
    // Click dashboard link
    await page.getByTestId('link-dashboard').click();
    
    // Check URL changed
    await expect(page).toHaveURL('/dashboard');
    
    // Check active state styling
    const dashboardLink = page.getByTestId('link-dashboard');
    await expect(dashboardLink).toHaveClass(/text-indigo-600/);
    await expect(dashboardLink).toHaveClass(/border-indigo-600/);
    
    // Check page content
    await expect(page.getByText('Dashboard Overview')).toBeVisible();
  });

  test('should navigate to content page and show tabs', async ({ page }) => {
    // Navigate to content page
    await page.getByTestId('link-content').click();
    await expect(page).toHaveURL('/content');
    
    // Check page title
    await expect(page.getByText('Content Creation')).toBeVisible();
    
    // Check tabs are present
    await expect(page.getByTestId('tab-tools')).toBeVisible();
    await expect(page.getByTestId('tab-strategies')).toBeVisible();
    await expect(page.getByTestId('tab-trends')).toBeVisible();
    
    // Test tab switching
    await page.getByTestId('tab-strategies').click();
    await expect(page.getByTestId('tab-strategies')).toHaveClass(/text-indigo-600/);
    
    await page.getByTestId('tab-trends').click();
    await expect(page.getByTestId('tab-trends')).toHaveClass(/text-indigo-600/);
  });

  test('should navigate to matches page and show marketplace', async ({ page }) => {
    // Navigate to matches page
    await page.getByTestId('link-matches').click();
    await expect(page).toHaveURL('/matches');
    
    // Check page title
    await expect(page.getByText('Influencer Marketplace')).toBeVisible();
    
    // Wait for loading to complete
    await expect(page.getByText('influencers found')).toBeVisible({ timeout: 10000 });
    
    // Check search functionality
    await expect(page.getByTestId('input-search-influencers')).toBeVisible();
    await expect(page.getByTestId('select-category-filter')).toBeVisible();
    
    // Test search
    await page.fill('[data-testid="input-search-influencers"]', 'Sarah');
    await expect(page.getByText('1 influencer found')).toBeVisible();
    
    // Check influencer cards
    await expect(page.getByTestId('influencer-card-1')).toBeVisible();
  });

  test('should handle mobile responsive navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile menu button should be visible
    await expect(page.getByTestId('button-mobile-menu')).toBeVisible();
    
    // Desktop navigation should be hidden
    await expect(page.getByTestId('link-dashboard')).not.toBeVisible();
    
    // Open mobile menu
    await page.getByTestId('button-mobile-menu').click();
    
    // Mobile navigation items should be visible
    await expect(page.getByTestId('mobile-link-dashboard')).toBeVisible();
    await expect(page.getByTestId('mobile-link-content')).toBeVisible();
    await expect(page.getByTestId('mobile-link-matches')).toBeVisible();
    
    // Test mobile navigation
    await page.getByTestId('mobile-link-content').click();
    await expect(page).toHaveURL('/content');
  });

  test('should show bottom navigation on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Bottom navigation should be visible
    await expect(page.getByRole('navigation').nth(1)).toBeVisible();
    
    // Check bottom nav items
    await expect(page.getByTestId('bottom-link-dashboard')).toBeVisible();
    await expect(page.getByTestId('bottom-link-content')).toBeVisible();
    await expect(page.getByTestId('bottom-link-matches')).toBeVisible();
    await expect(page.getByTestId('bottom-button-get-started')).toBeVisible();
    
    // Test bottom navigation
    await page.getByTestId('bottom-link-content').click();
    await expect(page).toHaveURL('/content');
    
    // Check active state in bottom nav
    await expect(page.getByTestId('bottom-link-content')).toHaveClass(/text-indigo-600/);
  });

  test('should handle subscription link and redirect', async ({ page }) => {
    // Click get started button
    const getStartedButton = page.getByTestId('button-get-started');
    await expect(getStartedButton).toBeVisible();
    
    // Test the link (it should point to /api/subscribe)
    await expect(getStartedButton).toHaveAttribute('href', '/api/subscribe');
    
    // Test that clicking triggers a navigation (not just client-side routing)
    // We expect this to trigger a server redirect to Stripe
    const response = await page.request.get('/api/subscribe', { maxRedirects: 0 });
    expect(response.status()).toBe(302); // Should be a redirect
    
    // Alternatively, test that the link causes a full page navigation
    await Promise.all([
      page.waitForURL(/billing\.stripe\.com/, { timeout: 10000 }),
      getStartedButton.click()
    ]);
  });

  test('should maintain keyboard accessibility', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Logo should be focused
    await expect(page.getByText('Must Be Viral')).toBeFocused();
    
    // Continue tabbing through navigation
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-dashboard')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-content')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-matches')).toBeFocused();
    
    // Test Enter key activation
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/matches');
  });

  test('should display active states correctly', async ({ page }) => {
    // Go to dashboard
    await page.goto('/dashboard');
    await expect(page.getByTestId('link-dashboard')).toHaveClass(/text-indigo-600/);
    await expect(page.getByTestId('link-content')).not.toHaveClass(/text-indigo-600/);
    
    // Go to content
    await page.goto('/content');
    await expect(page.getByTestId('link-content')).toHaveClass(/text-indigo-600/);
    await expect(page.getByTestId('link-dashboard')).not.toHaveClass(/text-indigo-600/);
    
    // Go to matches
    await page.goto('/matches');
    await expect(page.getByTestId('link-matches')).toHaveClass(/text-indigo-600/);
    await expect(page.getByTestId('link-content')).not.toHaveClass(/text-indigo-600/);
  });

  test('should handle 404 pages correctly', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/non-existent-page');
    
    // Should show 404 page
    await expect(page.getByText('Page Not Found')).toBeVisible();
    await expect(page.getByText("The page you're looking for doesn't exist.")).toBeVisible();
    
    // Should have a home link
    const homeLink = page.getByRole('link', { name: 'Go Home' });
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    
    // Should navigate back to home
    await expect(page).toHaveURL('/');
  });

  test('should show proper contrast and accessibility', async ({ page }) => {
    // Test that all navigation elements have proper contrast and accessibility attributes
    
    // Check ARIA labels
    await expect(page.getByRole('navigation').first()).toHaveAttribute('aria-label', 'Main navigation');
    
    // Check logo has proper accessibility
    const logo = page.getByText('Must Be Viral');
    await expect(logo).toHaveAttribute('aria-label', 'Must Be Viral - Home');
    
    // Check navigation links have aria-current when active
    await page.goto('/dashboard');
    await expect(page.getByTestId('link-dashboard')).toHaveAttribute('aria-current', 'page');
    
    await page.goto('/content');
    await expect(page.getByTestId('link-content')).toHaveAttribute('aria-current', 'page');
  });

  test('should work with all viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 }, // Small mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1024, height: 768 }, // Desktop
      { width: 1920, height: 1080 }, // Large desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Navigation should always be visible
      await expect(page.getByRole('navigation').first()).toBeVisible();
      
      // Logo should always be visible
      await expect(page.getByText('Must Be Viral')).toBeVisible();
      
      // Test navigation works at this size
      if (viewport.width >= 768) {
        // Desktop navigation
        await expect(page.getByTestId('link-dashboard')).toBeVisible();
        await page.getByTestId('link-content').click();
        await expect(page).toHaveURL('/content');
      } else {
        // Mobile navigation
        await expect(page.getByTestId('button-mobile-menu')).toBeVisible();
        await expect(page.getByTestId('bottom-link-dashboard')).toBeVisible();
        await page.getByTestId('bottom-link-content').click();
        await expect(page).toHaveURL('/content');
      }
    }
  });
});