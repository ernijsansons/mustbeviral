// Secure Must Be Viral Worker
// Implements comprehensive security measures and best practices

import { CloudflareEnv } from '../lib/cloudflare';
import { SecureAuth } from './secure-auth';
import { SecurePassword } from './secure-password';
import { InputValidator } from './input-validation';
import { RateLimiter } from './rate-limiter';
import { SecurityMiddleware } from './security-middleware';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export default {
  async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
    const startTime = Date.now();

    // Validate environment configuration
    if (!this.validateEnvironment(env)) {
      return this.createErrorResponse('Server configuration error', 500);
    }

    try {
      // Security checks
      const securityCheck = SecurityMiddleware.isSuspiciousRequest(request);
      if (securityCheck.suspicious) {
        await this.logSecurityEvent('suspicious_request', request, env, {
          reason: securityCheck.reason
        });
        return this.createErrorResponse('Request blocked for security reasons', 403);
      }

      // CORS validation
      const corsResult = SecurityMiddleware.validateCORSRequest(request, env);
      if (!corsResult.valid) {
        return this.createErrorResponse(corsResult.error || 'CORS validation failed', 403, corsResult.headers);
      }

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: SecurityMiddleware.getSecurityHeaders(env, request.headers.get('origin') || undefined)
        });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // Rate limiting
      const rateLimitResult = await this.checkRateLimit(path, request, env);
      if (!rateLimitResult.allowed) {
        await this.logSecurityEvent('rate_limit_exceeded', request, env, {
          reason: rateLimitResult.reason,
          endpoint: path
        });
        return this.createErrorResponse(
          rateLimitResult.reason || 'Rate limit exceeded',
          429,
          RateLimiter.createRateLimitHeaders(rateLimitResult)
        );
      }

      // Route requests
      const response = await this.handleRequest(request, env, path);

      // Add security headers to response
      const securityHeaders = SecurityMiddleware.getSecurityHeaders(env, request.headers.get('origin') || undefined);
      const rateLimitHeaders = RateLimiter.createRateLimitHeaders(rateLimitResult);

      // Combine all headers
      Object.entries({ ...securityHeaders, ...rateLimitHeaders }).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Log successful requests
      await this.logRequest(request, response, env, Date.now() - startTime);

      return response;

    } catch (error: unknown) {
      console.error('Worker error:', error);
      await this.logSecurityEvent('internal_error', request, env, { error: error.message });
      return this.createErrorResponse('Internal server error', 500);
    }
  },

  /**
   * Handle incoming requests and route to appropriate endpoints
   */
  async handleRequest(request: Request, env: CloudflareEnv, path: string): Promise<Response> {
    // Health check
    if (path === '/api/health') {
      return this.createSuccessResponse({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0-secure'
      });
    }

    // Authentication endpoints
    if (path === '/api/auth/register' && request.method === 'POST') {
      return await this.handleRegister(request, env);
    }

    if (path === '/api/auth/login' && request.method === 'POST') {
      return await this.handleLogin(request, env);
    }

    if (path === '/api/auth/me' && request.method === 'GET') {
      return await this.handleGetCurrentUser(request, env);
    }

    if (path === '/api/auth/onboarding' && request.method === 'POST') {
      return await this.handleOnboarding(request, env);
    }

    if (path === '/api/auth/refresh' && request.method === 'POST') {
      return await this.handleRefreshToken(request, env);
    }

    // Content endpoints
    if (path === '/api/content/create' && request.method === 'POST') {
      return await this.handleCreateContent(request, env);
    }

    if (path === '/api/content/list' && request.method === 'GET') {
      return await this.handleListContent(request, env);
    }

    if (path.startsWith('/api/content/') && request.method === 'GET') {
      return await this.handleGetContent(request, env, path);
    }

    if (path.startsWith('/api/content/') && request.method === 'PUT') {
      return await this.handleUpdateContent(request, env, path);
    }

    if (path.startsWith('/api/content/') && request.method === 'DELETE') {
      return await this.handleDeleteContent(request, env, path);
    }

    // AI endpoints
    if (path === '/api/content/generate' && request.method === 'POST') {
      return await this.handleGenerateContent(request, env);
    }

    // Payment endpoints
    if (path === '/api/payments/create-checkout' && request.method === 'POST') {
      return await this.handleCreateCheckout(request, env);
    }

    if (path === '/api/payments/subscription' && request.method === 'GET') {
      return await this.handleGetSubscription(request, env);
    }

    if (path === '/api/payments/cancel' && request.method === 'POST') {
      return await this.handleCancelSubscription(request, env);
    }

    if (path === '/api/payments/webhook' && request.method === 'POST') {
      return await this.handlePaymentWebhook(request, env);
    }

    if (path === '/api/payments/pricing' && request.method === 'GET') {
      return await this.handleGetPricing(request, env);
    }

    // 404 for unmatched routes
    return this.createErrorResponse('Endpoint not found', 404);
  },

  /**
   * Handle user registration
   */
  async handleRegister(request: Request, env: CloudflareEnv): Promise<Response> {
    try {
      const body = await request.json();
      const validation = InputValidator.validateRegistration(body);

      if (!validation.valid) {
        return this.createErrorResponse(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      const { _email, username, password, role, aiPreferenceLevel } = validation.sanitized!;

      // Check if user exists
      const existingUser = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ? OR username = ?'
      ).bind(email, username).first();

      if (existingUser) {
        await this.logSecurityEvent('registration_attempt_duplicate', request, env, { _email, username });
        return this.createErrorResponse('User already exists', 409);
      }

      // Hash password securely
      const passwordHash = await SecurePassword.hashPassword(password);

      // Create user
      const userId = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO users (id, email, username, password_hash, role, onboarding_completed, ai_preference_level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        email,
        username,
        passwordHash,
        role || 'creator',
        false,
        aiPreferenceLevel || 50
      ).run();

      // Generate tokens
      const accessToken = await SecureAuth.generateToken(userId, email, username, role || 'creator', env);
      const refreshToken = await SecureAuth.generateRefreshToken(userId, env);

      // Store refresh token
      await env.KV?.put(`refresh_token:${userId}`, refreshToken, { expirationTtl: 7 * 24 * 60 * 60 });

      const user = {
        id: userId,
        email,
        username,
        role: role || 'creator',
        onboarding_completed: false,
        ai_preference_level: aiPreferenceLevel || 50
      };

      await this.logSecurityEvent('user_registered', request, env, { _userId, email });

      return this.createSuccessResponse({
        user: SecurityMiddleware.sanitizeResponse(user),
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 15 * 60 // 15 minutes
        }
      }, 'User created successfully', 201);

    } catch (error: unknown) {
      console.error('Registration error:', error);
      return this.createErrorResponse('Registration failed', 500);
    }
  },

  /**
   * Handle user login
   */
  async handleLogin(request: Request, env: CloudflareEnv): Promise<Response> {
    try {
      const body = await request.json();
      const validation = InputValidator.validateLogin(body);

      if (!validation.valid) {
        return this.createErrorResponse(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      const { _email, password } = validation.sanitized!;

      // Find user
      const user = await env.DB.prepare(
        'SELECT id, email, username, password_hash, role, onboarding_completed, ai_preference_level FROM users WHERE email = ?'
      ).bind(email).first() as unknown;

      if (!user) {
        await this.logSecurityEvent('login_attempt_invalid_email', request, env, { email });
        return this.createErrorResponse('Invalid credentials', 401);
      }

      // Verify password
      const validPassword = await SecurePassword.verifyPassword(password, user.password_hash);
      if (!validPassword) {
        await this.logSecurityEvent('login_attempt_invalid_password', request, env, { userId: user.id });
        return this.createErrorResponse('Invalid credentials', 401);
      }

      // Generate tokens
      const accessToken = await SecureAuth.generateToken(user.id, user.email, user.username, user.role, env);
      const refreshToken = await SecureAuth.generateRefreshToken(user.id, env);

      // Store refresh token
      await env.KV?.put(`refresh_token:${user.id}`, refreshToken, { expirationTtl: 7 * 24 * 60 * 60 });

      const userResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        onboarding_completed: user.onboarding_completed === 1,
        ai_preference_level: user.ai_preference_level
      };

      await this.logSecurityEvent('user_login', request, env, { userId: user.id });

      return this.createSuccessResponse({
        user: SecurityMiddleware.sanitizeResponse(userResponse),
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 15 * 60
        }
      }, 'Login successful');

    } catch (error: unknown) {
      console.error('Login error:', error);
      return this.createErrorResponse('Login failed', 500);
    }
  },

  /**
   * Get current user
   */
  async handleGetCurrentUser(request: Request, env: CloudflareEnv): Promise<Response> {
    const authResult = await this.authenticateRequest(request, env);
    if (!authResult.success) {
      return this.createErrorResponse(authResult.error!, 401);
    }

    const user = await env.DB.prepare(
      'SELECT id, email, username, role, onboarding_completed, ai_preference_level FROM users WHERE id = ?'
    ).bind(authResult.userId).first() as unknown;

    if (!user) {
      return this.createErrorResponse('User not found', 404);
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      onboarding_completed: user.onboarding_completed === 1,
      ai_preference_level: user.ai_preference_level
    };

    return this.createSuccessResponse(SecurityMiddleware.sanitizeResponse(userResponse));
  },

  /**
   * Handle token refresh
   */
  async handleRefreshToken(request: Request, env: CloudflareEnv): Promise<Response> {
    try {
      const body = await request.json();
      const { refresh_token } = body;

      if (!refresh_token) {
        return this.createErrorResponse('Refresh token required', 400);
      }

      const tokenResult = await SecureAuth.verifyRefreshToken(refresh_token, env);
      if (!tokenResult.valid) {
        return this.createErrorResponse('Invalid refresh token', 401);
      }

      const userId = tokenResult.payload!.sub;

      // Verify refresh token in storage
      const storedToken = await env.KV?.get(`refresh_token:${userId}`);
      if (storedToken !== refresh_token) {
        await this.logSecurityEvent('invalid_refresh_token_attempt', request, env, { userId });
        return this.createErrorResponse('Invalid refresh token', 401);
      }

      // Get user details
      const user = await env.DB.prepare(
        'SELECT email, username, role FROM users WHERE id = ?'
      ).bind(userId).first() as unknown;

      if (!user) {
        return this.createErrorResponse('User not found', 404);
      }

      // Generate new tokens
      const accessToken = await SecureAuth.generateToken(userId, user.email, user.username, user.role, env);
      const newRefreshToken = await SecureAuth.generateRefreshToken(userId, env);

      // Update stored refresh token
      await env.KV?.put(`refresh_token:${userId}`, newRefreshToken, { expirationTtl: 7 * 24 * 60 * 60 });

      return this.createSuccessResponse({
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 15 * 60
      });

    } catch (error: unknown) {
      console.error('Token refresh error:', error);
      return this.createErrorResponse('Token refresh failed', 500);
    }
  },

  // ... [Additional secure implementations for other endpoints would continue here]
  // For brevity, I'll implement a few key ones and indicate where others would go

  /**
   * Authenticate request and extract user information
   */
  async authenticateRequest(request: Request, env: CloudflareEnv): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
  }> {
    const authValidation = InputValidator.validateAuthHeader(request.headers.get('authorization'));
    if (!authValidation.valid) {
      return { success: false, error: authValidation.error };
    }

    const tokenResult = await SecureAuth.verifyToken(authValidation.token!, env);
    if (!tokenResult.valid) {
      return { success: false, error: tokenResult.error || 'Invalid token' };
    }

    return { success: true, userId: tokenResult.payload!.sub };
  },

  /**
   * Check rate limits for different endpoint types
   */
  async checkRateLimit(path: string, request: Request, env: CloudflareEnv): Promise<unknown> {
    const identifier = RateLimiter.getIdentifier(request);

    if (path.includes('/auth/')) {
      if (path.includes('/login') || path.includes('/register')) {
        return await RateLimiter.checkAuthRateLimit(identifier, env);
      }
    }

    if (path.includes('/content/generate')) {
      return await RateLimiter.checkAIRateLimit(identifier, env);
    }

    if (path.includes('/content/')) {
      return await RateLimiter.checkContentRateLimit(identifier, env);
    }

    return await RateLimiter.checkGeneralRateLimit(identifier, env);
  },

  /**
   * Validate environment configuration
   */
  validateEnvironment(env: CloudflareEnv): boolean {
    return !!(
      env.DB &&
      env.JWT_SECRET &&
      env.JWT_REFRESH_SECRET &&
      env.JWT_SECRET.length >= 32 &&
      env.JWT_REFRESH_SECRET.length >= 32
    );
  },

  /**
   * Log security events for monitoring and analysis
   */
  async logSecurityEvent(
    event: string,
    request: Request,
    env: CloudflareEnv,
    metadata: unknown = {}
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        url: request.url,
        method: request.method,
        metadata
      };

      // Store in KV for analysis (with TTL)
      const logKey = `security_log:${Date.now()}:${crypto.randomUUID()}`;
      await env.KV?.put(logKey, JSON.stringify(logEntry), { expirationTtl: 30 * 24 * 60 * 60 }); // 30 days

      console.log('Security Event:', logEntry);
    } catch (error: unknown) {
      console.error('Failed to log security event:', error);
    }
  },

  /**
   * Log regular requests for monitoring
   */
  async logRequest(
    request: Request,
    response: Response,
    env: CloudflareEnv,
    duration: number
  ): Promise<void> {
    // Only log in development or for errors
    if (env.ENVIRONMENT === 'development' || response.status >= 400) {
      console.log({
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        status: response.status,
        duration: `${duration}ms`,
        ip: request.headers.get('cf-connecting-ip') || 'unknown'
      });
    }
  },

  /**
   * Helper methods for creating responses
   */
  createSuccessResponse<T>(data: T, message?: string, status: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data: SecurityMiddleware.sanitizeResponse(data),
      ...(message && { message })
    };

    return Response.json(response, { status });
  },

  createErrorResponse(error: string, status: number, headers?: Record<string, string>): Response {
    const response: ApiResponse = {
      success: false,
      error
    };

    return Response.json(response, { _status, headers });
  },

  // Placeholder implementations for remaining endpoints
  async handleOnboarding(request: Request, env: CloudflareEnv): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleCreateContent(request: Request, env: CloudflareEnv): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleListContent(request: Request, env: CloudflareEnv): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleGetContent(request: Request, env: CloudflareEnv, path: string): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleUpdateContent(request: Request, env: CloudflareEnv, path: string): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleDeleteContent(request: Request, env: CloudflareEnv, path: string): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleGenerateContent(request: Request, env: CloudflareEnv): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleCreateCheckout(request: Request, env: CloudflareEnv): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleGetSubscription(request: Request, env: CloudflareEnv): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleCancelSubscription(request: Request, env: CloudflareEnv): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handlePaymentWebhook(request: Request, env: CloudflareEnv): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  },

  async handleGetPricing(request: Request, env: CloudflareEnv): Promise<Response> {
    // Implementation would go here
    return this.createErrorResponse('Not implemented', 501);
  }
};