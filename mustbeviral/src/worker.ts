// Cloudflare Worker Entry Point for Must Be Viral API
// LOG: WORKER-INIT-1 - Initialize Cloudflare Worker

import { CloudflareEnv, CloudflareService} from './lib/cloudflare';
import { DatabaseService} from './lib/db';
import { AuthService} from './lib/auth';
import { addSecurityHeaders} from './lib/security/csp';
import { AIProviderManager } from './lib/ai/providers/AIProviderManager';
import { AIRequest } from './lib/ai/providers/types';

// Cloudflare Worker types
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    console.log('LOG: WORKER-REQ-1 - Processing request:', request.method, request.url);
    
    // Initialize JWT secret for this request
    if (!env.JWT_SECRET) {
      console.error('LOG: WORKER-ERROR-CONFIG - JWT_SECRET not provided in environment');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize AuthService with the secret from environment
    AuthService.initJwtSecret(env.JWT_SECRET);
    
    // Initialize Cloudflare services
    const cloudflareService = new CloudflareService(env);
    const dbService = new DatabaseService(env);
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Helper function to create secure response
    const createSecureResponse = (data: unknown, status = 200): Response => {
      const response = new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      return addSecurityHeaders(response, env.NODE_ENV === 'production' ? 'production' : 'development');
    };

    // Simple rate limiting
    const getRateLimitKey = (ip: string, endpoint: string) => `rate_limit:${ip}:${endpoint}`;
    const checkRateLimit = async (ip: string, endpoint: string, limit = 100, windowMs = 60000): Promise<boolean> => {
      const key = getRateLimitKey(ip, endpoint);
      const current = await cloudflareService.kv.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= limit) {
        return false; // Rate limit exceeded
      }

      await cloudflareService.kv.put(key, (count + 1).toString(), { expirationTtl: Math.floor(windowMs / 1000) });
      return true;
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const clientIP = request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For') ?? 'unknown';

    // Apply rate limiting (except for health checks)
    if (!path.includes('/health')) {
      const rateLimitOk = await checkRateLimit(clientIP, path);
      if (!rateLimitOk) {
        return createSecureResponse({ error: 'Rate limit exceeded' }, 429);
      }
    }

    try {
      // Route requests
      if (path.startsWith('/api/auth/register') && request.method === 'POST') {
        return await handleRegister(request, dbService, createSecureResponse);
      } else if (path.startsWith('/api/auth/login') && request.method === 'POST') {
        return await handleLogin(request, dbService, createSecureResponse);
      } else if (path.startsWith('/api/auth/me') && request.method === 'GET') {
        return await handleGetMe(request, dbService, createSecureResponse);
      } else if (path.startsWith('/api/onboard') && request.method === 'POST') {
        return await handleOnboard(request, dbService, createSecureResponse);
      } else if (path.startsWith('/api/health') && request.method === 'GET') {
        return await handleHealth(cloudflareService, createSecureResponse);
      } else if (path.startsWith('/api/ai/generate') && request.method === 'POST') {
        return await handleAIGenerate(request, env, createSecureResponse);
      } else if (path.startsWith('/api/ai/health') && request.method === 'GET') {
        return await handleAIHealth(env, createSecureResponse);
      } else if (path.startsWith('/api/ai/models') && request.method === 'GET') {
        return await handleAIModels(env, createSecureResponse);
      } else if (path.startsWith('/api/ai/test') && request.method === 'POST') {
        return await handleAITest(env, createSecureResponse);
      }

      // Route not found
      return createSecureResponse({ error: 'Route not found' }, 404);

    } catch (error) {
      console.error('LOG: WORKER-ERROR-1 - Request processing failed:', error);
      return createSecureResponse({ error: 'Internal server error' }, 500);
    }
  }
};

// Handler: User Registration
async function handleRegister(request: Request, dbService: DatabaseService, createSecureResponse: (data: unknown, status?: number) => Response): Promise<Response> {
  console.log('LOG: WORKER-AUTH-REG-1 - Processing registration');
  
  try {
    const body = await request.json() as any;
    const { email, username, password, role} = body;
    
    // Validate input
    if (!email || !username || !password || !role) {
      return createSecureResponse({ error: 'All fields are required' }, 400);
    }

    // Validate email format
    if (!AuthService.validateEmail(email)) {
      return createSecureResponse({ error: 'Invalid email format' }, 400);
    }

    // Validate username
    const usernameValidation = AuthService.validateUsername(username);
    if (!usernameValidation.isValid) {
      return createSecureResponse({ error: usernameValidation.errors[0] }, 400);
    }

    // Validate password
    const passwordValidation = AuthService.validatePassword(password);
    if (!passwordValidation.isValid) {
      return createSecureResponse({ error: passwordValidation.errors[0] }, 400);
    }

    // Validate role
    if (!['creator', 'influencer'].includes(role)) {
      return createSecureResponse({ error: 'Invalid role' }, 400);
    }

    // Check if user already exists
    const existingUser = await dbService.getUserByEmail(email);
    if (existingUser) {
      return createSecureResponse({ error: 'User already exists' }, 400);
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(password);

    // Create user
    const userData = {
      email,
      username,
      password_hash: passwordHash,
      role: role as 'creator' | 'influencer',
      profile_data: JSON.stringify({}),
      ai_preference_level: 50,
      onboarding_completed: 0
    };

    const newUser = await dbService.createUser(userData);
    console.log('LOG: WORKER-AUTH-REG-2 - User created successfully:', newUser.id);

    // Generate JWT token
    const authUser = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role
    };

    const token = await AuthService.generateToken(authUser);

    // Cache user session
    const sessionData = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      lastLogin: new Date().toISOString()
    };
    
    await dbService.cacheUserSession(newUser.id, sessionData, 86400);

    return createSecureResponse({
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        onboarding_completed: newUser.onboardingcompleted
      },
      token
    }, 201);

  } catch (error) {
    console.error('LOG: WORKER-AUTH-REG-ERROR-1 - Registration failed:', error);
    return createSecureResponse({ error: 'Registration failed' }, 500);
  }
}

// Handler: User Login
async function handleLogin(request: Request, dbService: DatabaseService, createSecureResponse: (data: unknown, status?: number) => Response): Promise<Response> {
  console.log('LOG: WORKER-AUTH-LOGIN-1 - Processing login');
  
  try {
    const body = await request.json() as any;
    const { email, password} = body;
    
    // Validate input
    if (!email || !password) {
      return createSecureResponse({ error: 'Email and password are required' }, 400);
    }

    // Find user by email
    const user = await dbService.getUserByEmail(email);
    if (!user) {
      return createSecureResponse({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, user.passwordhash);
    if (!isValidPassword) {
      return createSecureResponse({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT token
    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    const token = await AuthService.generateToken(authUser);

    // Cache user session
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      lastLogin: new Date().toISOString()
    };
    
    await dbService.cacheUserSession(user.id, sessionData, 86400);

    return createSecureResponse({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        onboarding_completed: user.onboardingcompleted
      },
      token
    });

  } catch (error) {
    console.error('LOG: WORKER-AUTH-LOGIN-ERROR-1 - Login failed:', error);
    return createSecureResponse({ error: 'Login failed' }, 500);
  }
}

// Handler: Get Current User
async function handleGetMe(request: Request, dbService: DatabaseService, createSecureResponse: (data: unknown, status?: number) => Response): Promise<Response> {
  console.log('LOG: WORKER-AUTH-ME-1 - Processing get user');
  
  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createSecureResponse({ error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const authUser = await AuthService.verifyToken(token);

    if (!authUser) {
      return createSecureResponse({ error: 'Invalid token' }, 401);
    }

    // Get user from database
    const user = await dbService.getUserByEmail(authUser.email);
    if (!user) {
      return createSecureResponse({ error: 'User not found' }, 404);
    }

    return createSecureResponse({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      onboarding_completed: user.onboardingcompleted,
      ai_preference_level: user.aipreferencelevel,
      profile_data: JSON.parse(user.profile_data ?? '{}')
    });

  } catch (error) {
    console.error('LOG: WORKER-AUTH-ME-ERROR-1 - Get user failed:', error);
    return createSecureResponse({ error: 'Failed to get user' }, 500);
  }
}

// Handler: User Onboarding
async function handleOnboard(request: Request, dbService: DatabaseService, createSecureResponse: (data: unknown, status?: number) => Response): Promise<Response> {
  console.log('LOG: WORKER-ONBOARD-1 - Processing onboarding');

  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createSecureResponse({ error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const authUser = await AuthService.verifyToken(token);

    if (!authUser) {
      return createSecureResponse({ error: 'Invalid token' }, 401);
    }

    // Update user onboarding status
    await dbService.updateUserOnboarding(authUser.id, true);

    return createSecureResponse({
      message: 'Onboarding completed successfully',
      user: {
        id: authUser.id,
        onboarding_completed: true
      }
    });

  } catch (error) {
    console.error('LOG: WORKER-ONBOARD-ERROR-1 - Onboarding failed:', error);
    return createSecureResponse({ error: 'Onboarding failed' }, 500);
  }
}

// Handler: Health Check
async function handleHealth(cloudflareService: CloudflareService, createSecureResponse: (data: unknown, status?: number) => Response): Promise<Response> {
  console.log('LOG: WORKER-HEALTH-1 - Health check');
  
  try {
    // Check all Cloudflare services
    const healthChecks = await cloudflareService.healthCheck();
    
    // Detailed health status
    const health = {
      status: healthChecks.db && healthChecks.kv && healthChecks.r2 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: healthChecks.db ? 'healthy' : 'unhealthy',
        cache: healthChecks.kv ? 'healthy' : 'unhealthy', 
        storage: healthChecks.r2 ? 'healthy' : 'unhealthy'
      },
      version: '1.0.0'
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return createSecureResponse(health, statusCode);
  } catch (error) {
    console.error('LOG: WORKER-HEALTH-ERROR-1 - Health check failed:', error);
    return createSecureResponse({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, 500);
  }
}

// Handler: AI Content Generation
async function handleAIGenerate(
  request: Request,
  env: CloudflareEnv,
  createSecureResponse: (data: unknown, status?: number) => Response
): Promise<Response> {
  try {
    console.log('LOG: WORKER-AI-GENERATE-1 - Processing AI content generation request');

    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return createSecureResponse({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const authUser = await AuthService.verifyToken(token);
    if (!authUser) {
      return createSecureResponse({ error: 'Invalid or expired token' }, 401);
    }

    const body = await request.json() as any;
    const { prompt, model, maxTokens, temperature, platform } = body;

    if (!prompt) {
      return createSecureResponse({ error: 'Prompt is required' }, 400);
    }

    // Initialize AI Provider Manager
    const aiConfig = {
      openai: {
        enabled: !!env.OPENAI_API_KEY,
        maxTokensPerRequest: 4000,
        rateLimitPerMinute: 60,
        costPerToken: 0.002
      },
      cloudflare: {
        enabled: true,
        maxTokensPerRequest: 2000,
        rateLimitPerMinute: 100,
        costPerToken: 0.001
      },
      anthropic: {
        enabled: !!env.ANTHROPIC_API_KEY,
        maxTokensPerRequest: 4000,
        rateLimitPerMinute: 50,
        costPerToken: 0.003
      }
    };

    const aiManager = new AIProviderManager(aiConfig, env);

    const aiRequest: AIRequest = {
      model: model || 'gpt-3.5-turbo',
      prompt: prompt,
      maxTokens: maxTokens || 500,
      temperature: temperature || 0.7,
      platform: platform || 'general'
    };

    console.log('LOG: WORKER-AI-GENERATE-2 - Generating content with AI');
    const response = await aiManager.generateContent(aiRequest);

    return createSecureResponse({
      success: true,
      content: response.content,
      model: response.model,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
      metadata: response.metadata
    });

  } catch (error) {
    console.error('LOG: WORKER-AI-GENERATE-ERROR-1 - AI generation failed:', error);
    return createSecureResponse({
      success: false,
      error: 'AI content generation failed',
      details: (error as Error).message
    }, 500);
  }
}

// Handler: AI Health Check
async function handleAIHealth(
  env: CloudflareEnv,
  createSecureResponse: (data: unknown, status?: number) => Response
): Promise<Response> {
  try {
    console.log('LOG: WORKER-AI-HEALTH-1 - Checking AI provider health');

    const aiConfig = {
      openai: {
        enabled: !!env.OPENAI_API_KEY,
        maxTokensPerRequest: 4000,
        rateLimitPerMinute: 60,
        costPerToken: 0.002
      },
      cloudflare: {
        enabled: true,
        maxTokensPerRequest: 2000,
        rateLimitPerMinute: 100,
        costPerToken: 0.001
      },
      anthropic: {
        enabled: !!env.ANTHROPIC_API_KEY,
        maxTokensPerRequest: 4000,
        rateLimitPerMinute: 50,
        costPerToken: 0.003
      }
    };

    const aiManager = new AIProviderManager(aiConfig, env);
    const healthStatus = await aiManager.getHealthStatus();

    return createSecureResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      providers: healthStatus,
      summary: {
        totalProviders: healthStatus.length,
        healthyProviders: healthStatus.filter(p => p.isHealthy).length,
        unhealthyProviders: healthStatus.filter(p => !p.isHealthy).length
      }
    });

  } catch (error) {
    console.error('LOG: WORKER-AI-HEALTH-ERROR-1 - AI health check failed:', error);
    return createSecureResponse({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'AI health check failed',
      details: (error as Error).message
    }, 500);
  }
}

// Handler: AI Models List
async function handleAIModels(
  env: CloudflareEnv,
  createSecureResponse: (data: unknown, status?: number) => Response
): Promise<Response> {
  try {
    console.log('LOG: WORKER-AI-MODELS-1 - Fetching available AI models');

    const models = {
      openai: {
        enabled: !!env.OPENAI_API_KEY,
        models: [
          { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model, best for complex tasks' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster GPT-4 with larger context' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient for most tasks' }
        ]
      },
      cloudflare: {
        enabled: true,
        models: [
          { id: '@cf/meta/llama-2-7b-chat-int8', name: 'Llama 2 Chat', description: 'Open source chat model' },
          { id: '@cf/mistral/mistral-7b-instruct-v0.1', name: 'Mistral 7B', description: 'Efficient instruction-following model' }
        ]
      },
      anthropic: {
        enabled: !!env.ANTHROPIC_API_KEY,
        models: [
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed' },
          { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest Claude model' }
        ]
      }
    };

    return createSecureResponse({
      success: true,
      models,
      defaultModel: 'gpt-3.5-turbo',
      recommendedModels: {
        social_media: 'gpt-3.5-turbo',
        long_form: 'gpt-4',
        creative: 'claude-3-sonnet-20240229',
        fast: '@cf/mistral/mistral-7b-instruct-v0.1'
      }
    });

  } catch (error) {
    console.error('LOG: WORKER-AI-MODELS-ERROR-1 - Failed to fetch AI models:', error);
    return createSecureResponse({
      success: false,
      error: 'Failed to fetch AI models',
      details: (error as Error).message
    }, 500);
  }
}

// Handler: AI Test (No Authentication Required)
async function handleAITest(
  env: CloudflareEnv,
  createSecureResponse: (data: unknown, status?: number) => Response
): Promise<Response> {
  try {
    console.log('LOG: WORKER-AI-TEST-1 - Testing AI content generation');

    // Initialize AI Provider Manager
    const aiConfig = {
      openai: {
        enabled: !!env.OPENAI_API_KEY,
        maxTokensPerRequest: 4000,
        rateLimitPerMinute: 60,
        costPerToken: 0.002
      },
      cloudflare: {
        enabled: true,
        maxTokensPerRequest: 2000,
        rateLimitPerMinute: 100,
        costPerToken: 0.001
      },
      anthropic: {
        enabled: !!env.ANTHROPIC_API_KEY,
        maxTokensPerRequest: 4000,
        rateLimitPerMinute: 50,
        costPerToken: 0.003
      }
    };

    const aiManager = new AIProviderManager(aiConfig, env);

    const testRequest: AIRequest = {
      model: '@cf/mistral/mistral-7b-instruct-v0.1',
      prompt: 'Create a short, engaging social media post about AI technology. Make it viral and inspiring.',
      maxTokens: 150,
      temperature: 0.7
    };

    console.log('LOG: WORKER-AI-TEST-2 - Generating test content with Cloudflare AI');
    const response = await aiManager.generateContent(testRequest);

    return createSecureResponse({
      success: true,
      test: 'AI content generation working!',
      content: response.content,
      model: response.model,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      cost: response.cost,
      metadata: response.metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LOG: WORKER-AI-TEST-ERROR-1 - AI test failed:', error);
    return createSecureResponse({
      success: false,
      test: 'AI content generation failed',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, 500);
  }
}