/**
 * Payment Worker - Stripe Integration for Must Be Viral
 * Handles subscription management, payment processing, and webhooks
 */

import { Router } from 'itty-router';
import Stripe from 'stripe';

// Initialize router
const router = Router();

// Subscription tiers configuration
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null, // No Stripe price ID for free tier
    features: {
      aiTokens: 10000,
      imagesPerDay: 5,
      analytics: 'basic',
      support: 'community'
    }
  },
  standard: {
    name: 'Standard',
    price: 29,
    priceId: 'price_standard_monthly', // Replace with actual Stripe price ID
    features: {
      aiTokens: 100000,
      imagesPerDay: 50,
      analytics: 'advanced',
      support: 'email',
      stableDiffusion: true
    }
  },
  premium: {
    name: 'Premium',
    price: 99,
    priceId: 'price_premium_monthly', // Replace with actual Stripe price ID
    features: {
      aiTokens: 500000,
      imagesPerDay: 'unlimited',
      analytics: 'enterprise',
      support: 'priority',
      gpt4Access: true,
      customBranding: true
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 'custom',
    priceId: null, // Custom pricing
    features: {
      aiTokens: 'unlimited',
      imagesPerDay: 'unlimited',
      analytics: 'enterprise',
      support: 'dedicated',
      whiteLabel: true,
      apiAccess: true,
      customLimits: true
    }
  }
};

// Initialize Stripe client
function getStripe(env) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient()
  });
}

// Create checkout session
router.post('/api/payments/create-checkout-session', async (request, env) => {
  try {
    const stripe = getStripe(env);
    const { tier, userId, email } = await request.json();

    // Validate tier
    const selectedTier = SUBSCRIPTION_TIERS[tier];
    if (!selectedTier || !selectedTier.priceId) {
      return new Response(JSON.stringify({
        error: 'Invalid subscription tier'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: selectedTier.priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/pricing?canceled=true`,
      customer_email: email,
      metadata: {
        userId,
        tier
      },
      subscription_data: {
        trial_period_days: tier === 'standard' ? 7 : 0,
        metadata: {
          userId,
          tier
        }
      },
      allow_promotion_codes: true
    });

    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create checkout session'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Create customer portal session
router.post('/api/payments/create-portal-session', async (request, env) => {
  try {
    const stripe = getStripe(env);
    const { customerId } = await request.json();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.FRONTEND_URL}/dashboard`
    });

    return new Response(JSON.stringify({
      url: session.url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Portal session error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create portal session'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Webhook handler
router.post('/api/payments/webhook', async (request, env) => {
  try {
    const stripe = getStripe(env);
    const signature = request.headers.get('stripe-signature');
    const body = await request.text();

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutComplete(session, env);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await updateSubscription(subscription, env);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await cancelSubscription(subscription, env);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSuccess(invoice, env);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice, env);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response('Webhook processed', { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
});

// Get subscription status
router.get('/api/payments/subscription/:userId', async (request, env) => {
  try {
    const { userId } = request.params;

    // Query D1 database for subscription status
    const result = await env.DB.prepare(
      'SELECT * FROM subscriptions WHERE user_id = ? AND status = ?'
    ).bind(userId, 'active').first();

    if (!result) {
      return new Response(JSON.stringify({
        tier: 'free',
        features: SUBSCRIPTION_TIERS.free.features
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tierFeatures = SUBSCRIPTION_TIERS[result.tier]?.features || SUBSCRIPTION_TIERS.free.features;

    return new Response(JSON.stringify({
      tier: result.tier,
      status: result.status,
      customerId: result.stripe_customer_id,
      subscriptionId: result.stripe_subscription_id,
      currentPeriodEnd: result.current_period_end,
      features: tierFeatures
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get subscription status'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Helper functions
async function handleCheckoutComplete(session, env) {
  const { userId, tier } = session.metadata;

  // Store subscription in D1
  await env.DB.prepare(`
    INSERT OR REPLACE INTO subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      tier,
      status,
      current_period_end,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    session.customer,
    session.subscription,
    tier,
    'active',
    new Date(session.expires_at * 1000).toISOString(),
    new Date().toISOString()
  ).run();

  // Update user record
  await env.DB.prepare(
    'UPDATE users SET subscription_tier = ?, updated_at = ? WHERE id = ?'
  ).bind(tier, new Date().toISOString(), userId).run();
}

async function updateSubscription(subscription, env) {
  const { userId, tier } = subscription.metadata;

  await env.DB.prepare(`
    UPDATE subscriptions
    SET status = ?,
        current_period_end = ?,
        updated_at = ?
    WHERE stripe_subscription_id = ?
  `).bind(
    subscription.status,
    new Date(subscription.current_period_end * 1000).toISOString(),
    new Date().toISOString(),
    subscription.id
  ).run();
}

async function cancelSubscription(subscription, env) {
  await env.DB.prepare(
    'UPDATE subscriptions SET status = ?, updated_at = ? WHERE stripe_subscription_id = ?'
  ).bind('canceled', new Date().toISOString(), subscription.id).run();

  // Downgrade user to free tier
  const result = await env.DB.prepare(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?'
  ).bind(subscription.id).first();

  if (result) {
    await env.DB.prepare(
      'UPDATE users SET subscription_tier = ?, updated_at = ? WHERE id = ?'
    ).bind('free', new Date().toISOString(), result.user_id).run();
  }
}

async function handlePaymentSuccess(invoice, env) {
  console.log('Payment successful for invoice:', invoice.id);
  // Add any additional payment success logic
}

async function handlePaymentFailed(invoice, env) {
  console.error('Payment failed for invoice:', invoice.id);
  // Send notification email about failed payment
  // Could integrate with an email service here
}

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export worker
export default {
  fetch: router.handle
};