import { defineConfig, devices } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

/**
 * Accessibility Testing Configuration for Must Be Viral V2
 *
 * This configuration runs automated accessibility tests using axe-core
 * to ensure WCAG 2.1 AA compliance across the application.
 */
export default defineConfig({
  testDir: './e2e/a11y',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter configuration */
  reporter: [
    ['html', { outputFolder: 'playwright-report/a11y' }],
    ['json', { outputFile: 'test-results/a11y-results.json' }],
    ['junit', { outputFile: 'test-results/a11y-results.xml' }]
  ],

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-a11y',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate users who rely on keyboard navigation
        hasTouch: false,
      },
      testMatch: '**/*.a11y.spec.ts',
    },

    {
      name: 'firefox-a11y',
      use: {
        ...devices['Desktop Firefox'],
        // Test with high contrast mode
        colorScheme: 'dark',
      },
      testMatch: '**/*.a11y.spec.ts',
    },

    {
      name: 'webkit-a11y',
      use: {
        ...devices['Desktop Safari'],
        // Test with reduced motion
        reducedMotion: 'reduce',
      },
      testMatch: '**/*.a11y.spec.ts',
    },

    /* Mobile accessibility testing */
    {
      name: 'Mobile Chrome A11y',
      use: {
        ...devices['Pixel 5'],
        // Test with screen reader simulation
        hasTouch: true,
      },
      testMatch: '**/*.a11y.spec.ts',
    },

    {
      name: 'Mobile Safari A11y',
      use: {
        ...devices['iPhone 12'],
        // Test with voice control simulation
        hasTouch: true,
      },
      testMatch: '**/*.a11y.spec.ts',
    },
  ],

  /* Global setup for accessibility testing */
  globalSetup: require.resolve('./e2e/global-setup-a11y.ts'),

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});