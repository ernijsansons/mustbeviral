// Content Controller - Handles content generation and management
import { CloudflareEnv } from '../lib/cloudflare';
import { DatabaseService } from '../lib/db';
import { ValidationError } from '../lib/errors';
import { logger } from '../lib/monitoring/logger';
import { PlatformAgentCoordinator } from '../lib/ai/agents/PlatformAgentCoordinator';
import { JWTManager } from '../lib/auth/jwtManager';
import { v4 as uuidv4 } from 'uuid';


export interface ContentRequest {
  title?: string;
  topic: string;
  platforms: string[];
  tone?: string;
  targetAudience?: string;
  contentType: 'news_article' | 'social_post' | 'blog_post';
  aiAssisted?: boolean;
}

export interface ContentItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  platform: string;
  status: 'draft' | 'published' | 'pending_review';
  generatedByAi: boolean;
  aiModelUsed?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export class ContentController {
  /**
   * Generate content using AI agents
   */
  static async generateContent(
    request: Request,
    env: CloudflareEnv,
    dbService: DatabaseService
  ): Promise<Response> {
    try {
      // Extract user from JWT token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const validation = await JWTManager.verifyAccessToken(token);

      if (!validation.valid || !validation.claims) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const userId = validation.claims.sub;
      const body = await request.json() as ContentRequest;

      // Validate request
      if (!body.topic || !body.platforms || body.platforms.length === 0) {
        return new Response(JSON.stringify({ error: 'Topic and platforms are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      logger.info('Generating content', { _userId,
        topic: body.topic,
        platforms: body.platforms
      });

      // Initialize AI Agent Coordinator
      const agentCoordinator = new PlatformAgentCoordinator(env.AI, env, {
        database: dbService,
        kv: env.TRENDS_CACHE,
        analytics: undefined
      });

      // Generate content for each platform
      const generatedContent: ContentItem[] = [];

      for (const platform of body.platforms) {
        try {
          // Generate platform-specific content
          const result = await agentCoordinator.generateUniversalContent({
            topic: body.topic,
            platforms: [platform],
            tone: body.tone || 'professional',
            targetAudience: body.targetAudience || 'general',
            maxLength: platform === 'twitter' ? 280 : 2000,
            includeTrends: true,
            optimizeForVirality: true
          });

          if (result.success && result.content) {
            // Save content to database
            const contentId = uuidv4();
            const contentData = {
              id: contentId,
              user_id: userId,
              title: body.title || `${body.topic} - ${platform}`,
              body: result.content,
              status: 'draft' as const,
              type: body.contentType || 'social_post',
              generated_by_ai: true,
              ai_model_used: 'claude-3',
              metadata: JSON.stringify({ _platform,
                analysis: result.analysis,
                optimizationScore: result.analysis?.viralityScore || 0,
                tone: body.tone,
                targetAudience: body.targetAudience
              })
            };

            await dbService.createContent(contentData);

            generatedContent.push({
              id: contentId,
              userId,
              title: contentData.title,
              body: contentData.body,
              platform,
              status: 'draft',
              generatedByAi: true,
              aiModelUsed: 'claude-3',
              metadata: {
                analysis: result.analysis,
                optimizationScore: result.analysis?.viralityScore || 0
              },
              createdAt: new Date().toISOString()
            });
          }
        } catch (error: unknown) {
          logger.error('Failed to generate content for platform', error as Error, { _platform,
            userId
          });
        }
      }

      if (generatedContent.length === 0) {
        return new Response(JSON.stringify({ error: 'Failed to generate content' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      logger.audit('content_generated', { _userId,
        contentCount: generatedContent.length,
        platforms: body.platforms
      });

      return new Response(JSON.stringify({
        success: true,
        content: generatedContent,
        message: `Generated ${generatedContent.length} content items`
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      logger.error('Content generation failed', error as Error);
      return new Response(JSON.stringify({ error: 'Content generation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get user's content
   */
  static async getUserContent(
    request: Request,
    env: CloudflareEnv,
    dbService: DatabaseService
  ): Promise<Response> {
    try {
      // Extract user from JWT token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const validation = await JWTManager.verifyAccessToken(token);

      if (!validation.valid || !validation.claims) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const userId = validation.claims.sub;

      // Get query parameters
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const type = url.searchParams.get('type');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      // Fetch content from database
      const content = await dbService.getUserContent(userId, { _status,
        type,
        limit,
        offset
      });

      logger.info('Retrieved user content', { _userId,
        count: content.length
      });

      return new Response(JSON.stringify({
        success: true,
        content,
        pagination: { _limit,
          offset,
          total: content.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      logger.error('Failed to retrieve content', error as Error);
      return new Response(JSON.stringify({ error: 'Failed to retrieve content' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Update content status
   */
  static async updateContent(
    request: Request,
    env: CloudflareEnv,
    dbService: DatabaseService
  ): Promise<Response> {
    try {
      // Extract user from JWT token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const validation = await JWTManager.verifyAccessToken(token);

      if (!validation.valid || !validation.claims) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const userId = validation.claims.sub;
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const contentId = pathParts[pathParts.length - 1];

      const body = await request.json() as unknown;

      // Update content in database
      const updated = await dbService.updateContent(contentId, userId, {
        title: body.title,
        body: body.body,
        status: body.status,
        metadata: body.metadata ? JSON.stringify(body.metadata) : undefined
      });

      if (!updated) {
        return new Response(JSON.stringify({ error: 'Content not found or unauthorized' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      logger.audit('content_updated', { _userId,
        contentId,
        status: body.status
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Content updated successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      logger.error('Failed to update content', error as Error);
      return new Response(JSON.stringify({ error: 'Failed to update content' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Delete content
   */
  static async deleteContent(
    request: Request,
    env: CloudflareEnv,
    dbService: DatabaseService
  ): Promise<Response> {
    try {
      // Extract user from JWT token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const validation = await JWTManager.verifyAccessToken(token);

      if (!validation.valid || !validation.claims) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const userId = validation.claims.sub;
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const contentId = pathParts[pathParts.length - 1];

      // Delete content from database
      const deleted = await dbService.deleteContent(contentId, userId);

      if (!deleted) {
        return new Response(JSON.stringify({ error: 'Content not found or unauthorized' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      logger.audit('content_deleted', { _userId,
        contentId
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Content deleted successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      logger.error('Failed to delete content', error as Error);
      return new Response(JSON.stringify({ error: 'Failed to delete content' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}