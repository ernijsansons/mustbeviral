// API Router for Cloudflare Worker
// Manages routing and request handling

import { CloudflareEnv } from '../lib/cloudflare';
import { DatabaseService } from '../lib/db';
import { CloudflareService } from '../lib/cloudflare';
import { AuthHandlers } from './handlers/auth';
import { OnboardingHandler } from './handlers/onboarding';
import { HealthHandler } from './handlers/health';
import { AIController } from '../controllers/AIController';
import { MLController } from '../controllers/MLController';
import { OrganizationController } from '../controllers/OrganizationController';
import { _withDataIsolation, IsolatedRequest } from '../middleware/dataIsolation';
import { _withTracing, finishTracing, TracedRequest } from '../middleware/tracingMiddleware';
import { log } from '../lib/monitoring/logger';

export interface Route {
  pattern: RegExp;
  method: string;
  handler: (request: TracedRequest, params?: Record<string, string>) => Promise<Response>;
  requiresAuth?: boolean;
  requiresIsolation?: boolean;
  requiresTracing?: boolean;
}

export class Router {
  private routes: Route[] = [];
  private authHandlers: AuthHandlers;
  private onboardingHandler: OnboardingHandler;
  private healthHandler: HealthHandler;
  private aiController: AIController;
  private mlController: MLController;
  private organizationController: OrganizationController;

  constructor(
    private dbService: DatabaseService,
    private cloudflareService: CloudflareService
  ) {
    // Initialize handlers
    this.authHandlers = new AuthHandlers(dbService);
    this.onboardingHandler = new OnboardingHandler(dbService);
    this.healthHandler = new HealthHandler(cloudflareService);
    this.aiController = new AIController(cloudflareService.env);
    this.mlController = new MLController(cloudflareService.env);
    this.organizationController = new OrganizationController(cloudflareService.env);

    // Register routes
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // Authentication routes
    this.addRoute({
      pattern: /^\/api\/auth\/register$/,
      method: 'POST',
      handler: (req) => this.authHandlers.handleRegister(req)
    });

    this.addRoute({
      pattern: /^\/api\/auth\/login$/,
      method: 'POST',
      handler: (req) => this.authHandlers.handleLogin(req)
    });

    this.addRoute({
      pattern: /^\/api\/auth\/refresh$/,
      method: 'POST',
      handler: (req) => this.authHandlers.handleRefreshToken(req)
    });

    this.addRoute({
      pattern: /^\/api\/auth\/me$/,
      method: 'GET',
      handler: (req) => this.authHandlers.handleGetMe(req),
      requiresAuth: true
    });

    // Onboarding route
    this.addRoute({
      pattern: /^\/api\/onboard$/,
      method: 'POST',
      handler: (req) => this.onboardingHandler.handleOnboard(req),
      requiresAuth: true
    });

    // Health check route
    this.addRoute({
      pattern: /^\/api\/health$/,
      method: 'GET',
      handler: () => this.healthHandler.handleHealth()
    });

    // AI Content Generation routes
    this.addRoute({
      pattern: /^\/api\/ai\/generate$/,
      method: 'POST',
      handler: (req) => this.aiController.generateContent(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/generate\/variations$/,
      method: 'POST',
      handler: (req) => this.aiController.generateMultipleVariations(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/generate\/seo$/,
      method: 'POST',
      handler: (req) => this.aiController.generateSEOContent(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/generate\/viral$/,
      method: 'POST',
      handler: (req) => this.aiController.generateViralContent(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/ideas$/,
      method: 'POST',
      handler: (req) => this.aiController.generateContentIdeas(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/strategy$/,
      method: 'POST',
      handler: (req) => this.aiController.createContentStrategy(req),
      requiresAuth: true
    });

    // AI Content Analysis routes
    this.addRoute({
      pattern: /^\/api\/ai\/analyze$/,
      method: 'POST',
      handler: (req) => this.aiController.analyzeContent(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/optimize$/,
      method: 'POST',
      handler: (req) => this.aiController.optimizeForPlatform(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/improve$/,
      method: 'POST',
      handler: (req) => this.aiController.improveContent(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/plagiarism$/,
      method: 'POST',
      handler: (req) => this.aiController.checkPlagiarism(req),
      requiresAuth: true
    });

    // AI Batch Processing
    this.addRoute({
      pattern: /^\/api\/ai\/batch$/,
      method: 'POST',
      handler: (req) => this.aiController.processBatch(req),
      requiresAuth: true
    });

    // AI Management routes
    this.addRoute({
      pattern: /^\/api\/ai\/capabilities$/,
      method: 'GET',
      handler: (req) => this.aiController.getAICapabilities(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/metrics\/reset$/,
      method: 'POST',
      handler: (req) => this.aiController.resetUsageMetrics(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ai\/cache\/clear$/,
      method: 'POST',
      handler: (req) => this.aiController.clearCache(req),
      requiresAuth: true
    });

    // ML Recommendation routes
    this.addRoute({
      pattern: /^\/api\/ml\/recommendations$/,
      method: 'POST',
      handler: (req) => this.mlController.getRecommendations(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/similar$/,
      method: 'GET',
      handler: (req) => this.mlController.getSimilarContent(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/trending\/personalized$/,
      method: 'GET',
      handler: (req) => this.mlController.getPersonalizedTrending(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/behavior$/,
      method: 'POST',
      handler: (req) => this.mlController.trackUserBehavior(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/behavior\/batch$/,
      method: 'POST',
      handler: (req) => this.mlController.trackBehaviorBatch(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/content$/,
      method: 'POST',
      handler: (req) => this.mlController.addContent(req),
      requiresAuth: true
    });

    // ML Trending Detection routes
    this.addRoute({
      pattern: /^\/api\/ml\/trends$/,
      method: 'GET',
      handler: (req) => this.mlController.detectTrends(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/trends\/topic$/,
      method: 'GET',
      handler: (req) => this.mlController.getTopicTrends(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/trends\/emerging$/,
      method: 'GET',
      handler: (req) => this.mlController.getEmergingTopics(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/trends\/keywords$/,
      method: 'GET',
      handler: (req) => this.mlController.getTrendingKeywords(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/viral\/predict$/,
      method: 'GET',
      handler: (req) => this.mlController.predictViralContent(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/anomalies$/,
      method: 'GET',
      handler: (req) => this.mlController.detectAnomalies(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/engagement$/,
      method: 'POST',
      handler: (req) => this.mlController.addEngagementData(req),
      requiresAuth: true
    });

    this.addRoute({
      pattern: /^\/api\/ml\/engagement\/batch$/,
      method: 'POST',
      handler: (req) => this.mlController.addEngagementBatch(req),
      requiresAuth: true
    });

    // Organization Management routes
    this.addRoute({
      pattern: /^\/api\/organizations$/,
      method: 'POST',
      handler: (req) => this.organizationController.createOrganization(req),
      requiresAuth: true,
      requiresIsolation: true,
      requiresTracing: true
    });

    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)$/,
      method: 'GET',
      handler: (req, params) => this.organizationController.getOrganization(req, params?.orgId),
      requiresAuth: true,
      requiresIsolation: true
    });

    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)$/,
      method: 'PUT',
      handler: (req, params) => this.organizationController.updateOrganization(req, params?.orgId),
      requiresAuth: true,
      requiresIsolation: true
    });

    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)$/,
      method: 'DELETE',
      handler: (req, params) => this.organizationController.deleteOrganization(req, params?.orgId),
      requiresAuth: true,
      requiresIsolation: true
    });

    this.addRoute({
      pattern: /^\/api\/user\/organizations$/,
      method: 'GET',
      handler: (req) => this.organizationController.getUserOrganizations(req),
      requiresAuth: true,
      requiresIsolation: true
    });

    // Organization Members routes
    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)\/members$/,
      method: 'GET',
      handler: (req, params) => this.organizationController.getOrganizationMembers(req, params?.orgId),
      requiresAuth: true,
      requiresIsolation: true
    });

    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)\/invite$/,
      method: 'POST',
      handler: (req, params) => this.organizationController.inviteUser(req, params?.orgId),
      requiresAuth: true,
      requiresIsolation: true
    });

    this.addRoute({
      pattern: /^\/api\/organizations\/invitations\/(?<token>[^\/]+)\/accept$/,
      method: 'POST',
      handler: (req, params) => this.organizationController.acceptInvitation(req, params?.token),
      requiresAuth: true,
      requiresIsolation: true
    });

    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)\/members\/(?<userId>[^\/]+)$/,
      method: 'PUT',
      handler: (req, params) => this.organizationController.updateMember(req, params?.orgId, params?.userId),
      requiresAuth: true,
      requiresIsolation: true
    });

    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)\/members\/(?<userId>[^\/]+)$/,
      method: 'DELETE',
      handler: (req, params) => this.organizationController.removeMember(req, params?.orgId, params?.userId),
      requiresAuth: true,
      requiresIsolation: true
    });

    // Organization Teams routes
    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)\/teams$/,
      method: 'GET',
      handler: (req, params) => this.organizationController.getOrganizationTeams(req, params?.orgId),
      requiresAuth: true,
      requiresIsolation: true
    });

    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)\/teams$/,
      method: 'POST',
      handler: (req, params) => this.organizationController.createTeam(req, params?.orgId),
      requiresAuth: true,
      requiresIsolation: true
    });

    // Organization Usage and Analytics routes
    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)\/usage$/,
      method: 'GET',
      handler: (req, params) => this.organizationController.getUsageStats(req, params?.orgId),
      requiresAuth: true,
      requiresIsolation: true
    });

    this.addRoute({
      pattern: /^\/api\/organizations\/(?<orgId>[^\/]+)\/activity$/,
      method: 'GET',
      handler: (req, params) => this.organizationController.getOrganizationActivity(req, params?.orgId),
      requiresAuth: true,
      requiresIsolation: true
    });
  }

  private addRoute(route: Route): void {
    this.routes.push(route);
  }

  private extractParams(pattern: RegExp, path: string): Record<string, string> {
    const params: Record<string, string> = {};
    const match = pattern.exec(path);

    if (match && match.groups) {
      Object.keys(match.groups).forEach(key => {
        params[key] = match.groups![key];
      });
    }

    return params;
  }

  async handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    let response: Response | null = null;
    let error: Error | undefined = undefined;

    // Apply tracing first
    let tracedRequest: TracedRequest = await _withTracing(request as IsolatedRequest);

    try {
      log.debug('Routing request', {
        action: 'route',
        metadata: { path,
          method,
          traceId: tracedRequest.traceId,
          spanId: tracedRequest.spanId
        }
      });

      // Find matching route
      for (const route of this.routes) {
        if (route.pattern.test(path) && route.method === method) {
          const params = this.extractParams(route.pattern, path);

          log.info('Route matched', {
            action: 'route_matched',
            metadata: { path,
              method,
              pattern: route.pattern.toString(),
              requiresAuth: route.requiresAuth || false,
              requiresIsolation: route.requiresIsolation || false,
              requiresTracing: route.requiresTracing || false,
              traceId: tracedRequest.traceId
            }
          });

          // Apply data isolation for protected routes
          if (route.requiresAuth || route.requiresIsolation) {
            tracedRequest = await _withDataIsolation(tracedRequest, this.dbService) as TracedRequest;
          }

          // Execute route handler
          response = await route.handler(tracedRequest, params);
          return response;
        }
      }

      // No matching route found
      log.warn('Route not found', {
        action: 'route_not_found',
        metadata: { path,
          method,
          traceId: tracedRequest.traceId
        }
      });

      response = new Response(JSON.stringify({
        error: 'Route not found',
        path,
        method
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

      return response;

    } catch (routingError: unknown) {
      error = routingError as Error;

      log.error('Routing error', {
        action: 'routing_error',
        metadata: { path,
          method,
          error: error.message,
          traceId: tracedRequest.traceId
        }
      });

      response = new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });

      return response;

    } finally {
      // Always finish tracing
      if (response) {
        finishTracing(tracedRequest, response, error);
      }
    }
  }

  // Add dynamic route registration for plugins/extensions
  registerCustomRoute(route: Route): void {
    log.info('Registering custom route', {
      action: 'register_route',
      metadata: {
        pattern: route.pattern.toString(),
        method: route.method,
        requiresAuth: route.requiresAuth || false
      }
    });

    this.addRoute(route);
  }

  // List all registered routes (for debugging)
  getRoutes(): Array<{ pattern: string; method: string; requiresAuth: boolean }> {
    return this.routes.map(route => ({
      pattern: route.pattern.toString(),
      method: route.method,
      requiresAuth: route.requiresAuth || false
    }));
  }
}