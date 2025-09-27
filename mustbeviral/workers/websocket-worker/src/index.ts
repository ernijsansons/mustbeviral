// WebSocket Worker - Real-time Communication Service
// Handles WebSocket connections, real-time collaboration, and notifications

import { Router } from './router';
import { WebSocketRoom, CollaborationRoom, NotificationHub } from './durable-objects';
import { SecurityMiddleware } from './middleware/security';
import { AuthMiddleware } from './middleware/auth';
import { RateLimitMiddleware } from './middleware/rateLimit';
import { Logger } from './utils/logger';
import { MetricsCollector } from './utils/metrics';
import { HealthCheck } from './utils/health';

export interface Env {
  // Durable Objects
  WEBSOCKET_ROOM: DurableObjectNamespace;
  COLLABORATION_ROOM: DurableObjectNamespace;
  NOTIFICATION_HUB: DurableObjectNamespace;

  // KV for connection metadata
  CONNECTION_STORE: KVNamespace;

  // Service Bindings
  AUTH_SERVICE: Fetcher;
  CONTENT_SERVICE: Fetcher;

  // Environment Variables
  ENVIRONMENT: string;
  SERVICE_NAME: string;
  LOG_LEVEL: string;
  ALLOWED_ORIGINS: string;
  MAX_CONNECTIONS_PER_USER: string;
  MAX_CONNECTIONS_PER_IP: string;
  MESSAGE_RATE_LIMIT: string;
  HEARTBEAT_INTERVAL: string;
  CONNECTION_TIMEOUT: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // Initialize services
    const logger = new Logger(env.SERVICE_NAME, env.LOG_LEVEL);
    const metrics = new MetricsCollector(env.SERVICE_NAME);
    const security = new SecurityMiddleware(env);
    const auth = new AuthMiddleware(env.AUTH_SERVICE);
    const rateLimit = new RateLimitMiddleware(env);

    // Start request tracking
    const startTime = Date.now();
    const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const requestId = crypto.randomUUID();

    logger.info('WebSocket request received', {
      requestId,
      method: request.method,
      url: request.url,
      clientIP,
      userAgent: request.headers.get('User-Agent')
    });

    try {
      // Apply security checks
      const securityCheck = await security.validate(request);
      if (!securityCheck.valid) {
        logger.warn('Security check failed', { requestId, reason: securityCheck.reason });
        return security.createErrorResponse(403, 'Security validation failed');
      }

      // Apply rate limiting
      const rateLimitCheck = await rateLimit.checkLimit(clientIP, request);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded', { requestId, clientIP });
        return new Response('Rate limit exceeded', { status: 429 });
      }

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return security.handlePreflight(request);
      }

      // Create router
      const router = new Router();

      // Public routes
      router.get('/health', () => HealthCheck.check(env));
      router.get('/metrics', () => metrics.export());

      // WebSocket connection routes
      router.get('/ws/room/:roomId', async (req, params) => {
        return handleRoomConnection(req, params.roomId, env, logger);
      });

      router.get('/ws/collaborate/:contentId', async (req, params) => {
        return handleCollaborationConnection(req, params.contentId, env, logger);
      });

      router.get('/ws/notifications/:userId', async (req, params) => {
        return handleNotificationConnection(req, params.userId, env, logger, auth);
      });

      // Room management routes
      router.get('/api/rooms/:roomId/info', async (req, params) => {
        return getRoomInfo(params.roomId, env);
      });

      router.post('/api/rooms/:roomId/message', async (req, params) => {
        return sendRoomMessage(req, params.roomId, env);
      });

      router.post('/api/rooms/:roomId/kick', async (req, params) => {
        return kickUserFromRoom(req, params.roomId, env);
      });

      // Collaboration management
      router.get('/api/collaborate/:contentId/status', async (req, params) => {
        return getCollaborationStatus(params.contentId, env);
      });

      router.post('/api/collaborate/:contentId/operation', async (req, params) => {
        return applyCollaborativeOperation(req, params.contentId, env);
      });

      // Notification management
      router.post('/api/notifications/send', async (req) => {
        return sendNotification(req, env);
      });

      router.post('/api/notifications/broadcast', async (req) => {
        return broadcastNotification(req, env);
      });

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
  },

};

async function handleRoomConnection(request: Request, roomId: string, env: Env, logger: Logger): Promise<Response> {
    try {
      // Get room durable object
      const roomObjectId = env.WEBSOCKET_ROOM.idFromName(roomId);
      const roomObject = env.WEBSOCKET_ROOM.get(roomObjectId);

      // Forward request to room
      return await roomObject.fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });

    } catch (error) {
      logger.error('Room connection failed', {
        roomId,
        error: error instanceof Error ? error.message : error
      });
      return new Response('Room connection failed', { status: 500 });
    }
}

async function handleCollaborationConnection(request: Request, contentId: string, env: Env, logger: Logger): Promise<Response> {
    try {
      // Get collaboration room durable object
      const collabObjectId = env.COLLABORATION_ROOM.idFromName(contentId);
      const collabObject = env.COLLABORATION_ROOM.get(collabObjectId);

      // Forward request to collaboration room
      return await collabObject.fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });

    } catch (error) {
      logger.error('Collaboration connection failed', {
        contentId,
        error: error instanceof Error ? error.message : error
      });
      return new Response('Collaboration connection failed', { status: 500 });
    }
}

async function handleNotificationConnection(request: Request, userId: string, env: Env, logger: Logger, auth: AuthMiddleware): Promise<Response> {
    try {
      // Authenticate user for notifications
      const authResult = await auth.authenticate(request);
      if (!authResult.valid || authResult.user.id !== userId) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Get notification hub durable object
      const hubObjectId = env.NOTIFICATION_HUB.idFromName(userId);
      const hubObject = env.NOTIFICATION_HUB.get(hubObjectId);

      // Forward request to notification hub
      return await hubObject.fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });

    } catch (error) {
      logger.error('Notification connection failed', {
        userId,
        error: error instanceof Error ? error.message : error
      });
      return new Response('Notification connection failed', { status: 500 });
    }
}

async function getRoomInfo(roomId: string, env: Env): Promise<Response> {
    const roomObjectId = env.WEBSOCKET_ROOM.idFromName(roomId);
    const roomObject = env.WEBSOCKET_ROOM.get(roomObjectId);

    return await roomObject.fetch('http://internal/info');
}

async function sendRoomMessage(request: Request, roomId: string, env: Env): Promise<Response> {
    const roomObjectId = env.WEBSOCKET_ROOM.idFromName(roomId);
    const roomObject = env.WEBSOCKET_ROOM.get(roomObjectId);

    return await roomObject.fetch('http://internal/message', {
      method: 'POST',
      body: request.body,
      headers: { 'Content-Type': 'application/json' }
    });
}

async function kickUserFromRoom(request: Request, roomId: string, env: Env): Promise<Response> {
    const roomObjectId = env.WEBSOCKET_ROOM.idFromName(roomId);
    const roomObject = env.WEBSOCKET_ROOM.get(roomObjectId);

    return await roomObject.fetch('http://internal/kick', {
      method: 'POST',
      body: request.body,
      headers: { 'Content-Type': 'application/json' }
    });
}

async function getCollaborationStatus(contentId: string, env: Env): Promise<Response> {
    const collabObjectId = env.COLLABORATION_ROOM.idFromName(contentId);
    const collabObject = env.COLLABORATION_ROOM.get(collabObjectId);

    return await collabObject.fetch('http://internal/status');
}

async function applyCollaborativeOperation(request: Request, contentId: string, env: Env): Promise<Response> {
    const collabObjectId = env.COLLABORATION_ROOM.idFromName(contentId);
    const collabObject = env.COLLABORATION_ROOM.get(collabObjectId);

    return await collabObject.fetch('http://internal/operation', {
      method: 'POST',
      body: request.body,
      headers: { 'Content-Type': 'application/json' }
    });
}

async function sendNotification(request: Request, env: Env): Promise<Response> {
    const { userId, notification } = await request.json() as any;

    const hubObjectId = env.NOTIFICATION_HUB.idFromName(userId);
    const hubObject = env.NOTIFICATION_HUB.get(hubObjectId);

    return await hubObject.fetch('http://internal/send', {
      method: 'POST',
      body: JSON.stringify(notification),
      headers: { 'Content-Type': 'application/json' }
    });
}

async function broadcastNotification(request: Request, env: Env): Promise<Response> {
    const { userIds, notification } = await request.json() as any;

    // Send to multiple users
    const promises = userIds.map(async (userId: string) => {
      const hubObjectId = env.NOTIFICATION_HUB.idFromName(userId);
      const hubObject = env.NOTIFICATION_HUB.get(hubObjectId);

      return hubObject.fetch('http://internal/send', {
        method: 'POST',
        body: JSON.stringify(notification),
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await Promise.all(promises);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
}

// Export Durable Objects
export { WebSocketRoom, CollaborationRoom, NotificationHub };