// Content Worker - Microservice Entry Point
// Handles content creation, AI generation, and media management

import { Router } from './router';
import { ContentCollaborator, AIProcessor } from './durable-objects';
import { ContentController } from './controllers/ContentController';
import { MediaController } from './controllers/MediaController';
import { AIController } from './controllers/AIController';
import { TrendsController } from './controllers/TrendsController';
import { SecurityMiddleware } from './middleware/security';
import { AuthMiddleware } from './middleware/auth';
import { ValidationMiddleware } from './middleware/validation';
import { Logger } from './utils/logger';
import { MetricsCollector } from './utils/metrics';
import { HealthCheck } from './utils/health';

export interface Env {
  // D1 Database
  CONTENT_DB: D1Database;

  // KV Namespaces
  CONTENT_CACHE: KVNamespace;
  TRENDS_CACHE: KVNamespace;

  // R2 Storage
  MEDIA_STORAGE: R2Bucket;

  // Durable Objects
  CONTENT_COLLABORATOR: DurableObjectNamespace;
  AI_PROCESSOR: DurableObjectNamespace;

  // Service Bindings
  AUTH_SERVICE: Fetcher;
  ANALYTICS_SERVICE: Fetcher;

  // Queues
  AI_PROCESSING_QUEUE: Queue;
  CONTENT_PUBLISHING_QUEUE: Queue;

  // AI Binding
  AI: unknown;

  // Environment Variables
  ENVIRONMENT: string;
  SERVICE_NAME: string;
  LOG_LEVEL: string;
  ALLOWED_ORIGINS: string;
  MAX_CONTENT_SIZE: string;
  MAX_MEDIA_SIZE: string;
  AI_TIMEOUT: string;
  CACHE_TTL: string;

  // Secrets
  OPENAI_API_KEY: string;
  CONTENT_ENCRYPTION_KEY: string;
  MEDIA_SIGNING_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // Initialize services
    const logger = new Logger(env.SERVICE_NAME, env.LOG_LEVEL);
    const metrics = new MetricsCollector(env.SERVICE_NAME);
    const security = new SecurityMiddleware(env);
    const auth = new AuthMiddleware(env.AUTH_SERVICE);
    const _validation = new ValidationMiddleware();

    // Start request tracking
    const startTime = Date.now();

    const requestId = crypto.randomUUID();
    logger.info('Request received', {
      requestId,
      method: request.method,
      url: request.url,
      contentType: request.headers.get('Content-Type')
    });

    try {
      // Apply security checks
      const securityCheck = await security.validate(request);
      if (!securityCheck.valid) {
        logger.warn('Security check failed', { requestId, reason: securityCheck.reason });
        return security.createErrorResponse(403, 'Security validation failed');
      }

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return security.handlePreflight(request);
      }

      // Initialize controllers
      const contentController = new ContentController(env, logger, metrics);
      const mediaController = new MediaController(env, logger, metrics);
      const aiController = new AIController(env, logger, metrics);
      const trendsController = new TrendsController(env, logger, metrics);

      // Create router
      const router = new Router();

      // Public routes (no auth required)
      router.get('/health', () => HealthCheck.check(env));
      router.get('/metrics', () => metrics.export());
      router.get('/api/content/public/:id', (req, params) => contentController.getPublicContent(req, params.id));
      router.get('/api/trends/public', (req) => trendsController.getPublicTrends(req));

      // Protected routes (auth required)
      const authRequired = async (handler: (...args: any[]) => any) => {
        return async (req: Request, params?: unknown) => {
          const authResult = await auth.authenticate(req);
          if (!authResult.valid) {
            return new Response(JSON.stringify({ error: 'Authentication required' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          (req as any).user = authResult.user;
          return handler(req, params);
        };
      };

      // Content management routes
      router.get('/api/content', authRequired((req) => contentController.listContent(req)));
      router.post('/api/content', authRequired((req) => contentController.createContent(req)));
      router.get('/api/content/:id', authRequired((req, params) => contentController.getContent(req, params.id)));
      router.put('/api/content/:id', authRequired((req, params) => contentController.updateContent(req, params.id)));
      router.delete('/api/content/:id', authRequired((req, params) => contentController.deleteContent(req, params.id)));
      router.post('/api/content/:id/publish', authRequired((req, params) => contentController.publishContent(req, params.id)));
      router.post('/api/content/:id/schedule', authRequired((req, params) => contentController.scheduleContent(req, params.id)));
      router.post('/api/content/:id/duplicate', authRequired((req, params) => contentController.duplicateContent(req, params.id)));

      // Content collaboration routes
      router.get('/api/content/:id/collaborate', authRequired((req, params) => contentController.getCollaborationSession(req, params.id)));
      router.post('/api/content/:id/collaborate/join', authRequired((req, params) => contentController.joinCollaboration(req, params.id)));
      router.post('/api/content/:id/collaborate/leave', authRequired((req, params) => contentController.leaveCollaboration(req, params.id)));

      // Media management routes
      router.get('/api/media', authRequired((req) => mediaController.listMedia(req)));
      router.post('/api/media/upload', authRequired((req) => mediaController.uploadMedia(req)));
      router.get('/api/media/:id', authRequired((req, params) => mediaController.getMedia(req, params.id)));
      router.put('/api/media/:id', authRequired((req, params) => mediaController.updateMedia(req, params.id)));
      router.delete('/api/media/:id', authRequired((req, params) => mediaController.deleteMedia(req, params.id)));
      router.post('/api/media/:id/optimize', authRequired((req, params) => mediaController.optimizeMedia(req, params.id)));

      // AI enhancement routes
      router.post('/api/ai/enhance', authRequired((req) => aiController.enhanceContent(req)));
      router.post('/api/ai/generate', authRequired((req) => aiController.generateContent(req)));
      router.post('/api/ai/suggestions', authRequired((req) => aiController.getSuggestions(req)));
      router.post('/api/ai/analyze', authRequired((req) => aiController.analyzeContent(req)));
      router.post('/api/ai/optimize-seo', authRequired((req) => aiController.optimizeSEO(req)));
      router.post('/api/ai/generate-images', authRequired((req) => aiController.generateImages(req)));

      // Trends and analytics routes
      router.get('/api/trends', authRequired((req) => trendsController.getTrends(req)));
      router.get('/api/trends/keywords', authRequired((req) => trendsController.getTrendingKeywords(req)));
      router.get('/api/trends/topics', authRequired((req) => trendsController.getTrendingTopics(req)));
      router.post('/api/trends/analyze', authRequired((req) => trendsController.analyzeTrends(req)));

      // Bulk operations
      router.post('/api/content/bulk/publish', authRequired((req) => contentController.bulkPublish(req)));
      router.post('/api/content/bulk/schedule', authRequired((req) => contentController.bulkSchedule(req)));
      router.post('/api/content/bulk/delete', authRequired((req) => contentController.bulkDelete(req)));
      router.post('/api/content/bulk/export', authRequired((req) => contentController.bulkExport(req)));

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
        duration,
        contentLength: response.headers.get('Content-Length')
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
  },

  // Queue handlers
  async queue(batch: MessageBatch<unknown>, env: Env, ctx: ExecutionContext): Promise<void> {
    const logger = new Logger(env.SERVICE_NAME, env.LOG_LEVEL);

    for (const message of batch.messages) {
      try {
        switch (message.queue) {
          case 'ai-processing':
            await handleAIProcessing(message.body, env, logger);
            break;
          case 'content-publishing':
            await handleContentPublishing(message.body, env, logger);
            break;
          default:
            logger.warn('Unknown queue message', { queue: message.queue });
        }

        message.ack();
      } catch (error) {
        logger.error('Queue message processing failed', {
          queue: message.queue,
          messageId: message.id,
          error
        });
        message.retry();
      }
    }
  }
};

async function handleAIProcessing(data: any, env: Env, logger: Logger): Promise<void> {
  logger.info('Processing AI task', { taskType: data.type, contentId: data.contentId });

  // Get AI processor durable object
  const aiProcessorId = env.AI_PROCESSOR.idFromName(data.contentId);
  const aiProcessor = env.AI_PROCESSOR.get(aiProcessorId);

  // Process the AI task
  await aiProcessor.fetch('http://internal/process', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function handleContentPublishing(data: any, env: Env, logger: Logger): Promise<void> {
  logger.info('Publishing content', { contentId: data.contentId, scheduledTime: data.scheduledTime });

  const contentController = new ContentController(env, logger, new MetricsCollector(env.SERVICE_NAME));

  // Execute the publishing
  await contentController.executeScheduledPublish(data.contentId, data.platforms);
}

// Export Durable Objects
export { ContentCollaborator, AIProcessor };