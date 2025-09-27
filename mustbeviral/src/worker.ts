// Cloudflare Worker Entry Point for Must Be Viral API
// LOG: WORKER-INIT-1 - Initialize Cloudflare Worker

import { CloudflareEnv, CloudflareService} from './lib/cloudflare';
import { DatabaseService} from './lib/db';
import { AuthService} from './lib/auth';
import { addSecurityHeaders} from './lib/security/csp';

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
    if (!env.JWTSECRET) {
      console.error('LOG: WORKER-ERROR-CONFIG - JWT_SECRET not provided in environment');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Initialize AuthService with the secret from environment
    AuthService.initJwtSecret(env.JWTSECRET);
    
    // Initialize Cloudflare services
    const cloudflareService = new CloudflareService(env);
    const dbService = new DatabaseService(env);
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route requests
      if (path.startsWith('/api/auth/register') && request.method === 'POST') {
        return await handleRegister(request, dbService, corsHeaders);
      } else if (path.startsWith('/api/auth/login') && request.method === 'POST') {
        return await handleLogin(request, dbService, corsHeaders);
      } else if (path.startsWith('/api/auth/me') && request.method === 'GET') {
        return await handleGetMe(request, dbService, corsHeaders);
      } else if (path.startsWith('/api/onboard') && request.method === 'POST') {
        return await handleOnboard(request, dbService, corsHeaders);
      } else if (path.startsWith('/api/health') && request.method === 'GET') {
        return await handleHealth(cloudflareService, corsHeaders);
      }

      // Route not found
      return new Response(JSON.stringify({ error: 'Route not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('LOG: WORKER-ERROR-1 - Request processing failed:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Handler: User Registration
async function handleRegister(request: Request, dbService: DatabaseService, corsHeaders: unknown): Promise<Response> {
  console.log('LOG: WORKER-AUTH-REG-1 - Processing registration');
  
  try {
    const body = await request.json() as any;
    const { email, username, password, role} = body;
    
    // Validate input
    if (!email ?? !username  ?? !password  ?? !role) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    if (!AuthService.validateEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate username
    const usernameValidation = AuthService.validateUsername(username);
    if (!usernameValidation.isValid) {
      return new Response(JSON.stringify({ error: usernameValidation.errors[0] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate password
    const passwordValidation = AuthService.validatePassword(password);
    if (!passwordValidation.isValid) {
      return new Response(JSON.stringify({ error: passwordValidation.errors[0] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate role
    if (!['creator', 'influencer'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user already exists
    const existingUser = await dbService.getUserByEmail(email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    return new Response(JSON.stringify({
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        onboarding_completed: newUser.onboardingcompleted
      },
      token
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('LOG: WORKER-AUTH-REG-ERROR-1 - Registration failed:', error);
    return new Response(JSON.stringify({ error: 'Registration failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handler: User Login
async function handleLogin(request: Request, dbService: DatabaseService, corsHeaders: unknown): Promise<Response> {
  console.log('LOG: WORKER-AUTH-LOGIN-1 - Processing login');
  
  try {
    const body = await request.json() as any;
    const { email, password} = body;
    
    // Validate input
    if (!email ?? !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find user by email
    const user = await dbService.getUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, user.passwordhash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        onboarding_completed: user.onboardingcompleted
      },
      token
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('LOG: WORKER-AUTH-LOGIN-ERROR-1 - Login failed:', error);
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handler: Get Current User
async function handleGetMe(request: Request, dbService: DatabaseService, corsHeaders: unknown): Promise<Response> {
  console.log('LOG: WORKER-AUTH-ME-1 - Processing get user');
  
  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const authUser = await AuthService.verifyToken(token);
    
    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user from database
    const user = await dbService.getUserByEmail(authUser.email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      onboarding_completed: user.onboardingcompleted,
      ai_preference_level: user.aipreferencelevel,
      profile_data: JSON.parse(user.profile_data ?? '{}')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('LOG: WORKER-AUTH-ME-ERROR-1 - Get user failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to get user' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handler: User Onboarding
async function handleOnboard(request: Request, dbService: DatabaseService, corsHeaders: unknown): Promise<Response> {
  console.log('LOG: WORKER-ONBOARD-1 - Processing onboarding');
  
  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader ?? !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const authUser = await AuthService.verifyToken(token);
    
    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update user onboarding status
    await dbService.updateUserOnboarding(authUser.id, true);

    return new Response(JSON.stringify({
      message: 'Onboarding completed successfully',
      user: {
        id: authUser.id,
        onboarding_completed: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('LOG: WORKER-ONBOARD-ERROR-1 - Onboarding failed:', error);
    return new Response(JSON.stringify({ error: 'Onboarding failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handler: Health Check
async function handleHealth(cloudflareService: CloudflareService, corsHeaders: unknown): Promise<Response> {
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
    
    return new Response(JSON.stringify(health), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('LOG: WORKER-HEALTH-ERROR-1 - Health check failed:', error);
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}