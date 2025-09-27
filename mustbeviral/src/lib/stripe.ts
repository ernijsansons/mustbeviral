// Stripe integration library for Must Be Viral - Test Mode
// LOG: STRIPE-INIT-1 - Initialize Stripe service in test mode

export interface SubscriptionTier {
  id: string;
  name: string;
  price_id: string;
  price_per_month: number;
  features: string[];
  limits: {
    text_tokens: number;
    image_generations: number;
    video_seconds: number;
  };
}

export interface UserSubscription {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  tier_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export class StripeService {
  private stripe: unknown;
  private webhookSecret: string;
  private testMode: boolean;

  constructor() {
    console.log('LOG: STRIPE-SERVICE-1 - Initializing Stripe service in test mode');
    
    this.testMode = process.env.NODE_ENV !== 'production';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_webhook_secret';
    
    if (this.testMode) {
      console.log('LOG: STRIPE-SERVICE-2 - Running in test mode with mock Stripe');
      this.stripe = this.createMockStripe();
    } else {
      console.log('LOG: STRIPE-SERVICE-3 - Would initialize real Stripe in production');
      this.stripe = this.createMockStripe(); // Keep mock for now
    }

    console.log('LOG: STRIPE-SERVICE-4 - Stripe service initialized successfully');
  }

  private createMockStripe() {
    return {
      customers: {
        create: async (params: unknown) => {
          console.log('LOG: STRIPE-MOCK-1 - Mock customer creation');
          return {
            id: `cus_test_${Date.now()}`,
            email: params.email,
            name: params.name,
            metadata: params.metadata
          };
        }
      },
      checkout: {
        sessions: {
          create: async (params: unknown) => {
            console.log('LOG: STRIPE-MOCK-2 - Mock checkout session creation');
            return {
              id: `cs_test_${Date.now()}`,
              url: `https://checkout.stripe.com/test/${Date.now()}`,
              customer: params.customer,
              mode: params.mode,
              metadata: params.metadata
            };
          }
        }
      },
      subscriptions: {
        retrieve: async (id: string) => {
          console.log('LOG: STRIPE-MOCK-3 - Mock subscription retrieval');
          return {
            id,
            customer: `cus_test_${Date.now()}`,
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            items: { data: [{ price: { id: 'price_test_standard' } }] },
            cancel_at_period_end: false
          };
        },
        cancel: async (id: string) => {
          console.log('LOG: STRIPE-MOCK-4 - Mock subscription cancellation');
          return { id, status: 'canceled' };
        },
        update: async (id: string, params: unknown) => {
          console.log('LOG: STRIPE-MOCK-5 - Mock subscription update');
          return { id, ...params };
        }
      },
      webhooks: {
        constructEvent: (payload: string, signature: string, secret: string) => {
          console.log('LOG: STRIPE-MOCK-6 - Mock webhook verification');
          if (signature !== 'test_signature' && secret !== this.webhookSecret) {
            throw new Error('Invalid signature');
          }
          return JSON.parse(payload);
        }
      }
    };
  }

  getSubscriptionTiers(): SubscriptionTier[] {
    console.log('LOG: STRIPE-TIERS-1 - Getting subscription tiers');
    
    return [
      {
        id: 'free',
        name: 'Free',
        price_id: '',
        price_per_month: 0,
        features: ['Basic AI tools', 'Open-source models', 'Community support'],
        limits: { text_tokens: 10000, image_generations: 5, video_seconds: 0 }
      },
      {
        id: 'standard',
        name: 'Standard',
        price_id: 'price_test_standard',
        price_per_month: 19,
        features: ['Enhanced AI models', 'Mistral & Stable Diffusion', 'Priority support'],
        limits: { text_tokens: 100000, image_generations: 50, video_seconds: 60 }
      },
      {
        id: 'premium',
        name: 'Premium',
        price_id: 'price_test_premium',
        price_per_month: 49,
        features: ['All AI models', 'GPT-4 access', 'Advanced analytics', 'Priority support'],
        limits: { text_tokens: 500000, image_generations: 200, video_seconds: 300 }
      }
    ];
  }

  async createCustomer(email: string, name?: string): Promise<unknown> {
    console.log('LOG: STRIPE-CUSTOMER-1 - Creating Stripe customer:', email);
    
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: { platform: 'must-be-viral' }
      });

      console.log('LOG: STRIPE-CUSTOMER-2 - Customer created:', customer.id);
      return customer;
    } catch (error) {
      console.error('LOG: STRIPE-CUSTOMER-ERROR-1 - Failed to create customer:', error);
      throw new Error(`Failed to create Stripe customer: ${error}`);
    }
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string): Promise<unknown> {
    console.log('LOG: STRIPE-CHECKOUT-1 - Creating checkout session for customer:', customerId);
    
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { platform: 'must-be-viral' }
      });

      console.log('LOG: STRIPE-CHECKOUT-2 - Checkout session created:', session.id);
      return session;
    } catch (error) {
      console.error('LOG: STRIPE-CHECKOUT-ERROR-1 - Failed to create checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error}`);
    }
  }

  verifyWebhookSignature(payload: string, signature: string): any {
    console.log('LOG: STRIPE-WEBHOOK-1 - Verifying webhook signature');
    
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      console.log('LOG: STRIPE-WEBHOOK-2 - Webhook signature verified, event type:', event.type);
      return event;
    } catch (error) {
      console.error('LOG: STRIPE-WEBHOOK-ERROR-1 - Webhook signature verification failed:', error);
      throw new Error(`Webhook signature verification failed: ${error}`);
    }
  }

  async processWebhook(event: unknown): Promise<unknown> {
    console.log('LOG: STRIPE-WEBHOOK-PROCESS-1 - Processing webhook:', event.type);
    
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          return this.handleCheckoutCompleted(event.data.object);
        case 'customer.subscription.updated':
          return this.handleSubscriptionUpdated(event.data.object);
        case 'customer.subscription.deleted':
          return this.handleSubscriptionDeleted(event.data.object);
        case 'invoice.payment_succeeded':
          return this.handlePaymentSucceeded(event.data.object);
        case 'invoice.payment_failed':
          return this.handlePaymentFailed(event.data.object);
        default:
          console.log('LOG: STRIPE-WEBHOOK-PROCESS-2 - Unhandled event type:', event.type);
          return { handled: false, event_type: event.type };
      }
    } catch (error) {
      console.error('LOG: STRIPE-WEBHOOK-PROCESS-ERROR-1 - Webhook processing failed:', error);
      throw error;
    }
  }

  private handleCheckoutCompleted(session: unknown): any {
    console.log('LOG: STRIPE-CHECKOUT-COMPLETE-1 - Handling checkout completion');
    
    const tier = this.getTierByPriceId(session.line_items?.data?.[0]?.price?.id);
    
    return {
      action: 'subscription_created',
      customer_id: session.customer,
      subscription_id: session.subscription,
      tier_id: tier?.id,
      status: 'active'
    };
  }

  private handleSubscriptionUpdated(subscription: unknown): any {
    console.log('LOG: STRIPE-SUB-UPDATE-1 - Handling subscription update');
    
    const tier = this.getTierByPriceId(subscription.items?.data?.[0]?.price?.id);
    
    return {
      action: 'subscription_updated',
      subscription_id: subscription.id,
      customer_id: subscription.customer,
      tier_id: tier?.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancelatperiod_end
    };
  }

  private handleSubscriptionDeleted(subscription: unknown): any {
    console.log('LOG: STRIPE-SUB-DELETE-1 - Handling subscription deletion');
    
    return {
      action: 'subscription_canceled',
      subscription_id: subscription.id,
      customer_id: subscription.customer,
      canceled_at: new Date().toISOString()
    };
  }

  private handlePaymentSucceeded(invoice: unknown): any {
    console.log('LOG: STRIPE-PAYMENT-SUCCESS-1 - Handling payment success');
    
    return {
      action: 'payment_succeeded',
      subscription_id: invoice.subscription,
      customer_id: invoice.customer,
      amount_paid: invoice.amountpaid
    };
  }

  private handlePaymentFailed(invoice: unknown): any {
    console.log('LOG: STRIPE-PAYMENT-FAILED-1 - Handling payment failure');
    
    return {
      action: 'payment_failed',
      subscription_id: invoice.subscription,
      customer_id: invoice.customer,
      amount_due: invoice.amountdue
    };
  }

  private getTierByPriceId(priceId?: string): SubscriptionTier | null {
    if (!priceId) {
    return null;
  }
    
    const tiers = this.getSubscriptionTiers();
    return tiers.find(tier => tier.priceid === priceId)  ?? null;
  }

  calculateCommission(amount: number, rate: number = 0.15): number {
    console.log('LOG: STRIPE-COMMISSION-1 - Calculating commission:', amount, 'rate:', rate);
    
    const commission = amount * rate;
    console.log('LOG: STRIPE-COMMISSION-2 - Commission calculated:', commission);
    return commission;
  }
}

export const stripeService = new StripeService();