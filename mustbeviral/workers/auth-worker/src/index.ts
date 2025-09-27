// Auth Worker - Microservice Entry Point
// Handles authentication, authorization, and session management

import { Router } from './router';
import { SessionManager } from './durable-objects/SessionManager';
import { AuthController } from './controllers/AuthController';
import { TokenController } from './controllers/TokenController';
import { SessionController } from './controllers/SessionController';
import { SecurityMiddleware } from './middleware/security';
import { RateLimiter } from './middleware/rateLimiter';
import { Logger } from './utils/logger';
import { MetricsCollector } from './utils/metrics';
import { HealthCheck } from './utils/health';

export interface Env {
  // D1 Database
  AUTH_DB: D1Database;

  // KV Namespaces
  SESSION_STORE: KVNamespace;
  REFRESH_TOKEN_STORE: KVNamespace;
  RATE_LIMITER: KVNamespace;

  // Durable Objects
  SESSION_MANAGER: DurableObjectNamespace;

  // Service Bindings
  CONTENT_SERVICE: Fetcher;
  ANALYTICS_SERVICE: Fetcher;

  // Environment Variables
  ENVIRONMENT: string;
  SERVICE_NAME: string;
  LOG_LEVEL: string;
  ALLOWED_ORIGINS: string;
  TOKEN_EXPIRY: string;
  REFRESH_TOKEN_EXPIRY: string;
  MAX_LOGIN_ATTEMPTS: string;
  LOCKOUT_DURATION: string;

  // Secrets
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  OAUTH_GOOGLE_SECRET?: string;
  OAUTH_GITHUB_SECRET?: string;
  ENCRYPTION_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize services
    const logger = new Logger(env.SERVICE_NAME, env.LOG_LEVEL);
    const metrics = new MetricsCollector(env.SERVICE_NAME);
    const security = new SecurityMiddleware(env);
    const rateLimiter = new RateLimiter(env.RATE_LIMITER);

    // Start request tracking
    const startTime = Date.now();

    const requestId = crypto.randomUUID();
    logger.info('Request received', {
      requestId,
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });

    try {
      // Apply security checks
      const securityCheck = await security.validate(request);
      if (!securityCheck.valid) {
        logger.warn('Security check failed', { requestId, reason: securityCheck.reason });
        return security.createErrorResponse(403, 'Security validation failed');
      }

      // Apply rate limiting
      const clientId = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const rateLimitCheck = await rateLimiter.check(clientId, request.url);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded', { requestId, clientId });
        return security.createErrorResponse(429, 'Rate limit exceeded', {
          'Retry-After': rateLimitCheck.retryAfter.toString()
        });
      }

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return security.handlePreflight(request);
      }

      // Initialize controllers
      const authController = new AuthController(env, logger, metrics);
      const tokenController = new TokenController(env, logger);
      const sessionController = new SessionController(env, logger);

      // Create router
      const router = new Router();

      // Register routes
      router.post('/api/auth/register', (req) => authController.register(req));
      router.post('/api/auth/login', (req) => authController.login(req));
      router.post('/api/auth/logout', (req) => authController.logout(req));
      router.post('/api/auth/refresh', (req) => tokenController.refresh(req));
      router.get('/api/auth/verify', (req) => tokenController.verify(req));
      router.get('/api/auth/session', (req) => sessionController.getSession(req));
      router.delete('/api/auth/session', (req) => sessionController.invalidateSession(req));
      router.post('/api/auth/password/reset', (req) => authController.resetPassword(req));
      router.post('/api/auth/password/change', (req) => authController.changePassword(req));
      router.post('/api/auth/mfa/enable', (req) => authController.enableMFA(req));
      router.post('/api/auth/mfa/verify', (req) => authController.verifyMFA(req));

      // OAuth routes
      router.get('/api/auth/oauth/google', (req) => authController.oauthGoogle(req));
      router.get('/api/auth/oauth/google/callback', (req) => authController.oauthGoogleCallback(req));
      router.get('/api/auth/oauth/github', (req) => authController.oauthGithub(req));
      router.get('/api/auth/oauth/github/callback', (req) => authController.oauthGithubCallback(req));

      // Health check
      router.get('/health', () => HealthCheck.check(env));
      router.get('/metrics', () => metrics.export());

      // Handle request
      let response = await router.handle(request);

      if (!response) {
        response = security.createErrorResponse(404, 'Route not found');
      }

      // Add security headers
      response = security.addSecurityHeaders(response);
      response = security.addCORSHeaders(request, response);

      // Track metrics
      const duration = Date.now() - startTime;
      metrics.recordRequest(request.method, response.status, duration);

      logger.info('Request completed', {
        requestId,
        status: response.status,
        duration
      });

      return response;

    } catch (error) {
      logger.error('Request failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      metrics.recordError(request.method, 500);

      return security.createErrorResponse(500, 'Internal server error');
    }
  }
};

// Export Durable Objects
export { SessionManager };