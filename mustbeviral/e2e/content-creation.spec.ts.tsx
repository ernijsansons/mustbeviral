// E2E Tests: Content Creation Flow
// Critical user journey: Create content → AI enhancement → Publish

import { _test, expect, Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// Page object for content creation
class ContentPage {
  constructor(private page: Page) {}

  async navigateToCreateContent() {
    await this.page.goto('/dashboard');
    await this.page.click('[data-testid="create-content-button"]');
    await expect(this.page).toHaveURL(/.*content\/create/);
  }

  async selectContentType(type: 'news_article' | 'social_post' | 'blog_post') {
    await this.page.click(`[data-testid="content-type-${type}"]`);
  }

  async fillContentForm(title: string, body: string) {
    await this.page.fill('[data-testid="content-title"]', title);
    await this.page.fill('[data-testid="content-body"]', body);
  }

  async addTags(tags: string[]) {
    for (const tag of tags) {
      await this.page.fill('[data-testid="tag-input"]', tag);
      await this.page.press('[data-testid="tag-input"]', 'Enter');
    }
  }

  async selectCategory(category: string) {
    await this.page.selectOption('[data-testid="content-category"]', category);
  }

  async uploadImage(filePath: string) {
    await this.page.setInputFiles('[data-testid="image-upload"]', filePath);
  }

  async enableAIEnhancement() {
    await this.page.click('[data-testid="ai-enhance-toggle"]');
  }

  async selectAIEnhancementOptions(options: string[]) {
    for (const option of options) {
      await this.page.check(`[data-testid="ai-option-${option}"]`);
    }
  }

  async applyAISuggestions() {
    await this.page.click('[data-testid="apply-ai-suggestions"]');
  }

  async saveDraft() {
    await this.page.click('[data-testid="save-draft-button"]');
  }

  async publishContent() {
    await this.page.click('[data-testid="publish-button"]');
  }

  async scheduleContent(date: string, time: string) {
    await this.page.click('[data-testid="schedule-button"]');
    await this.page.fill('[data-testid="schedule-date"]', date);
    await this.page.fill('[data-testid="schedule-time"]', time);
    await this.page.click('[data-testid="confirm-schedule"]');
  }
}

// Test setup helper
async function setupAuthenticatedUser(page: Page) {
  const user = {
    email: `creator.${randomBytes(8).toString('hex')}@mustbeviral.com`,
    username: `creator_${randomBytes(4).toString('hex')}`,
    password: 'TestPassword123!',
    role: 'creator'
  };

  // Register user
  await page.goto('/register');
  await page.fill('[data-testid="register-email"]', user.email);
  await page.fill('[data-testid="register-username"]', user.username);
  await page.fill('[data-testid="register-password"]', user.password);
  await page.fill('[data-testid="register-confirm-password"]', user.password);
  await page.selectOption('[data-testid="register-role"]', user.role);
  await page.click('[data-testid="submit-button"]');

  // Skip onboarding for faster tests
  await page.waitForURL(/.*onboarding/);
  await page.click('[data-testid="skip-onboarding"]');
  await page.click('[data-testid="confirm-skip"]');

  return user;
}

test.describe('Content Creation Flow', () => {
  let contentPage: ContentPage;

  test.beforeEach(async ({ page }) => {
    contentPage = new ContentPage(page);
    await setupAuthenticatedUser(page);
  });

  test('Creator can create a blog post', async ({ page }) => {
    // Navigate to content creation
    await contentPage.navigateToCreateContent();

    // Select content type
    await contentPage.selectContentType('blog_post');

    // Fill content form
    const title = `Test Blog Post ${Date.now()}`;
    const body = 'This is a comprehensive blog post about the latest trends in technology and innovation.';
    await contentPage.fillContentForm(title, body);

    // Add metadata
    await contentPage.addTags(['technology', 'innovation', 'trends']);
    await contentPage.selectCategory('Technology');

    // Save as draft
    await contentPage.saveDraft();

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Draft saved');

    // Verify content appears in drafts
    await page.goto('/dashboard/content/drafts');
    await expect(page.locator(`[data-testid="content-title"]`)).toContainText(title);
  });

  test('Creator can publish content immediately', async ({ page }) => {
    // Navigate to content creation
    await contentPage.navigateToCreateContent();

    // Select content type
    await contentPage.selectContentType('news_article');

    // Fill content form
    const title = `Breaking News ${Date.now()}`;
    const body = 'This is an important news article about recent developments.';
    await contentPage.fillContentForm(title, body);

    // Publish immediately
    await contentPage.publishContent();

    // Confirm publication
    await page.click('[data-testid="confirm-publish"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Published successfully');

    // Verify content appears in published section
    await page.goto('/dashboard/content/published');
    await expect(page.locator(`[data-testid="content-title"]`)).toContainText(title);
    await expect(page.locator('[data-testid="content-status"]')).toContainText('Published');
  });

  test('Creator can schedule content for future publication', async ({ page }) => {
    // Navigate to content creation
    await contentPage.navigateToCreateContent();

    // Fill content
    await contentPage.selectContentType('social_post');
    await contentPage.fillContentForm(
      'Scheduled Post',
      'This post will be published in the future.'
    );

    // Schedule for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await contentPage.scheduleContent(dateStr, '14:00');

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Scheduled');

    // Verify appears in scheduled content
    await page.goto('/dashboard/content/scheduled');
    await expect(page.locator('[data-testid="scheduled-date"]')).toContainText(dateStr);
  });

  test('AI enhancement improves content quality', async ({ page }) => {
    // Navigate to content creation
    await contentPage.navigateToCreateContent();

    // Create basic content
    await contentPage.selectContentType('blog_post');
    await contentPage.fillContentForm(
      'Basic Title',
      'This is basic content that needs improvement.'
    );

    // Enable AI enhancement
    await contentPage.enableAIEnhancement();

    // Select enhancement options
    await contentPage.selectAIEnhancementOptions([
      'improve-grammar',
      'enhance-seo',
      'suggest-headlines',
      'expand-content'
    ]);

    // Wait for AI processing
    await page.click('[data-testid="enhance-with-ai"]');
    await page.waitForSelector('[data-testid="ai-suggestions"]', { timeout: 10000 });

    // Verify AI suggestions appear
    await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggested-title"]')).toHaveCount(3); // 3 title suggestions
    await expect(page.locator('[data-testid="enhanced-content"]')).toBeVisible();

    // Apply AI suggestions
    await contentPage.applyAISuggestions();

    // Verify content is updated
    const updatedTitle = await page.inputValue('[data-testid="content-title"]');
    expect(updatedTitle).not.toBe('Basic Title');

    const updatedBody = await page.inputValue('[data-testid="content-body"]');
    expect(updatedBody.length).toBeGreaterThan(50);
  });

  test('Image upload and optimization works', async ({ page }) => {
    // Navigate to content creation
    await contentPage.navigateToCreateContent();

    // Fill basic content
    await contentPage.selectContentType('blog_post');
    await contentPage.fillContentForm('Post with Image', 'Content with visual elements');

    // Upload image (create test image)
    const testImagePath = './test-assets/test-image.jpg';
    await contentPage.uploadImage(testImagePath);

    // Wait for upload
    await page.waitForSelector('[data-testid="image-preview"]');

    // Verify image preview
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="image-size"]')).toBeVisible();

    // Verify image optimization options
    await expect(page.locator('[data-testid="image-alt-text"]')).toBeVisible();
    await page.fill('[data-testid="image-alt-text"]', 'Test image description');
  });

  test('Content validation prevents empty submissions', async ({ page }) => {
    // Navigate to content creation
    await contentPage.navigateToCreateContent();

    // Try to publish without content
    await contentPage.publishContent();

    // Verify validation errors
    await expect(page.locator('[data-testid="title-error"]')).toContainText(/required/i);
    await expect(page.locator('[data-testid="body-error"]')).toContainText(/required/i);
    await expect(page.locator('[data-testid="type-error"]')).toContainText(/select.*type/i);
  });

  test('Auto-save prevents content loss', async ({ page }) => {
    // Navigate to content creation
    await contentPage.navigateToCreateContent();

    // Start creating content
    await contentPage.selectContentType('blog_post');
    const title = `Auto-save Test ${Date.now()}`;
    await contentPage.fillContentForm(title, 'This content should be auto-saved');

    // Wait for auto-save (usually triggers after 3-5 seconds of inactivity)
    await page.waitForTimeout(5000);

    // Verify auto-save indicator
    await expect(page.locator('[data-testid="auto-save-status"]')).toContainText(/saved/i);

    // Refresh page
    await page.reload();

    // Verify content is restored
    const restoredTitle = await page.inputValue('[data-testid="content-title"]');
    expect(restoredTitle).toBe(title);
  });

  test('Content preview shows accurate representation', async ({ page }) => {
    // Navigate to content creation
    await contentPage.navigateToCreateContent();

    // Create content
    await contentPage.selectContentType('social_post');
    await contentPage.fillContentForm(
      'Preview Test',
      'This is how the content will look when published. #test #preview'
    );

    // Open preview
    await page.click('[data-testid="preview-button"]');

    // Verify preview modal
    await expect(page.locator('[data-testid="preview-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-title"]')).toContainText('Preview Test');
    await expect(page.locator('[data-testid="preview-body"]')).toContainText('#test #preview');

    // Verify platform-specific previews
    await page.click('[data-testid="preview-twitter"]');
    await expect(page.locator('[data-testid="twitter-preview"]')).toBeVisible();

    await page.click('[data-testid="preview-linkedin"]');
    await expect(page.locator('[data-testid="linkedin-preview"]')).toBeVisible();
  });

  test('Bulk actions work for multiple content items', async ({ page }) => {
    // Create multiple content items
    for (let i = 0; i < 3; i++) {
      await contentPage.navigateToCreateContent();
      await contentPage.selectContentType('blog_post');
      await contentPage.fillContentForm(
        `Bulk Test ${i}`,
        `Content item ${i}`
      );
      await contentPage.saveDraft();
    }

    // Navigate to content list
    await page.goto('/dashboard/content/drafts');

    // Select multiple items
    await page.check('[data-testid="select-all"]');

    // Verify bulk actions menu appears
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();

    // Perform bulk publish
    await page.click('[data-testid="bulk-publish"]');
    await page.click('[data-testid="confirm-bulk-action"]');

    // Verify success
    await expect(page.locator('[data-testid="bulk-action-success"]')).toContainText('3 items published');

    // Verify items moved to published
    await page.goto('/dashboard/content/published');
    await expect(page.locator('[data-testid="content-item"]')).toHaveCount(3);
  });

  test('Content analytics are tracked after publication', async ({ page }) => {
    // Create and publish content
    await contentPage.navigateToCreateContent();
    await contentPage.selectContentType('blog_post');
    const title = `Analytics Test ${Date.now()}`;
    await contentPage.fillContentForm(title, 'Content for analytics tracking');
    await contentPage.publishContent();
    await page.click('[data-testid="confirm-publish"]');

    // Navigate to content analytics
    await page.goto('/dashboard/content/analytics');

    // Verify content appears in analytics
    await expect(page.locator(`[data-testid="content-analytics-${title}"]`)).toBeVisible();
    await expect(page.locator('[data-testid="view-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="engagement-rate"]')).toBeVisible();
  });
});