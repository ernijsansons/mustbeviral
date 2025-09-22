// ML Controller
// Handles machine learning endpoints for recommendations and trending analysis

import { _RecommendationEngine, UserBehavior, ContentFeatures, RecommendationRequest } from '../lib/ml/recommendationEngine';
import { _TrendingDetector, EngagementMetrics } from '../lib/ml/trendingDetector';

export interface MLEnv {
  CONTENT_EMBEDDINGS?: unknown;
  TRENDS_CACHE?: unknown;
  AI?: unknown;
}

export class MLController {
  private recommendationEngine: RecommendationEngine;
  private trendingDetector: TrendingDetector;

  constructor(env: MLEnv) {
    this.recommendationEngine = new RecommendationEngine(
      env.CONTENT_EMBEDDINGS,
      env.TRENDS_CACHE,
      env
    );
    this.trendingDetector = new TrendingDetector(env.TRENDS_CACHE, env);
  }

  // Recommendation endpoints
  async getRecommendations(request: Request): Promise<Response> {
    try {
      const body = await request.json() as RecommendationRequest;

      // Validate request
      if (!body.userId) {
        return new Response(JSON.stringify({
          error: 'User ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const recommendations = await this.recommendationEngine.getRecommendations(body);

      return new Response(JSON.stringify({
        success: true,
        data: { _recommendations,
          userId: body.userId,
          count: recommendations.length,
          requestId: crypto.randomUUID()
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get recommendations');
    }
  }

  async getSimilarContent(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const contentId = url.searchParams.get('contentId');
      const limit = parseInt(url.searchParams.get('limit') || '5');

      if (!contentId) {
        return new Response(JSON.stringify({
          error: 'Content ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const similarContent = await this.recommendationEngine.getSimilarContent(
        contentId,
        limit
      );

      return new Response(JSON.stringify({
        success: true,
        data: { _similarContent,
          contentId,
          count: similarContent.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get similar content');
    }
  }

  async getPersonalizedTrending(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId');
      const limit = parseInt(url.searchParams.get('limit') || '10');

      if (!userId) {
        return new Response(JSON.stringify({
          error: 'User ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const personalizedTrending = await this.recommendationEngine.getPersonalizedTrending(
        userId,
        limit
      );

      return new Response(JSON.stringify({
        success: true,
        data: {
          trending: personalizedTrending,
          userId,
          count: personalizedTrending.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get personalized trending');
    }
  }

  async trackUserBehavior(request: Request): Promise<Response> {
    try {
      const body = await request.json() as UserBehavior;

      // Validate behavior data
      const validation = this.validateUserBehavior(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add timestamp if not provided
      if (!body.timestamp) {
        body.timestamp = Date.now();
      }

      await this.recommendationEngine.trackUserBehavior(body);

      return new Response(JSON.stringify({
        success: true,
        message: 'User behavior tracked successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to track user behavior');
    }
  }

  async addContent(request: Request): Promise<Response> {
    try {
      const body = await request.json() as ContentFeatures;

      // Validate content data
      const validation = this.validateContentFeatures(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.recommendationEngine.addContent(body);

      return new Response(JSON.stringify({
        success: true,
        message: 'Content added to recommendation engine',
        contentId: body.contentId
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to add content');
    }
  }

  // Trending detection endpoints
  async detectTrends(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const timeWindow = url.searchParams.get('timeWindow') as '1h' | '6h' | '24h' | '7d' || '24h';

      if (!['1h', '6h', '24h', '7d'].includes(timeWindow)) {
        return new Response(JSON.stringify({
          error: 'Invalid time window. Must be one of: 1h, 6h, 24h, 7d'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const trends = await this.trendingDetector.detectTrends(timeWindow);

      return new Response(JSON.stringify({
        success: true,
        data: { _trends,
          timeWindow,
          count: trends.length,
          detectedAt: new Date().toISOString()
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to detect trends');
    }
  }

  async predictViralContent(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const contentId = url.searchParams.get('contentId');

      if (!contentId) {
        return new Response(JSON.stringify({
          error: 'Content ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const viralPrediction = await this.trendingDetector.predictViralContent(contentId);

      return new Response(JSON.stringify({
        success: true,
        data: viralPrediction
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to predict viral content');
    }
  }

  async detectAnomalies(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const contentId = url.searchParams.get('contentId'); // Optional

      const anomalies = await this.trendingDetector.detectAnomalies(contentId || undefined);

      return new Response(JSON.stringify({
        success: true,
        data: { _anomalies,
          contentId,
          count: anomalies.length,
          detectedAt: new Date().toISOString()
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to detect anomalies');
    }
  }

  async addEngagementData(request: Request): Promise<Response> {
    try {
      const body = await request.json() as EngagementMetrics;

      // Validate engagement data
      const validation = this.validateEngagementMetrics(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add timestamp if not provided
      if (!body.timestamp) {
        body.timestamp = Date.now();
      }

      await this.trendingDetector.addEngagementData(body);

      return new Response(JSON.stringify({
        success: true,
        message: 'Engagement data added successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to add engagement data');
    }
  }

  async getTopicTrends(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const topic = url.searchParams.get('topic');
      const timeWindow = url.searchParams.get('timeWindow') as '1h' | '6h' | '24h' | '7d' || '24h';

      if (!topic) {
        return new Response(JSON.stringify({
          error: 'Topic is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const topicTrend = await this.trendingDetector.getTopicTrends(topic, timeWindow);

      return new Response(JSON.stringify({
        success: true,
        data: {
          trend: topicTrend,
          topic,
          timeWindow,
          found: !!topicTrend
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get topic trends');
    }
  }

  async getEmergingTopics(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '10');

      const emergingTopics = await this.trendingDetector.getEmergingTopics(limit);

      return new Response(JSON.stringify({
        success: true,
        data: { _emergingTopics,
          count: emergingTopics.length,
          detectedAt: new Date().toISOString()
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get emerging topics');
    }
  }

  async getTrendingKeywords(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const timeWindow = url.searchParams.get('timeWindow') as '1h' | '6h' | '24h' | '7d' || '24h';

      const trendingKeywords = await this.trendingDetector.getTrendingKeywords(timeWindow);

      return new Response(JSON.stringify({
        success: true,
        data: {
          keywords: trendingKeywords,
          timeWindow,
          count: trendingKeywords.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get trending keywords');
    }
  }

  // Batch operations
  async trackBehaviorBatch(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { behaviors: UserBehavior[] };

      if (!body.behaviors || !Array.isArray(body.behaviors)) {
        return new Response(JSON.stringify({
          error: 'Behaviors array is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.behaviors.length > 100) {
        return new Response(JSON.stringify({
          error: 'Maximum 100 behaviors allowed per batch'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const results = await Promise.allSettled(
        body.behaviors.map(behavior => this.recommendationEngine.trackUserBehavior(behavior))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      return new Response(JSON.stringify({
        success: true,
        data: {
          processed: results.length,
          successful,
          failed
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to process behavior batch');
    }
  }

  async addEngagementBatch(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { engagements: EngagementMetrics[] };

      if (!body.engagements || !Array.isArray(body.engagements)) {
        return new Response(JSON.stringify({
          error: 'Engagements array is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.engagements.length > 100) {
        return new Response(JSON.stringify({
          error: 'Maximum 100 engagements allowed per batch'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const results = await Promise.allSettled(
        body.engagements.map(engagement => this.trendingDetector.addEngagementData(engagement))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      return new Response(JSON.stringify({
        success: true,
        data: {
          processed: results.length,
          successful,
          failed
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to process engagement batch');
    }
  }

  // Validation methods
  private validateUserBehavior(behavior: UserBehavior): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!behavior.userId || typeof behavior.userId !== 'string') {
      errors.push('Valid user ID is required');
    }

    if (!behavior.contentId || typeof behavior.contentId !== 'string') {
      errors.push('Valid content ID is required');
    }

    if (!behavior.action || !['view', 'like', 'share', 'comment', 'save', 'click'].includes(behavior.action)) {
      errors.push('Valid action is required (view, like, share, comment, save, click)');
    }

    if (behavior.duration && (typeof behavior.duration !== 'number' || behavior.duration < 0)) {
      errors.push('Duration must be a non-negative number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateContentFeatures(content: ContentFeatures): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.contentId || typeof content.contentId !== 'string') {
      errors.push('Valid content ID is required');
    }

    if (!content.title || typeof content.title !== 'string') {
      errors.push('Valid title is required');
    }

    if (!content.type || !['article', 'video', 'social_post', 'image', 'podcast'].includes(content.type)) {
      errors.push('Valid content type is required');
    }

    if (!content.category || typeof content.category !== 'string') {
      errors.push('Valid category is required');
    }

    if (!content.authorId || typeof content.authorId !== 'string') {
      errors.push('Valid author ID is required');
    }

    if (!Array.isArray(content.tags)) {
      errors.push('Tags must be an array');
    }

    if (typeof content.publishedAt !== 'number' || content.publishedAt <= 0) {
      errors.push('Valid published timestamp is required');
    }

    if (typeof content.readingTime !== 'number' || content.readingTime < 0) {
      errors.push('Reading time must be a non-negative number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateEngagementMetrics(engagement: EngagementMetrics): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!engagement.contentId || typeof engagement.contentId !== 'string') {
      errors.push('Valid content ID is required');
    }

    if (!engagement.platform || typeof engagement.platform !== 'string') {
      errors.push('Valid platform is required');
    }

    const numericFields = ['views', 'likes', 'shares', 'comments', 'clickThroughRate', 'bounceRate', 'timeSpent'];
    for (const field of numericFields) {
      const value = engagement[field as keyof EngagementMetrics];
      if (typeof value !== 'number' || value < 0) {
        errors.push(`${field} must be a non-negative number`);
      }
    }

    if (engagement.clickThroughRate > 1 || engagement.bounceRate > 1) {
      errors.push('Click-through rate and bounce rate must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private handleError(error: unknown, defaultMessage: string): Response {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;

    console.error('ML Controller Error:', {
      message: errorMessage,
      error: error instanceof Error ? error.stack : error,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}