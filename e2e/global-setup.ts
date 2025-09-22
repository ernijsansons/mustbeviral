// Global Setup for E2E Tests
// Runs once before all tests

import { _chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  // Set up test environment variables
  process.env.TEST_ENV = 'e2e';
  process.env.NODE_ENV = 'test';

  // Ensure test database is ready
  await setupTestDatabase();

  // Warm up the application
  await warmUpApplication(config);

  // Create test users if needed
  await createTestUsers();

  console.log('✅ Global setup completed');
}

async function setupTestDatabase() {
  console.log('📦 Setting up test database...');

  // In a real scenario, you might:
  // - Create a test database
  // - Run migrations
  // - Seed initial data

  // For now, we'll use the development database
  // In production, use a separate test database
}

async function warmUpApplication(config: FullConfig) {
  console.log('🔥 Warming up application...');

  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:5173';

  // Launch a browser to warm up the app
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Visit the home page to ensure the app is running
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    console.log('✅ Application is responding');
  } catch (error) {
    console.error('❌ Failed to warm up application:', error);
    throw new Error('Application is not running. Please start the dev server.');
  } finally {
    await browser.close();
  }
}

async function createTestUsers() {
  console.log('👥 Creating test users...');

  // Define test users
  const testUsers = [
    {
      email: 'test.creator@mustbeviral.com',
      username: 'testcreator',
      password: 'TestPassword123!',
      role: 'creator'
    },
    {
      email: 'test.influencer@mustbeviral.com',
      username: 'testinfluencer',
      password: 'TestPassword123!',
      role: 'influencer'
    },
    {
      email: 'test.admin@mustbeviral.com',
      username: 'testadmin',
      password: 'TestPassword123!',
      role: 'admin'
    }
  ];

  // In a real scenario, create these users via API
  // For now, we'll assume they exist or will be created on demand

  // Store test user credentials for use in tests
  process.env.TEST_USERS = JSON.stringify(testUsers);
}

export default globalSetup;