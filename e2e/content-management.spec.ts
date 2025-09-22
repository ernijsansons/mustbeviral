/**
 * End-to-End Tests - Content Management Flow
 * Comprehensive testing of content creation, editing, and management
 */

import { _test, expect, type Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// Test data for content management
const generateTestContent = () => ({
  title: `Test Content ${randomBytes(4).toString('hex')}`,
  description: `This is a test content description for E2E testing ${Date.now()}`,
  url: 'https://example.com/test-video.mp4',
  type: 'video',
  tags: ['test', 'e2e', 'automation']
});

const generateTestUser = () => ({
  email: `content.test.${randomBytes(4).toString('hex')}@mustbeviral.com`,
  username: `contentuser_${randomBytes(4).toString('hex')}`,
  password: 'ContentTest123!',
  role: 'creator'
});

// Page objects for content management
class ContentManagementPage {
  constructor(private page: Page) {}

  async navigateToContentDashboard() {
    await this.page.goto('/dashboard/content');
    await expect(this.page).toHaveURL(/.*dashboard/content/);
  }

  async createNewContent(content: ReturnType<typeof generateTestContent>) {
    await this.page.click('[data-testid="create-content-button"]');
    await expect(this.page.locator('[data-testid="content-form"]')).toBeVisible();

    await this.page.fill('[data-testid="content-title"]', content.title);
    await this.page.fill('[data-testid="content-description"]', content.description);
    await this.page.fill('[data-testid="content-url"]', content.url);
    await this.page.selectOption('[data-testid="content-type"]', content.type);

    // Add tags
    for (const tag of content.tags) {
      await this.page.fill('[data-testid="tag-input"]', tag);
      await this.page.press('[data-testid="tag-input"]', 'Enter');
    }

    await this.page.click('[data-testid="submit-content"]');
  }

  async editContent(contentTitle: string, newData: Partial<ReturnType<typeof generateTestContent>>) {
    await this.page.click(`[data-testid="content-item"][data-title="${contentTitle}"] [data-testid="edit-button"]`);
    await expect(this.page.locator('[data-testid="content-form"]')).toBeVisible();

    if (newData.title) {
      await this.page.fill('[data-testid="content-title"]', newData.title);
    }
    if (newData.description) {
      await this.page.fill('[data-testid="content-description"]', newData.description);
    }

    await this.page.click('[data-testid="update-content"]');
  }

  async deleteContent(contentTitle: string) {
    await this.page.click(`[data-testid="content-item"][data-title="${contentTitle}"] [data-testid="delete-button"]`);
    await this.page.click('[data-testid="confirm-delete"]');
  }

  async searchContent(query: string) {
    await this.page.fill('[data-testid="content-search"]', query);
    await this.page.press('[data-testid="content-search"]', 'Enter');
  }

  async filterByType(type: string) {
    await this.page.selectOption('[data-testid="content-type-filter"]', type);
  }

  async sortBy(sortOption: string) {
    await this.page.selectOption('[data-testid="content-sort"]', sortOption);
  }
}

class AuthHelper {
  constructor(private page: Page) {}

  async loginAsCreator(user: ReturnType<typeof generateTestUser>) {
    await this.page.goto('/register');
    await this.page.fill('[data-testid="register-email"]', user.email);
    await this.page.fill('[data-testid="register-username"]', user.username);
    await this.page.fill('[data-testid="register-password"]', user.password);
    await this.page.fill('[data-testid="register-confirm-password"]', user.password);
    await this.page.selectOption('[data-testid="register-role"]', user.role);
    await this.page.click('[data-testid="submit-button"]');
    await expect(this.page).toHaveURL(/.*dashboard/);
  }
}

test.describe('Content Management Flow', () => {
  let contentPage: ContentManagementPage;
  let authHelper: AuthHelper;
  let testUser: ReturnType<typeof generateTestUser>;
  let testContent: ReturnType<typeof generateTestContent>;

  test.beforeEach(async ({ page }) => {
    contentPage = new ContentManagementPage(page);
    authHelper = new AuthHelper(page);
    testUser = generateTestUser();
    testContent = generateTestContent();

    // Login as a creator
    await authHelper.loginAsCreator(testUser);
  });

  test.describe('Content Creation', () => {
    test('should create new video content successfully', async ({ page }) => {
      await contentPage.navigateToContentDashboard();
      await contentPage.createNewContent(testContent);

      // Verify content was created
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/created successfully/i);
      await expect(page.locator(`[data-testid="content-item"][data-title="${testContent.title}"]`)).toBeVisible();

      // Verify content details
      const contentItem = page.locator(`[data-testid="content-item"][data-title="${testContent.title}"]`);
      await expect(contentItem.locator('[data-testid="content-type"]')).toContainText('video');
      await expect(contentItem.locator('[data-testid="content-status"]')).toContainText(/pending|active/i);
    });

    test('should validate required fields in content creation', async ({ page }) => {
      await contentPage.navigateToContentDashboard();

      await page.click('[data-testid="create-content-button"]');
      await page.click('[data-testid="submit-content"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="title-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="url-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="type-error"]')).toBeVisible();
    });

    test('should validate URL format in content creation', async ({ page }) => {
      await contentPage.navigateToContentDashboard();

      await page.click('[data-testid="create-content-button"]');
      await page.fill('[data-testid="content-title"]', testContent.title);
      await page.fill('[data-testid="content-url"]', 'invalid-url');
      await page.selectOption('[data-testid="content-type"]', testContent.type);
      await page.click('[data-testid="submit-content"]');

      // Verify URL validation error
      await expect(page.locator('[data-testid="url-error"]')).toContainText(/valid URL/i);
    });

    test('should create different content types (video, image, audio)', async ({ page }) => {
      const contentTypes = [
        { type: 'video', url: 'https://example.com/video.mp4' },
        { type: 'image', url: 'https://example.com/image.jpg' },
        { type: 'audio', url: 'https://example.com/audio.mp3' }
      ];

      for (const contentType of contentTypes) {
        const content = {
          ...testContent,
          title: `${testContent.title} - ${contentType.type}`,
          type: contentType.type,
          url: contentType.url
        };

        await contentPage.navigateToContentDashboard();
        await contentPage.createNewContent(content);

        await expect(page.locator('[data-testid="success-message"]')).toContainText(/created successfully/i);
        await expect(page.locator(`[data-testid="content-item"][data-title="${content.title}"]`)).toBeVisible();
      }
    });

    test('should add and display tags correctly', async ({ page }) => {
      await contentPage.navigateToContentDashboard();
      await contentPage.createNewContent(testContent);

      // Verify tags are displayed
      const contentItem = page.locator(`[data-testid="content-item"][data-title="${testContent.title}"]`);
      for (const tag of testContent.tags) {
        await expect(contentItem.locator(`[data-testid="tag"][data-tag="${tag}"]`)).toBeVisible();
      }
    });
  });

  test.describe('Content Editing', () => {
    test.beforeEach(async ({ page }) => {
      // Create content to edit
      await contentPage.navigateToContentDashboard();
      await contentPage.createNewContent(testContent);
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should edit content title and description', async ({ page }) => {
      const updatedData = {
        title: `Updated ${testContent.title}`,
        description: `Updated ${testContent.description}`
      };

      await contentPage.editContent(testContent.title, updatedData);

      // Verify content was updated
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/updated successfully/i);
      await expect(page.locator(`[data-testid="content-item"][data-title="${updatedData.title}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="content-item"][data-title="${testContent.title}"]`)).not.toBeVisible();
    });

    test('should preserve unchanged fields when editing', async ({ page }) => {
      const originalUrl = testContent.url;
      const originalType = testContent.type;

      await contentPage.editContent(testContent.title, {
        title: `Updated ${testContent.title}`
      });

      // Check that unchanged fields are preserved
      const contentItem = page.locator(`[data-testid="content-item"][data-title="Updated ${testContent.title}"]`);
      await expect(contentItem.locator('[data-testid="content-url"]')).toContainText(originalUrl);
      await expect(contentItem.locator('[data-testid="content-type"]')).toContainText(originalType);
    });

    test('should show loading state during content updates', async ({ page }) => {
      await page.click(`[data-testid="content-item"][data-title="${testContent.title}"] [data-testid="edit-button"]`);
      await page.fill('[data-testid="content-title"]', `Updated ${testContent.title}`);

      const updateButton = page.locator('[data-testid="update-content"]');
      await updateButton.click();

      // Should show loading state
      await expect(updateButton).toHaveAttribute('disabled', '');
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    });
  });

  test.describe('Content Deletion', () => {
    test.beforeEach(async ({ page }) => {
      // Create content to delete
      await contentPage.navigateToContentDashboard();
      await contentPage.createNewContent(testContent);
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should delete content with confirmation', async ({ page }) => {
      await contentPage.deleteContent(testContent.title);

      // Verify content was deleted
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/deleted successfully/i);
      await expect(page.locator(`[data-testid="content-item"][data-title="${testContent.title}"]`)).not.toBeVisible();
    });

    test('should cancel deletion when user cancels confirmation', async ({ page }) => {
      await page.click(`[data-testid="content-item"][data-title="${testContent.title}"] [data-testid="delete-button"]`);
      await page.click('[data-testid="cancel-delete"]');

      // Verify content is still there
      await expect(page.locator(`[data-testid="content-item"][data-title="${testContent.title}"]`)).toBeVisible();
    });

    test('should show confirmation dialog with content details', async ({ page }) => {
      await page.click(`[data-testid="content-item"][data-title="${testContent.title}"] [data-testid="delete-button"]`);

      // Verify confirmation dialog shows content details
      const confirmDialog = page.locator('[data-testid="delete-confirmation"]');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText(testContent.title);
      await expect(confirmDialog).toContainText(/permanently delete/i);
    });
  });

  test.describe('Content Browsing and Search', () => {
    test.beforeEach(async ({ page }) => {
      // Create multiple test contents
      const contents = [
        { ...testContent, title: 'Video Content 1', type: 'video' },
        { ...testContent, title: 'Image Content 1', type: 'image' },
        { ...testContent, title: 'Audio Content 1', type: 'audio' }
      ];

      await contentPage.navigateToContentDashboard();

      for (const content of contents) {
        await contentPage.createNewContent(content);
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      }
    });

    test('should search content by title', async ({ page }) => {
      await contentPage.searchContent('Video Content');

      // Should show only video content
      await expect(page.locator('[data-testid="content-item"][data-title*="Video"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-item"][data-title*="Image"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="content-item"][data-title*="Audio"]')).not.toBeVisible();
    });

    test('should filter content by type', async ({ page }) => {
      await contentPage.filterByType('video');

      // Should show only video content
      await expect(page.locator('[data-testid="content-item"][data-type="video"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-item"][data-type="image"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="content-item"][data-type="audio"]')).not.toBeVisible();
    });

    test('should sort content by different criteria', async ({ page }) => {
      await contentPage.sortBy('title-asc');

      // Verify content is sorted alphabetically
      const contentTitles = await page.locator('[data-testid="content-item"] [data-testid="content-title"]').allTextContents();
      const sortedTitles = [...contentTitles].sort();
      expect(contentTitles).toEqual(sortedTitles);
    });

    test('should show empty state when no content matches search', async ({ page }) => {
      await contentPage.searchContent('NonExistentContent');

      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="empty-state"]')).toContainText(/no content found/i);
    });

    test('should clear search and show all content', async ({ page }) => {
      await contentPage.searchContent('Video');
      await expect(page.locator('[data-testid="content-item"]')).toHaveCount(1);

      await page.click('[data-testid="clear-search"]');
      await expect(page.locator('[data-testid="content-item"]')).toHaveCount(3);
    });
  });

  test.describe('Content Status Management', () => {
    test.beforeEach(async ({ page }) => {
      await contentPage.navigateToContentDashboard();
      await contentPage.createNewContent(testContent);
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should toggle content status between active and inactive', async ({ page }) => {
      const contentItem = page.locator(`[data-testid="content-item"][data-title="${testContent.title}"]`);
      const statusToggle = contentItem.locator('[data-testid="status-toggle"]');

      // Toggle status
      await statusToggle.click();

      // Verify status changed
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/status updated/i);
      await expect(contentItem.locator('[data-testid="content-status"]')).toContainText(/inactive|paused/i);

      // Toggle back
      await statusToggle.click();
      await expect(contentItem.locator('[data-testid="content-status"]')).toContainText(/active/i);
    });

    test('should show confirmation when deactivating content', async ({ page }) => {
      const contentItem = page.locator(`[data-testid="content-item"][data-title="${testContent.title}"]`);
      await contentItem.locator('[data-testid="status-toggle"]').click();

      // Should show confirmation dialog
      const confirmDialog = page.locator('[data-testid="status-change-confirmation"]');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText(/deactivate|pause/i);

      await page.click('[data-testid="confirm-status-change"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });
  });

  test.describe('Content Analytics Access', () => {
    test.beforeEach(async ({ page }) => {
      await contentPage.navigateToContentDashboard();
      await contentPage.createNewContent(testContent);
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should navigate to content analytics page', async ({ page }) => {
      await page.click(`[data-testid="content-item"][data-title="${testContent.title}"] [data-testid="analytics-button"]`);

      // Should navigate to analytics page
      await expect(page).toHaveURL(/.*analytics/);
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-title"]')).toContainText(testContent.title);
    });

    test('should show basic analytics metrics', async ({ page }) => {
      await page.click(`[data-testid="content-item"][data-title="${testContent.title}"] [data-testid="analytics-button"]`);

      // Should show analytics metrics
      await expect(page.locator('[data-testid="views-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="shares-metric"]')).toBeVisible();
    });
  });

  test.describe('Bulk Content Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Create multiple contents for bulk operations
      const contents = [
        { ...testContent, title: 'Bulk Test 1' },
        { ...testContent, title: 'Bulk Test 2' },
        { ...testContent, title: 'Bulk Test 3' }
      ];

      await contentPage.navigateToContentDashboard();

      for (const content of contents) {
        await contentPage.createNewContent(content);
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      }
    });

    test('should select multiple content items', async ({ page }) => {
      await page.check('[data-testid="content-item"][data-title="Bulk Test 1"] [data-testid="select-checkbox"]');
      await page.check('[data-testid="content-item"][data-title="Bulk Test 2"] [data-testid="select-checkbox"]');

      // Should show bulk actions
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 selected');
    });

    test('should perform bulk delete operation', async ({ page }) => {
      await page.check('[data-testid="content-item"][data-title="Bulk Test 1"] [data-testid="select-checkbox"]');
      await page.check('[data-testid="content-item"][data-title="Bulk Test 2"] [data-testid="select-checkbox"]');

      await page.click('[data-testid="bulk-delete"]');
      await page.click('[data-testid="confirm-bulk-delete"]');

      // Verify bulk deletion
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/2.*deleted/i);
      await expect(page.locator('[data-testid="content-item"][data-title="Bulk Test 1"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="content-item"][data-title="Bulk Test 2"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="content-item"][data-title="Bulk Test 3"]')).toBeVisible();
    });

    test('should perform bulk status change', async ({ page }) => {
      await page.check('[data-testid="content-item"][data-title="Bulk Test 1"] [data-testid="select-checkbox"]');
      await page.check('[data-testid="content-item"][data-title="Bulk Test 2"] [data-testid="select-checkbox"]');

      await page.click('[data-testid="bulk-status-change"]');
      await page.selectOption('[data-testid="bulk-status-select"]', 'inactive');
      await page.click('[data-testid="confirm-bulk-status"]');

      // Verify bulk status change
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/2.*updated/i);
      await expect(page.locator('[data-testid="content-item"][data-title="Bulk Test 1"] [data-testid="content-status"]')).toContainText(/inactive/i);
      await expect(page.locator('[data-testid="content-item"][data-title="Bulk Test 2"] [data-testid="content-status"]')).toContainText(/inactive/i);
    });
  });
});