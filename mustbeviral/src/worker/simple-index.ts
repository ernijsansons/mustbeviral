// Simplified Cloudflare Worker for Must Be Viral
// Basic API endpoints for authentication and content

import { CloudflareEnv} from '../lib/cloudflare';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export default {
  async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check endpoint
      if (path === '/api/health') {
        return Response.json(
          { success: true, message: 'API is healthy', timestamp: new Date().toISOString() },
          { status: 200, headers: corsHeaders }
        );
      }

      // User registration endpoint
      if (path === '/api/auth/register' && request.method === 'POST') {
        const body = await request.json() as unknown;

        // Basic validation
        if (!body.email ?? !body.username ?? !body.password) {
          return Response.json(
            { success: false, error: 'Missing required fields' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Check if user exists
        const existingUser = await env.DB.prepare(
          'SELECT id FROM users WHERE email = ? OR username = ?'
        ).bind(body.email, body.username).first();

        if (existingUser) {
          return Response.json(
            { success: false, error: 'User already exists' },
            { status: 409, headers: corsHeaders }
          );
        }

        // Create new user
        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(body.password);

        await env.DB.prepare(`
          INSERT INTO users (id, email, username, passwordhash, role, onboardingcompleted, aipreferencelevel)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId,
          body.email,
          body.username,
          passwordHash,
          body.role ?? 'creator',
          false,
          body.aiPreferenceLevel ?? 50
        ).run();

        const user = {
          id: userId,
          email: body.email,
          username: body.username,
          role: body.role ?? 'creator',
          onboarding_completed: false,
          ai_preference_level: body.aiPreferenceLevel ?? 50
        };

        return Response.json(
          { success: true, data: { user }, message: 'User created successfully' },
          { status: 201, headers: corsHeaders }
        );
      }

      // User login endpoint
      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json() as unknown;

        if (!body.email ?? !body.password) {
          return Response.json(
            { success: false, error: 'Email and password required' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Find user
        const user = await env.DB.prepare(
          'SELECT * FROM users WHERE email = ?'
        ).bind(body.email).first() as unknown;

        if (!user ?? !(await verifyPassword(body.password, user.passwordhash))) {
          return Response.json(
            { success: false, error: 'Invalid credentials' },
            { status: 401, headers: corsHeaders }
          );
        }

        // Generate simple token (in production, use proper JWT)
        const token = btoa(JSON.stringify({
          userId: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }));

        const userResponse = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          onboarding_completed: user.onboardingcompleted === 1,
          ai_preference_level: user.aipreferencelevel
        };

        return Response.json(
          {
            success: true,
            data: {
              user: userResponse,
              token,
              expiresIn: 24 * 60 * 60 // 24 hours in seconds
            },
            message: 'Login successful'
          },
          { status: 200, headers: corsHeaders }
        );
      }

      // Get current user
      if (path === '/api/auth/me' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        try {
          const token = authHeader.substring(7);
          const decoded = JSON.parse(atob(token));

          if (decoded.exp < Date.now()) {
            return Response.json(
              { success: false, error: 'Token expired' },
              { status: 401, headers: corsHeaders }
            );
          }

          const user = await env.DB.prepare(
            'SELECT id, email, username, role, onboardingcompleted, ai_preference_level FROM users WHERE id = ?'
          ).bind(decoded.userId).first() as unknown;

          if (!user) {
            return Response.json(
              { success: false, error: 'User not found' },
              { status: 404, headers: corsHeaders }
            );
          }

          const userResponse = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            onboarding_completed: user.onboardingcompleted === 1,
            ai_preference_level: user.aipreferencelevel
          };

          return Response.json(
            { success: true, data: userResponse },
            { status: 200, headers: corsHeaders }
          );
        } catch (error: unknown) {
          return Response.json(
            { success: false, error: 'Invalid token' },
            { status: 401, headers: corsHeaders }
          );
        }
      }

      // Complete onboarding
      if (path === '/api/auth/onboarding' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));
        const body = await request.json() as unknown;

        await env.DB.prepare(`
          UPDATE users
          SET onboardingcompleted = 1,
              industry = ?,
              primarygoal = ?,
              aipreferencelevel = ?
          WHERE id = ?
        `).bind(
          body.industry,
          body.primaryGoal,
          body.aiPreferenceLevel,
          decoded.userId
        ).run();

        return Response.json(
          { success: true, message: 'Onboarding completed' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Create content endpoint
      if (path === '/api/content/create' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));
        const body = await request.json() as unknown;

        if (!body.title ?? !body.body) {
          return Response.json(
            { success: false, error: 'Title and body are required' },
            { status: 400, headers: corsHeaders }
          );
        }

        const contentId = crypto.randomUUID();

        await env.DB.prepare(`
          INSERT INTO content (id, userid, title, body, type, status, generatedbyai)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          contentId,
          decoded.userId,
          body.title,
          body.body,
          body.type ?? 'blog_post',
          body.status ?? 'draft',
          body.generated_by_ai ? 1 : 0
        ).run();

        const content = {
          id: contentId,
          user_id: decoded.userId,
          title: body.title,
          body: body.body,
          type: body.type ?? 'blog_post',
          status: body.status ?? 'draft',
          generated_by_ai: body.generated_by_ai ?? false,
          created_at: new Date().toISOString()
        };

        return Response.json(
          { success: true, data: content, message: 'Content created successfully' },
          { status: 201, headers: corsHeaders }
        );
      }

      // Get user's content
      if (path === '/api/content/list' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));

        const content = await env.DB.prepare(
          'SELECT * FROM content WHERE userid = ? ORDER BY created_at DESC'
        ).bind(decoded.userId).all();

        return Response.json(
          { success: true, data: content.results },
          { status: 200, headers: corsHeaders }
        );
      }

      // Get single content by ID
      if (path.startsWith('/api/content/') && request.method === 'GET') {
        const contentId = path.split('/')[3];
        const authHeader = request.headers.get('Authorization');

        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));

        const content = await env.DB.prepare(
          'SELECT * FROM content WHERE id = ? AND userid = ?'
        ).bind(contentId, decoded.userId).first() as unknown;

        if (!content) {
          return Response.json(
            { success: false, error: 'Content not found' },
            { status: 404, headers: corsHeaders }
          );
        }

        return Response.json(
          { success: true, data: content },
          { status: 200, headers: corsHeaders }
        );
      }

      // Update content
      if (path.startsWith('/api/content/') && request.method === 'PUT') {
        const contentId = path.split('/')[3];
        const authHeader = request.headers.get('Authorization');

        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));
        const body = await request.json() as unknown;

        // Verify ownership
        const existingContent = await env.DB.prepare(
          'SELECT id FROM content WHERE id = ? AND userid = ?'
        ).bind(contentId, decoded.userId).first();

        if (!existingContent) {
          return Response.json(
            { success: false, error: 'Content not found' },
            { status: 404, headers: corsHeaders }
          );
        }

        // Update content
        await env.DB.prepare(`
          UPDATE content
          SET title = ?, body = ?, status = ?, updatedat = CURRENT_TIMESTAMP
          WHERE id = ? AND userid = ?
        `).bind(
          body.title,
          body.body,
          body.status ?? 'draft',
          contentId,
          decoded.userId
        ).run();

        const updatedContent = await env.DB.prepare(
          'SELECT * FROM content WHERE id = ?'
        ).bind(contentId).first();

        return Response.json(
          { success: true, data: updatedContent, message: 'Content updated successfully' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Delete content
      if (path.startsWith('/api/content/') && request.method === 'DELETE') {
        const contentId = path.split('/')[3];
        const authHeader = request.headers.get('Authorization');

        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));

        // Verify ownership and delete
        const result = await env.DB.prepare(
          'DELETE FROM content WHERE id = ? AND userid = ?'
        ).bind(contentId, decoded.userId).run();

        if (!result.changes) {
          return Response.json(
            { success: false, error: 'Content not found' },
            { status: 404, headers: corsHeaders }
          );
        }

        return Response.json(
          { success: true, message: 'Content deleted successfully' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Create Stripe checkout session
      if (path === '/api/payments/create-checkout' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));
        const body = await request.json() as unknown;

        // Mock Stripe checkout session creation
        const mockCheckoutSession = {
          id: 'cs_test' + crypto.randomUUID(),
          url: 'https://checkout.stripe.com/pay/cs_test_mock#fidkdWxOYHwnPyd1blpxYHZxWjA0T20yZ35xXDZ9SjJmTGFwM2pkZGFpTmJJamBTa3dBanJwU05wSTZtZDJiR2E8NX0%2BPGdpNnZBXHZscDVCZFYlR1XaaBMEczZGbGBUfDZPbEN3QWtWfzdPZ3FHVlcacXF8fnFPbT1VJykmaWRmaWRiYWJxZWZxYSknc3FsZGBsYmVrbGpyJGNiZGpoZGBsJ3EngE5pdWhqaGVpZWVlYWJnZXBqZGF3Zj1iYCkn',
          customer_email: decoded.email,
          payment_intent: 'pi_test' + crypto.randomUUID(),
          amount_total: body.tier === 'professional' ? 2999 : 999, // $29.99 or $9.99
          currency: 'usd'
        };

        // Create subscription record
        const subscriptionId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO subscriptions (id, userid, status, tier)
          VALUES (?, ?, ?, ?)
        `).bind(
          subscriptionId,
          decoded.userId,
          'pending',
          body.tier ?? 'starter'
        ).run();

        return Response.json(
          { success: true, data: mockCheckoutSession, message: 'Checkout session created' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Get user's subscription
      if (path === '/api/payments/subscription' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));

        const subscription = await env.DB.prepare(
          'SELECT * FROM subscriptions WHERE userid = ? ORDER BY created_at DESC LIMIT 1'
        ).bind(decoded.userId).first() as unknown;

        if (!subscription) {
          // Return default free subscription
          return Response.json(
            {
              success: true,
              data: {
                tier: 'free',
                status: 'active',
                features: {
                  text_tokens: 1000,
                  image_generations: 5,
                  video_seconds: 0
                }
              }
            },
            { status: 200, headers: corsHeaders }
          );
        }

        return Response.json(
          { success: true, data: subscription },
          { status: 200, headers: corsHeaders }
        );
      }

      // Cancel subscription
      if (path === '/api/payments/cancel' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));

        await env.DB.prepare(`
          UPDATE subscriptions
          SET status = 'cancelled', cancelatperiod_end = 1, updatedat = CURRENT_TIMESTAMP
          WHERE userid = ? AND status = 'active'
        `).bind(decoded.userId).run();

        return Response.json(
          { success: true, message: 'Subscription cancelled' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Stripe webhook handler (mock)
      if (path === '/api/payments/webhook' && request.method === 'POST') {
        // In production, verify Stripe signature
        const body = await request.json() as unknown;

        if (body.type === 'checkout.session.completed') {
          // Mock handling checkout completion
          return Response.json(
            { success: true, message: 'Webhook processed' },
            { status: 200, headers: corsHeaders }
          );
        }

        return Response.json(
          { success: true, message: 'Webhook ignored' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Get pricing tiers
      if (path === '/api/payments/pricing' && request.method === 'GET') {
        const pricingTiers = [
          {
            id: 'free',
            name: 'Free',
            price: 0,
            currency: 'usd',
            interval: 'month',
            features: {
              text_tokens: 1000,
              image_generations: 5,
              video_seconds: 0,
              ai_models: ['basic'],
              support: 'community'
            }
          },
          {
            id: 'starter',
            name: 'Starter',
            price: 999, // $9.99
            currency: 'usd',
            interval: 'month',
            features: {
              text_tokens: 10000,
              image_generations: 50,
              video_seconds: 30,
              ai_models: ['basic', 'advanced'],
              support: 'email'
            }
          },
          {
            id: 'professional',
            name: 'Professional',
            price: 2999, // $29.99
            currency: 'usd',
            interval: 'month',
            features: {
              text_tokens: 100000,
              image_generations: 500,
              video_seconds: 300,
              ai_models: ['basic', 'advanced', 'premium'],
              support: 'priority'
            }
          }
        ];

        return Response.json(
          { success: true, data: pricingTiers },
          { status: 200, headers: corsHeaders }
        );
      }

      // AI Content Generation endpoint
      if (path === '/api/content/generate' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
          return Response.json(
            { success: false, error: 'Authentication required' },
            { status: 401, headers: corsHeaders }
          );
        }

        const body = await request.json() as unknown;
        if (!body.prompt) {
          return Response.json(
            { success: false, error: 'Prompt is required' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Mock AI generation for now (in production, use Cloudflare AI)
        const generatedContent = {
          title: generateTitleFromPrompt(body.prompt),
          body: generateContentFromPrompt(body.prompt),
          type: body.type ?? 'blog_post',
          generated_by_ai: true,
          prompt: body.prompt
        };

        return Response.json(
          { success: true, data: generatedContent, message: 'Content generated successfully' },
          { status: 200, headers: corsHeaders }
        );
      }

      // 404 for unmatched routes
      return Response.json(
        { success: false, error: 'Not found' },
        { status: 404, headers: corsHeaders }
      );

    } catch (error: unknown) {
      console.error('Worker error:', error);
      return Response.json(
        { success: false, error: 'Internal server error' },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};

// Simple password hashing (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt'); // Add proper salt in production
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

// AI Content Generation helpers (mock implementation)
function generateTitleFromPrompt(prompt: string): string {
  const titles = [
    "How AI is Revolutionizing Content Creation",
    "The Future of Digital Marketing: What You Need to Know",
    "10 Proven Strategies to Boost Your Online Presence",
    "Understanding the Algorithm: A Creator's Guide",
    "From Zero to Viral: Building Your Content Empire",
    "The Science of Engagement: What Makes Content Stick",
    "Breaking Through the Noise: Content That Converts",
    "The Creator's Playbook: Monetizing Your Passion"
  ];

  // Simple prompt-based title selection
  if (prompt.toLowerCase().includes('ai')  ?? prompt.toLowerCase().includes('artificial')) {
    return "How AI is Revolutionizing Content Creation";
  } else if (prompt.toLowerCase().includes('marketing')) {
    return "The Future of Digital Marketing: What You Need to Know";
  } else if (prompt.toLowerCase().includes('viral')) {
    return "From Zero to Viral: Building Your Content Empire";
  } else {
    return titles[Math.floor(Math.random() * titles.length)];
  }
}

function generateContentFromPrompt(prompt: string): string {
  const baseContent = `
# Introduction

In today's digital landscape, content creation has become more important than ever. This comprehensive guide will help you understand the key strategies and techniques needed to succeed.

## Key Points to Consider

1. **Understanding Your Audience**: The foundation of great content starts with knowing who you're creating for. Research your target demographics, their pain points, and what type of content resonates with them.

2. **Consistency is King**: Regular posting schedules help build audience expectations and improve algorithm performance across all platforms.

3. **Quality Over Quantity**: While consistency matters, never sacrifice quality for the sake of posting more frequently. One high-quality piece often outperforms multiple mediocre posts.

4. **Engagement Strategy**: Create content that encourages interaction. Ask questions, respond to comments, and build a community around your brand.

5. **Data-Driven Decisions**: Use analytics to understand what works and what doesn't. Let the data guide your content strategy moving forward.

## Implementation Tips

- Start with a content calendar to plan your posts in advance
- Use high-quality visuals and graphics to enhance your message
- Optimize for mobile viewing since most users consume content on their phones
- Cross-promote content across multiple platforms while adapting for each platform's unique format
- Stay updated with platform changes and algorithm updates

## Conclusion

Success in content creation requires patience, persistence, and continuous learning. By implementing these strategies and staying committed to providing value to your audience, you'll be well on your way to building a successful content presence.

Remember, every expert was once a beginner. Start where you are, use what you have, and do what you can. Your audience is waiting for the unique value that only you can provide.
`;

  // Add prompt-specific content
  if (prompt.toLowerCase().includes('ai')) {
    return baseContent.replace('content creation', 'AI-powered content creation') +
      '\n\n## The AI Advantage\n\nArtificial Intelligence is transforming how we create, optimize, and distribute content. From automated research to personalized recommendations, AI tools are becoming essential for modern creators.';
  }

  return baseContent;
}