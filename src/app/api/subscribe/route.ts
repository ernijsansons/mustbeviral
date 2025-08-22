// Subscription API route for Stripe integration
// LOG: API-SUBSCRIBE-1 - Initialize subscription API

import { NextRequest, NextResponse } from 'next/server';
import { stripeService } from '@/lib/stripe';
import { DatabaseService } from '@/lib/db';

export async function POST(request: NextRequest) {
  console.log('LOG: API-SUBSCRIBE-2 - Subscription API called');

  try {
    const body = await request.json();
    const { action, user_id, tier_id, customer_id } = body;

    console.log('LOG: API-SUBSCRIBE-3 - Request params:', { action, user_id, tier_id });

    if (!action || !user_id) {
      console.log('LOG: API-SUBSCRIBE-ERROR-1 - Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: action and user_id' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'create_checkout':
        console.log('LOG: API-SUBSCRIBE-4 - Creating checkout session');
        if (!tier_id) {
          return NextResponse.json(
            { error: 'tier_id required for checkout creation' },
            { status: 400 }
          );
        }
        result = await handleCreateCheckout(user_id, tier_id);
        break;

      case 'get_subscription':
        console.log('LOG: API-SUBSCRIBE-5 - Getting user subscription');
        result = await handleGetSubscription(user_id);
        break;

      case 'cancel_subscription':
        console.log('LOG: API-SUBSCRIBE-6 - Canceling subscription');
        result = await handleCancelSubscription(user_id);
        break;

      case 'get_tiers':
        console.log('LOG: API-SUBSCRIBE-7 - Getting available tiers');
        result = { tiers: stripeService.getSubscriptionTiers() };
        break;

      default:
        console.log('LOG: API-SUBSCRIBE-ERROR-2 - Invalid action:', action);
        return NextResponse.json(
          { error: 'Invalid action. Use: create_checkout, get_subscription, cancel_subscription, get_tiers' },
          { status: 400 }
        );
    }

    console.log('LOG: API-SUBSCRIBE-8 - Operation completed successfully');

    return NextResponse.json({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-SUBSCRIBE-ERROR-3 - API operation failed:', error);
    return NextResponse.json(
      { 
        error: 'Subscription operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Webhook handler for Stripe events
export async function PUT(request: NextRequest) {
  console.log('LOG: API-WEBHOOK-1 - Webhook endpoint called');

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.log('LOG: API-WEBHOOK-ERROR-1 - Missing Stripe signature');
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    console.log('LOG: API-WEBHOOK-2 - Verifying webhook signature');

    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(body, signature);
    
    console.log('LOG: API-WEBHOOK-3 - Processing webhook event:', event.type);

    // Process the webhook event
    const result = await stripeService.processWebhook(event);
    
    // Update database based on webhook result
    if (result.handled !== false) {
      await updateDatabaseFromWebhook(result);
    }

    console.log('LOG: API-WEBHOOK-4 - Webhook processed successfully');

    return NextResponse.json({
      success: true,
      event_type: event.type,
      handled: result.handled !== false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: API-WEBHOOK-ERROR-2 - Webhook processing failed:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleCreateCheckout(userId: string, tierId: string) {
  console.log('LOG: API-SUBSCRIBE-HANDLER-1 - Handling checkout creation');
  
  const tiers = stripeService.getSubscriptionTiers();
  const tier = tiers.find(t => t.id === tierId);
  
  if (!tier || tier.price_id === '') {
    throw new Error('Invalid tier or free tier selected');
  }

  // Get or create Stripe customer
  const dbService = new DatabaseService();
  const user = await dbService.getUserByEmail(`user${userId}@example.com`); // Mock email lookup
  
  if (!user) {
    throw new Error('User not found');
  }

  // Create Stripe customer if needed
  const customer = await stripeService.createCustomer(user.email, user.username);
  
  // Create checkout session
  const session = await stripeService.createCheckoutSession(
    customer.id,
    tier.price_id,
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard?success=true`,
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard?canceled=true`
  );

  return {
    checkout_url: session.url,
    session_id: session.id,
    customer_id: customer.id,
    tier: tier
  };
}

async function handleGetSubscription(userId: string) {
  console.log('LOG: API-SUBSCRIBE-HANDLER-2 - Handling get subscription');
  
  // Mock subscription lookup
  return {
    user_id: userId,
    tier_id: 'free',
    status: 'active',
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancel_at_period_end: false
  };
}

async function handleCancelSubscription(userId: string) {
  console.log('LOG: API-SUBSCRIBE-HANDLER-3 - Handling subscription cancellation');
  
  // Mock cancellation
  return {
    user_id: userId,
    canceled: true,
    effective_date: new Date().toISOString()
  };
}

async function updateDatabaseFromWebhook(webhookResult: any) {
  console.log('LOG: API-WEBHOOK-DB-1 - Updating database from webhook result');
  
  try {
    const dbService = new DatabaseService();
    
    switch (webhookResult.action) {
      case 'subscription_created':
        console.log('LOG: API-WEBHOOK-DB-2 - Creating subscription record');
        // In production, would create subscription record in database
        break;
        
      case 'subscription_updated':
        console.log('LOG: API-WEBHOOK-DB-3 - Updating subscription record');
        // In production, would update subscription status/tier
        break;
        
      case 'subscription_canceled':
        console.log('LOG: API-WEBHOOK-DB-4 - Canceling subscription record');
        // In production, would mark subscription as canceled
        break;
        
      case 'payment_succeeded':
        console.log('LOG: API-WEBHOOK-DB-5 - Recording successful payment');
        // In production, would update payment history
        break;
        
      case 'payment_failed':
        console.log('LOG: API-WEBHOOK-DB-6 - Recording failed payment');
        // In production, would handle failed payment (notifications, etc.)
        break;
        
      default:
        console.log('LOG: API-WEBHOOK-DB-7 - No database action for webhook type');
    }

    console.log('LOG: API-WEBHOOK-DB-8 - Database update completed');
  } catch (error) {
    console.error('LOG: API-WEBHOOK-DB-ERROR-1 - Database update failed:', error);
    throw error;
  }
}