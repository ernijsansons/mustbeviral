// Unit tests for Stripe billing integration
// LOG: TEST-STRIPE-1 - Stripe billing unit tests

const { StripeService } = require('../../src/lib/stripe');

describe('StripeService', () => {
  let stripeService;

  beforeEach(() => {
    console.log('LOG: TEST-STRIPE-SETUP-1 - Setting up Stripe service test');
    stripeService = new StripeService();
  });

  describe('Initialization', () => {
    test('should initialize in test mode', () => {
      console.log('LOG: TEST-STRIPE-INIT-1 - Testing initialization');
      
      expect(stripeService).toBeDefined();
      expect(stripeService.testMode).toBe(true);
    });

    test('should load subscription tiers', () => {
      console.log('LOG: TEST-STRIPE-INIT-2 - Testing tier loading');
      
      const tiers = stripeService.getSubscriptionTiers();
      expect(tiers).toHaveLength(3);
      expect(tiers.map(t => t.id)).toEqual(['free', 'standard', 'premium']);
    });
  });

  describe('Subscription Tiers', () => {
    test('should return correct tier structure', () => {
      console.log('LOG: TEST-STRIPE-TIERS-1 - Testing tier structure');
      
      const tiers = stripeService.getSubscriptionTiers();
      
      tiers.forEach(tier => {
        expect(tier).toHaveProperty('id');
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('price_id');
        expect(tier).toHaveProperty('price_per_month');
        expect(tier).toHaveProperty('features');
        expect(tier).toHaveProperty('limits');
        expect(typeof tier.price_per_month).toBe('number');
        expect(Array.isArray(tier.features)).toBe(true);
      });
    });

    test('should have correct pricing', () => {
      console.log('LOG: TEST-STRIPE-TIERS-2 - Testing tier pricing');
      
      const tiers = stripeService.getSubscriptionTiers();
      const freeTier = tiers.find(t => t.id === 'free');
      const standardTier = tiers.find(t => t.id === 'standard');
      const premiumTier = tiers.find(t => t.id === 'premium');
      
      expect(freeTier.price_per_month).toBe(0);
      expect(standardTier.price_per_month).toBe(19);
      expect(premiumTier.price_per_month).toBe(49);
    });

    test('should have correct usage limits', () => {
      console.log('LOG: TEST-STRIPE-TIERS-3 - Testing tier limits');
      
      const tiers = stripeService.getSubscriptionTiers();
      const freeTier = tiers.find(t => t.id === 'free');
      const premiumTier = tiers.find(t => t.id === 'premium');
      
      expect(freeTier.limits.text_tokens).toBe(10000);
      expect(premiumTier.limits.text_tokens).toBe(500000);
      expect(premiumTier.limits.text_tokens).toBeGreaterThan(freeTier.limits.text_tokens);
    });
  });

  describe('Customer Management', () => {
    test('should create customer successfully', async () => {
      console.log('LOG: TEST-STRIPE-CUSTOMER-1 - Testing customer creation');
      
      const customer = await stripeService.createCustomer('test@example.com', 'Test User');
      
      expect(customer).toBeDefined();
      expect(customer.id).toMatch(/^cus_test_/);
      expect(customer.email).toBe('test@example.com');
      expect(customer.name).toBe('Test User');
      expect(customer.metadata.platform).toBe('must-be-viral');
    });

    test('should handle customer creation errors', async () => {
      console.log('LOG: TEST-STRIPE-CUSTOMER-2 - Testing customer creation error handling');
      
      // Mock error by passing invalid data
      await expect(stripeService.createCustomer('')).rejects.toThrow('Failed to create Stripe customer');
    });
  });

  describe('Checkout Sessions', () => {
    test('should create checkout session successfully', async () => {
      console.log('LOG: TEST-STRIPE-CHECKOUT-1 - Testing checkout session creation');
      
      const session = await stripeService.createCheckoutSession(
        'cus_test_123',
        'price_test_standard',
        'https://example.com/success',
        'https://example.com/cancel'
      );
      
      expect(session).toBeDefined();
      expect(session.id).toMatch(/^cs_test_/);
      expect(session.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
      expect(session.customer).toBe('cus_test_123');
      expect(session.mode).toBe('subscription');
    });

    test('should handle checkout session errors', async () => {
      console.log('LOG: TEST-STRIPE-CHECKOUT-2 - Testing checkout session error handling');
      
      // Test with invalid parameters
      await expect(stripeService.createCheckoutSession('', '', '', '')).rejects.toThrow();
    });
  });

  describe('Webhook Processing', () => {
    test('should verify webhook signature successfully', () => {
      console.log('LOG: TEST-STRIPE-WEBHOOK-1 - Testing webhook signature verification');
      
      const mockEvent = {
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_123' } }
      };
      
      const payload = JSON.stringify(mockEvent);
      const signature = 'test_signature';
      
      const event = stripeService.verifyWebhookSignature(payload, signature);
      
      expect(event).toEqual(mockEvent);
      expect(event.type).toBe('checkout.session.completed');
    });

    test('should reject invalid webhook signature', () => {
      console.log('LOG: TEST-STRIPE-WEBHOOK-2 - Testing invalid webhook signature');
      
      const payload = JSON.stringify({ type: 'test' });
      const invalidSignature = 'invalid_signature';
      
      expect(() => {
        stripeService.verifyWebhookSignature(payload, invalidSignature);
      }).toThrow('Webhook signature verification failed');
    });

    test('should process checkout completed webhook', async () => {
      console.log('LOG: TEST-STRIPE-WEBHOOK-3 - Testing checkout completed webhook');
      
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            line_items: {
              data: [{ price: { id: 'price_test_standard' } }]
            }
          }
        }
      };
      
      const result = await stripeService.processWebhook(mockEvent);
      
      expect(result.action).toBe('subscription_created');
      expect(result.customer_id).toBe('cus_test_123');
      expect(result.subscription_id).toBe('sub_test_123');
      expect(result.tier_id).toBe('standard');
    });

    test('should process subscription updated webhook', async () => {
      console.log('LOG: TEST-STRIPE-WEBHOOK-4 - Testing subscription updated webhook');
      
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            cancel_at_period_end: false,
            items: {
              data: [{ price: { id: 'price_test_premium' } }]
            }
          }
        }
      };
      
      const result = await stripeService.processWebhook(mockEvent);
      
      expect(result.action).toBe('subscription_updated');
      expect(result.subscription_id).toBe('sub_test_123');
      expect(result.tier_id).toBe('premium');
      expect(result.status).toBe('active');
    });

    test('should process subscription deleted webhook', async () => {
      console.log('LOG: TEST-STRIPE-WEBHOOK-5 - Testing subscription deleted webhook');
      
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123'
          }
        }
      };
      
      const result = await stripeService.processWebhook(mockEvent);
      
      expect(result.action).toBe('subscription_canceled');
      expect(result.subscription_id).toBe('sub_test_123');
      expect(result.customer_id).toBe('cus_test_123');
      expect(result.canceled_at).toBeDefined();
    });

    test('should process payment succeeded webhook', async () => {
      console.log('LOG: TEST-STRIPE-WEBHOOK-6 - Testing payment succeeded webhook');
      
      const mockEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            subscription: 'sub_test_123',
            customer: 'cus_test_123',
            amount_paid: 1900 // $19.00 in cents
          }
        }
      };
      
      const result = await stripeService.processWebhook(mockEvent);
      
      expect(result.action).toBe('payment_succeeded');
      expect(result.subscription_id).toBe('sub_test_123');
      expect(result.amount_paid).toBe(1900);
    });

    test('should process payment failed webhook', async () => {
      console.log('LOG: TEST-STRIPE-WEBHOOK-7 - Testing payment failed webhook');
      
      const mockEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: 'sub_test_123',
            customer: 'cus_test_123',
            amount_due: 1900
          }
        }
      };
      
      const result = await stripeService.processWebhook(mockEvent);
      
      expect(result.action).toBe('payment_failed');
      expect(result.subscription_id).toBe('sub_test_123');
      expect(result.amount_due).toBe(1900);
    });

    test('should handle unrecognized webhook events', async () => {
      console.log('LOG: TEST-STRIPE-WEBHOOK-8 - Testing unrecognized webhook events');
      
      const mockEvent = {
        type: 'unknown.event.type',
        data: { object: {} }
      };
      
      const result = await stripeService.processWebhook(mockEvent);
      
      expect(result.handled).toBe(false);
      expect(result.event_type).toBe('unknown.event.type');
    });
  });

  describe('Commission Calculations', () => {
    test('should calculate commission correctly with default rate', () => {
      console.log('LOG: TEST-STRIPE-COMMISSION-1 - Testing default commission calculation');
      
      const commission = stripeService.calculateCommission(100);
      
      expect(commission).toBe(15); // 15% of 100
    });

    test('should calculate commission with custom rate', () => {
      console.log('LOG: TEST-STRIPE-COMMISSION-2 - Testing custom commission calculation');
      
      const commission = stripeService.calculateCommission(100, 0.20);
      
      expect(commission).toBe(20); // 20% of 100
    });

    test('should handle edge cases in commission calculation', () => {
      console.log('LOG: TEST-STRIPE-COMMISSION-3 - Testing commission edge cases');
      
      expect(stripeService.calculateCommission(0)).toBe(0);
      expect(stripeService.calculateCommission(1, 0.1)).toBe(0.1);
      expect(stripeService.calculateCommission(1000, 0.15)).toBe(150);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing environment variables gracefully', () => {
      console.log('LOG: TEST-STRIPE-ERROR-1 - Testing missing environment variables');
      
      // Service should still initialize in test mode
      expect(stripeService).toBeDefined();
    });

    test('should handle API errors gracefully', async () => {
      console.log('LOG: TEST-STRIPE-ERROR-2 - Testing API error handling');
      
      // Test with invalid data that would cause API errors
      await expect(stripeService.createCustomer('')).rejects.toThrow();
    });
  });
});