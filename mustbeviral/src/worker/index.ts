// Cloudflare Worker Entry Point - Refactored
// Clean, modular architecture with proper separation of concerns

import { CloudflareEnv, CloudflareService} from '../lib/cloudflare';
import { DatabaseService} from '../lib/db';
import { AuthService} from '../lib/auth';
import { JWTManager} from '../lib/auth/jwtManager';
import { SecurityMiddleware} from '../middleware/security';
import { EnvironmentManager} from '../config/environment';
import { secretManager} from '../config/secrets';
import { EnvironmentValidator} from './environmentValidator';
import { logger, log} from '../lib/monitoring/logger';
import { Router} from './router';

// Cloudflare Worker types
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    // Generate unique request ID for tracing
    const requestId = crypto.randomUUID();
    logger.configure(env, requestId);

    const timer = log.startTimer('request_processing');

    log.info('Processing request', { requestId,
      action: 'request_start',
      metadata: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      }
    });

    try {
      // Step 1: Validate environment configuration
      const envValidation = await EnvironmentValidator.validateEnvironment(env);
      if (!envValidation.valid) {
        log.error('Environment validation failed', new Error('Invalid environment configuration'), {
          component: 'environment',
          metadata: envValidation
        });

        // Return appropriate error response based on endpoint and environment
        if (request.url.includes('/health')) {
          return EnvironmentValidator.createValidationResponse(envValidation);
        }

        const errorResponse = env.ENVIRONMENT === 'production'
          ? { error: 'Server configuration error' }
          : envValidation;

        return new Response(JSON.stringify(errorResponse), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Step 2: Initialize services
      EnvironmentManager.configure(env);
      await secretManager.initialize(env);
      await JWTManager.initialize();
      AuthService.initJwtSecret(env.JWT_SECRET!);

      // Step 3: Security validation
      const security = new SecurityMiddleware();
      const requestValidation = security.validateRequest(request);

      if (!requestValidation.valid) {
        log.security('Request blocked', {
          reason: requestValidation.reason,
          ip: request.headers.get('CF-Connecting-IP')  ?? 'unknown',
          userAgent: request.headers.get('User-Agent')  ?? 'unknown'
        });

        return new Response(JSON.stringify({ error: 'Request blocked for security reasons' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Step 4: Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return security.handlePreflight(request);
      }

      // Step 5: Initialize services
      const cloudflareService = new CloudflareService(env);
      const dbService = new DatabaseService(env);

      // Step 6: Route request
      const router = new Router(dbService, cloudflareService);
      let response = await router.handle(request);

      if (!response) {
        // No matching route found
        response = new Response(JSON.stringify({ error: 'Route not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Step 7: Add security headers and CORS
      response = security.addCORSHeaders(request, response);
      response = security.addSecurityHeaders(response);

      // Log request completion
      timer();
      log.info('Request completed', { requestId,
        action: 'request_complete',
        metadata: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        }
      });

      return response;

    } catch (error: unknown) {
      log.error('Request processing failed', error as Error, { requestId,
        action: 'request_error'
      });

      // Create error response
      let errorResponse = new Response(JSON.stringify({
        error: 'Internal server error',
        requestId
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });

      // Add security headers even to error responses
      const security = new SecurityMiddleware();
      errorResponse = security.addCORSHeaders(request, errorResponse);
      errorResponse = security.addSecurityHeaders(errorResponse);

      return errorResponse;
    } finally {
      // Clear request context
      logger.clearContext();
    }
  }
};