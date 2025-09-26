/**
 * End-to-End Tests - Boost and Payment Flow
 * Comprehensive testing of content boosting and payment processing
 */

import { _test, expect, type Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// Test data for boost and payment flows
const generateTestUser = () => ({
  email: `boost.test.${randomBytes(4).toString('hex')}@mustbeviral.com`,
  username: `boostuser_${randomBytes(4).toString('hex')}`,
  password: 'BoostTest123!',
  role: 'creator'
});

const generateTestContent = () => ({
  title: `Boost Test Content ${randomBytes(4).toString('hex')}`,
  description: 'Content for boost testing',
  url: 'https://example.com/boost-test.mp4',
  type: 'video'
});

const generateTestBoost = () => ({
  amount: 50,
  duration: 7,
  targetAudience: 'global',
  objectives: ['views', 'engagement']
});

// Page objects for boost and payment flows
class BoostManagementPage {
  constructor(private page: Page) {}

  async navigateToBoostDashboard() {
    await this.page.goto('/dashboard/boost');
    await expect(this.page).toHaveURL(/.*dashboard\/boost/);
  }

  async createBoostCampaign(contentTitle: string, boostData: ReturnType<typeof generateTestBoost>) {
    await this.page.click('[data-testid="create-boost-button"]');
    await expect(this.page.locator('[data-testid="boost-form"]')).toBeVisible();

    // Select content to boost
    await this.page.selectOption('[data-testid="content-select"]', contentTitle);

    // Set boost parameters
    await this.page.fill('[data-testid="boost-amount"]', boostData.amount.toString());
    await this.page.selectOption('[data-testid="boost-duration"]', boostData.duration.toString());
    await this.page.selectOption('[data-testid="target-audience"]', boostData.targetAudience);

    // Select objectives
    for (const objective of boostData.objectives) {
      await this.page.check(`[data-testid="objective-${objective}"]`);
    }

    await this.page.click('[data-testid="proceed-to-payment"]');
  }

  async pauseBoost(boostId: string) {
    await this.page.click(`[data-testid="boost-item"][data-boost-id="${boostId}"] [data-testid="pause-button"]`);
    await this.page.click('[data-testid="confirm-pause"]');
  }

  async resumeBoost(boostId: string) {
    await this.page.click(`[data-testid="boost-item"][data-boost-id="${boostId}"] [data-testid="resume-button"]`);
    await this.page.click('[data-testid="confirm-resume"]');
  }

  async cancelBoost(boostId: string) {
    await this.page.click(`[data-testid="boost-item"][data-boost-id="${boostId}"] [data-testid="cancel-button"]`);
    await this.page.click('[data-testid="confirm-cancel"]');
  }

  async viewBoostAnalytics(boostId: string) {
    await this.page.click(`[data-testid="boost-item"][data-boost-id="${boostId}"] [data-testid="analytics-button"]`);
  }
}

class PaymentPage {
  constructor(private page: Page) {}

  async fillPaymentDetails(cardDetails: unknown = {}) {
    const defaultCard = {
      number: '4242424242424242',
      expiry: '12/34',
      cvc: '123',
      name: 'Test User',
      zipCode: '12345'
    };

    const card = { ...defaultCard, ...cardDetails };

    // Fill Stripe Elements (simulate)
    await this.page.fill('[data-testid="card-number"]', card.number);
    await this.page.fill('[data-testid="card-expiry"]', card.expiry);
    await this.page.fill('[data-testid="card-cvc"]', card.cvc);
    await this.page.fill('[data-testid="cardholder-name"]', card.name);
    await this.page.fill('[data-testid="billing-zip"]', card.zipCode);
  }

  async submitPayment() {
    await this.page.click('[data-testid="submit-payment"]');
  }

  async addPaymentMethod(cardDetails?: unknown) {
    await this.page.goto('/dashboard/settings/payment-methods');
    await this.page.click('[data-testid="add-payment-method"]');
    await this.fillPaymentDetails(cardDetails);
    await this.page.click('[data-testid="save-payment-method"]');
  }
}

class EarningsPage {
  constructor(private page: Page) {}

  async navigateToEarnings() {
    await this.page.goto('/dashboard/earnings');
    await expect(this.page).toHaveURL(/.*dashboard\/earnings/);
  }

  async requestPayout(amount: number) {
    await this.page.click('[data-testid="request-payout"]');
    await this.page.fill('[data-testid="payout-amount"]', amount.toString());
    await this.page.click('[data-testid="confirm-payout"]');
  }

  async connectBankAccount(bankDetails: unknown) {
    await this.page.click('[data-testid="connect-bank-account"]');
    await this.page.fill('[data-testid="account-number"]', bankDetails.accountNumber);
    await this.page.fill('[data-testid="routing-number"]', bankDetails.routingNumber);
    await this.page.fill('[data-testid="account-holder-name"]', bankDetails.accountHolderName);
    await this.page.click('[data-testid="verify-bank-account"]');
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

  async createTestContent(content: ReturnType<typeof generateTestContent>) {
    await this.page.goto('/dashboard/content');
    await this.page.click('[data-testid="create-content-button"]');
    await this.page.fill('[data-testid="content-title"]', content.title);
    await this.page.fill('[data-testid="content-description"]', content.description);
    await this.page.fill('[data-testid="content-url"]', content.url);
    await this.page.selectOption('[data-testid="content-type"]', content.type);
    await this.page.click('[data-testid="submit-content"]');
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
  }
}

test.describe('Boost and Payment Flow', () => {
  let boostPage: BoostManagementPage;
  let paymentPage: PaymentPage;
  let earningsPage: EarningsPage;
  let authHelper: AuthHelper;
  let testUser: ReturnType<typeof generateTestUser>;
  let testContent: ReturnType<typeof generateTestContent>;
  let testBoost: ReturnType<typeof generateTestBoost>;

  test.beforeEach(async ({ page }) => {
    boostPage = new BoostManagementPage(page);
    paymentPage = new PaymentPage(page);
    earningsPage = new EarningsPage(page);
    authHelper = new AuthHelper(page);
    testUser = generateTestUser();
    testContent = generateTestContent();
    testBoost = generateTestBoost();

    // Setup: Login and create content
    await authHelper.loginAsCreator(testUser);
    await authHelper.createTestContent(testContent);
  });

  test.describe('Boost Campaign Creation', () => {
    test('should create boost campaign with valid payment', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();
      await boostPage.createBoostCampaign(testContent.title, testBoost);

      // Should navigate to payment page
      await expect(page).toHaveURL(/.*payment/);
      await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();

      // Verify boost details in payment summary
      await expect(page.locator('[data-testid="boost-amount"]')).toContainText(`$${testBoost.amount}`);
      await expect(page.locator('[data-testid="boost-duration"]')).toContainText(`${testBoost.duration} days`);

      // Process payment
      await paymentPage.fillPaymentDetails();
      await paymentPage.submitPayment();

      // Should show payment success
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="boost-confirmation"]')).toContainText(/boost.*created/i);

      // Should redirect to boost dashboard
      await expect(page).toHaveURL(/.*dashboard\/boost/);

      // Verify boost appears in dashboard
      await expect(page.locator(`[data-testid="boost-item"][data-content="${testContent.title}"]`)).toBeVisible();
      await expect(page.locator('[data-testid="boost-status"]')).toContainText(/active|pending/i);
    });

    test('should validate boost amount minimum', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();

      await page.click('[data-testid="create-boost-button"]');
      await page.selectOption('[data-testid="content-select"]', testContent.title);
      await page.fill('[data-testid="boost-amount"]', '5');
      await page.click('[data-testid="proceed-to-payment"]');

      // Should show minimum amount error
      await expect(page.locator('[data-testid="amount-error"]')).toContainText(/minimum.*\$10/i);
    });

    test('should validate required fields in boost creation', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();

      await page.click('[data-testid="create-boost-button"]');
      await page.click('[data-testid="proceed-to-payment"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="content-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="duration-error"]')).toBeVisible();
    });

    test('should calculate boost cost correctly based on amount and duration', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();

      await page.click('[data-testid="create-boost-button"]');
      await page.selectOption('[data-testid="content-select"]', testContent.title);
      await page.fill('[data-testid="boost-amount"]', '100');
      await page.selectOption('[data-testid="boost-duration"]', '14');

      // Should show calculated total cost
      const expectedCost = 100 * 14; // Assuming daily rate calculation
      await expect(page.locator('[data-testid="total-cost"]')).toContainText(`$${expectedCost}`);
    });

    test('should show boost preview before payment', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();
      await boostPage.createBoostCampaign(testContent.title, testBoost);

      // Should show boost preview
      await expect(page.locator('[data-testid="boost-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-content-title"]')).toContainText(testContent.title);
      await expect(page.locator('[data-testid="preview-amount"]')).toContainText(`$${testBoost.amount}`);
      await expect(page.locator('[data-testid="preview-duration"]')).toContainText(`${testBoost.duration} days`);

      // Should show estimated reach
      await expect(page.locator('[data-testid="estimated-reach"]')).toBeVisible();
      await expect(page.locator('[data-testid="estimated-views"]')).toBeVisible();
    });
  });

  test.describe('Payment Processing', () => {
    test('should handle payment with valid credit card', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();
      await boostPage.createBoostCampaign(testContent.title, testBoost);

      await paymentPage.fillPaymentDetails({
        number: '4242424242424242',
        expiry: '12/34',
        cvc: '123'
      });
      await paymentPage.submitPayment();

      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    });

    test('should handle payment failure with invalid card', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();
      await boostPage.createBoostCampaign(testContent.title, testBoost);

      await paymentPage.fillPaymentDetails({
        number: '4000000000000002', // Declined card
        expiry: '12/34',
        cvc: '123'
      });
      await paymentPage.submitPayment();

      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-error"]')).toContainText(/declined|failed/i);
    });

    test('should validate payment form fields', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();
      await boostPage.createBoostCampaign(testContent.title, testBoost);

      await paymentPage.submitPayment();

      // Should show validation errors
      await expect(page.locator('[data-testid="card-number-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="expiry-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="cvc-error"]')).toBeVisible();
    });

    test('should show loading state during payment processing', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();
      await boostPage.createBoostCampaign(testContent.title, testBoost);

      await paymentPage.fillPaymentDetails();

      const submitButton = page.locator('[data-testid="submit-payment"]');
      await submitButton.click();

      // Should show loading state
      await expect(submitButton).toHaveAttribute('disabled', '');
      await expect(page.locator('[data-testid="payment-loading"]')).toBeVisible();
    });

    test('should save payment method for future use', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();
      await boostPage.createBoostCampaign(testContent.title, testBoost);

      await paymentPage.fillPaymentDetails();
      await page.check('[data-testid="save-payment-method"]');
      await paymentPage.submitPayment();

      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();

      // Navigate to payment methods
      await page.goto('/dashboard/settings/payment-methods');
      await expect(page.locator('[data-testid="saved-payment-method"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-last-four"]')).toContainText('4242');
    });
  });

  test.describe('Boost Management', () => {
    test.beforeEach(async ({ page }) => {
      // Create a boost first
      await boostPage.navigateToBoostDashboard();
      await boostPage.createBoostCampaign(testContent.title, testBoost);
      await paymentPage.fillPaymentDetails();
      await paymentPage.submitPayment();
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    });

    test('should pause active boost campaign', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();

      const boostItem = page.locator(`[data-testid="boost-item"][data-content="${testContent.title}"]`);
      const boostId = await boostItem.getAttribute('data-boost-id');

      await boostPage.pauseBoost(boostId!);

      // Verify boost is paused
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/paused/i);
      await expect(boostItem.locator('[data-testid="boost-status"]')).toContainText(/paused/i);
      await expect(boostItem.locator('[data-testid="resume-button"]')).toBeVisible();
    });

    test('should resume paused boost campaign', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();

      const boostItem = page.locator(`[data-testid="boost-item"][data-content="${testContent.title}"]`);
      const boostId = await boostItem.getAttribute('data-boost-id');

      // First pause, then resume
      await boostPage.pauseBoost(boostId!);
      await expect(boostItem.locator('[data-testid="boost-status"]')).toContainText(/paused/i);

      await boostPage.resumeBoost(boostId!);

      // Verify boost is resumed
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/resumed/i);
      await expect(boostItem.locator('[data-testid="boost-status"]')).toContainText(/active/i);
      await expect(boostItem.locator('[data-testid="pause-button"]')).toBeVisible();
    });

    test('should cancel boost campaign with refund calculation', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();

      const boostItem = page.locator(`[data-testid="boost-item"][data-content="${testContent.title}"]`);
      const boostId = await boostItem.getAttribute('data-boost-id');

      await boostPage.cancelBoost(boostId!);

      // Should show refund calculation
      await expect(page.locator('[data-testid="refund-amount"]')).toBeVisible();
      await expect(page.locator('[data-testid="refund-details"]')).toContainText(/refund/i);

      // Verify boost is cancelled
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/cancelled/i);
      await expect(boostItem.locator('[data-testid="boost-status"]')).toContainText(/cancelled/i);
    });

    test('should view boost analytics and performance', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();

      const boostItem = page.locator(`[data-testid="boost-item"][data-content="${testContent.title}"]`);
      const boostId = await boostItem.getAttribute('data-boost-id');

      await boostPage.viewBoostAnalytics(boostId!);

      // Should navigate to analytics page
      await expect(page).toHaveURL(/.*analytics/);
      await expect(page.locator('[data-testid="boost-analytics"]')).toBeVisible();

      // Should show performance metrics
      await expect(page.locator('[data-testid="impressions-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="clicks-metric"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-per-view"]')).toBeVisible();
    });

    test('should show boost performance in real-time', async ({ page }) => {
      await boostPage.navigateToBoostDashboard();

      const boostItem = page.locator(`[data-testid="boost-item"][data-content="${testContent.title}"]`);

      // Should show current performance metrics
      await expect(boostItem.locator('[data-testid="current-impressions"]')).toBeVisible();
      await expect(boostItem.locator('[data-testid="current-clicks"]')).toBeVisible();
      await expect(boostItem.locator('[data-testid="spent-amount"]')).toBeVisible();
      await expect(boostItem.locator('[data-testid="remaining-budget"]')).toBeVisible();
    });
  });

  test.describe('Earnings and Payouts', () => {
    test('should display earnings dashboard', async ({ page }) => {
      await earningsPage.navigateToEarnings();

      // Should show earnings overview
      await expect(page.locator('[data-testid="total-earnings"]')).toBeVisible();
      await expect(page.locator('[data-testid="pending-earnings"]')).toBeVisible();
      await expect(page.locator('[data-testid="available-for-payout"]')).toBeVisible();

      // Should show earnings breakdown
      await expect(page.locator('[data-testid="view-earnings"]')).toBeVisible();
      await expect(page.locator('[data-testid="engagement-earnings"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-earnings"]')).toBeVisible();
    });

    test('should connect bank account for payouts', async ({ page }) => {
      await earningsPage.navigateToEarnings();

      const bankDetails = {
        accountNumber: '123456789',
        routingNumber: '021000021',
        accountHolderName: 'Test User'
      };

      await earningsPage.connectBankAccount(bankDetails);

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/bank.*connected/i);
      await expect(page.locator('[data-testid="connected-bank"]')).toBeVisible();
      await expect(page.locator('[data-testid="bank-last-four"]')).toContainText('6789');
    });

    test('should request payout with minimum amount validation', async ({ page }) => {
      await earningsPage.navigateToEarnings();

      // Try to request payout below minimum
      await page.click('[data-testid="request-payout"]');
      await page.fill('[data-testid="payout-amount"]', '10');
      await page.click('[data-testid="confirm-payout"]');

      // Should show minimum amount error
      await expect(page.locator('[data-testid="payout-error"]')).toContainText(/minimum.*\$25/i);

      // Request valid payout
      await page.fill('[data-testid="payout-amount"]', '50');
      await page.click('[data-testid="confirm-payout"]');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText(/payout.*requested/i);
    });

    test('should display payout history', async ({ page }) => {
      await earningsPage.navigateToEarnings();

      await page.click('[data-testid="payout-history-tab"]');

      // Should show payout history table
      await expect(page.locator('[data-testid="payout-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="payout-table-headers"]')).toContainText(/Date.*Amount.*Status/);
    });

    test('should show earnings timeline and trends', async ({ page }) => {
      await earningsPage.navigateToEarnings();

      await page.click('[data-testid="earnings-timeline-tab"]');

      // Should show earnings chart
      await expect(page.locator('[data-testid="earnings-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="chart-controls"]')).toBeVisible();

      // Should allow period selection
      await page.selectOption('[data-testid="period-select"]', 'month');
      await expect(page.locator('[data-testid="earnings-chart"]')).toBeVisible();
    });
  });

  test.describe('Payment Method Management', () => {
    test('should add new payment method', async ({ page }) => {
      await paymentPage.addPaymentMethod({
        number: '4242424242424242',
        expiry: '12/35',
        cvc: '456',
        name: 'Test User 2'
      });

      await expect(page.locator('[data-testid="success-message"]')).toContainText(/payment.*added/i);
      await expect(page.locator('[data-testid="payment-method-list"]')).toContainText('4242');
    });

    test('should delete payment method', async ({ page }) => {
      // First add a payment method
      await paymentPage.addPaymentMethod();

      // Then delete it
      await page.click('[data-testid="payment-method-item"]:first-child [data-testid="delete-payment-method"]');
      await page.click('[data-testid="confirm-delete"]');

      await expect(page.locator('[data-testid="success-message"]')).toContainText(/payment.*removed/i);
    });

    test('should set default payment method', async ({ page }) => {
      // Add multiple payment methods
      await paymentPage.addPaymentMethod({ number: '4242424242424242' });
      await paymentPage.addPaymentMethod({ number: '5555555555554444' });

      // Set second as default
      await page.click('[data-testid="payment-method-item"]:nth-child(2) [data-testid="set-default"]');

      await expect(page.locator('[data-testid="success-message"]')).toContainText(/default.*updated/i);
      await expect(page.locator('[data-testid="payment-method-item"]:nth-child(2) [data-testid="default-badge"]')).toBeVisible();
    });
  });

  test.describe('Transaction History', () => {
    test('should display transaction history', async ({ page }) => {
      await page.goto('/dashboard/transactions');

      // Should show transaction table
      await expect(page.locator('[data-testid="transaction-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="transaction-headers"]')).toContainText(/Date.*Description.*Amount.*Status/);
    });

    test('should filter transactions by type', async ({ page }) => {
      await page.goto('/dashboard/transactions');

      await page.selectOption('[data-testid="transaction-type-filter"]', 'boost');

      // Should show only boost transactions
      await expect(page.locator('[data-testid="transaction-item"][data-type="boost"]')).toBeVisible();
      await expect(page.locator('[data-testid="transaction-item"][data-type="payout"]')).not.toBeVisible();
    });

    test('should filter transactions by date range', async ({ page }) => {
      await page.goto('/dashboard/transactions');

      await page.fill('[data-testid="date-from"]', '2025-01-01');
      await page.fill('[data-testid="date-to"]', '2025-01-31');
      await page.click('[data-testid="apply-date-filter"]');

      // Should show transactions within date range
      await expect(page.locator('[data-testid="transaction-item"]')).toBeVisible();
    });

    test('should export transaction data', async ({ page }) => {
      await page.goto('/dashboard/transactions');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-transactions"]');
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toContain('transactions');
      expect(download.suggestedFilename()).toContain('.csv');
    });
  });
});