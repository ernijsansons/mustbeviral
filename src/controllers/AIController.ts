// AI Controller
// Handles AI-powered content generation and analysis endpoints

import { _AIService, ContentGenerationRequest, ContentAnalysisRequest } from '../lib/ai/aiService';

export interface Env {
  AI: unknown;
  CONTENT_EMBEDDINGS?: unknown;
  // Other environment bindings...
}

export class AIController {
  private aiService: AIService;

  constructor(env: Env) {
    this.aiService = new AIService(env.AI, env, env.CONTENT_EMBEDDINGS);
  }

  async generateContent(request: Request): Promise<Response> {
    try {
      const body = await request.json() as ContentGenerationRequest;

      // Validate request
      const validation = this.validateGenerationRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.aiService.generateContent(body);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Content generation failed');
    }
  }

  async generateMultipleVariations(request: Request): Promise<Response> {
    try {
      const body = await request.json() as ContentGenerationRequest & { count?: number };
      const count = body.count || 3;

      const validation = this.validateGenerationRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const results = await this.aiService.generateMultipleVariations(body, count);

      return new Response(JSON.stringify({
        success: true,
        data: {
          variations: results,
          count: results.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Multiple variations generation failed');
    }
  }

  async analyzeContent(request: Request): Promise<Response> {
    try {
      const body = await request.json() as ContentAnalysisRequest;

      // Validate request
      const validation = this.validateAnalysisRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.aiService.analyzeContent(body);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Content analysis failed');
    }
  }

  async optimizeForPlatform(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        content: string;
        platform: string;
      };

      if (!body.content || !body.platform) {
        return new Response(JSON.stringify({
          error: 'Content and platform are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const optimizedContent = await this.aiService.optimizeForPlatform(
        body.content,
        body.platform
      );

      const analysis = await this.aiService.analyzeForPlatform(
        optimizedContent,
        body.platform
      );

      return new Response(JSON.stringify({
        success: true,
        data: {
          originalContent: body.content,
          optimizedContent,
          analysis
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Platform optimization failed');
    }
  }

  async improveContent(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        content: string;
        targetAudience?: string;
      };

      if (!body.content) {
        return new Response(JSON.stringify({
          error: 'Content is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.aiService.improveContent(
        body.content,
        body.targetAudience
      );

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Content improvement failed');
    }
  }

  async generateSEOContent(request: Request): Promise<Response> {
    try {
      const body = await request.json() as ContentGenerationRequest;

      const validation = this.validateGenerationRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.aiService.generateSEOOptimizedContent(body);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'SEO content generation failed');
    }
  }

  async generateViralContent(request: Request): Promise<Response> {
    try {
      const body = await request.json() as ContentGenerationRequest;

      const validation = this.validateGenerationRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.aiService.generateViralContent(body);

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Viral content generation failed');
    }
  }

  async generateContentIdeas(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        topic: string;
        count?: number;
      };

      if (!body.topic) {
        return new Response(JSON.stringify({
          error: 'Topic is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.aiService.generateContentIdeas(
        body.topic,
        body.count || 5
      );

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Content ideas generation failed');
    }
  }

  async createContentStrategy(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        businessGoals: string[];
        targetAudience: string;
        platforms: string[];
      };

      if (!body.businessGoals || !body.targetAudience || !body.platforms) {
        return new Response(JSON.stringify({
          error: 'Business goals, target audience, and platforms are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.aiService.createContentStrategy(
        body.businessGoals,
        body.targetAudience,
        body.platforms
      );

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Content strategy creation failed');
    }
  }

  async checkPlagiarism(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        content: string;
        threshold?: number;
      };

      if (!body.content) {
        return new Response(JSON.stringify({
          error: 'Content is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await this.aiService.findSimilarContent(
        body.content,
        body.threshold || 0.8
      );

      return new Response(JSON.stringify({
        success: true,
        data: {
          isOriginal: !result.isDuplicate,
          similarityThreshold: body.threshold || 0.8,
          similarContent: result.similarContent,
          isDuplicate: result.isDuplicate
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Plagiarism check failed');
    }
  }

  async processBatch(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        requests: Array<{
          type: 'generate' | 'analyze';
          data: ContentGenerationRequest | ContentAnalysisRequest;
        }>;
      };

      if (!body.requests || !Array.isArray(body.requests)) {
        return new Response(JSON.stringify({
          error: 'Requests array is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (body.requests.length > 50) {
        return new Response(JSON.stringify({
          error: 'Maximum 50 requests allowed per batch'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const results = await this.aiService.processBatch(body.requests);

      return new Response(JSON.stringify({
        success: true,
        data: { _results,
          processedCount: results.length,
          requestedCount: body.requests.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Batch processing failed');
    }
  }

  async getAICapabilities(request: Request): Promise<Response> {
    try {
      const capabilities = this.aiService.getCapabilities();
      const usage = this.aiService.getUsageMetrics();

      return new Response(JSON.stringify({
        success: true,
        data: { _capabilities,
          usage,
          timestamp: new Date().toISOString()
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get AI capabilities');
    }
  }

  async resetUsageMetrics(request: Request): Promise<Response> {
    try {
      this.aiService.resetUsageMetrics();

      return new Response(JSON.stringify({
        success: true,
        message: 'Usage metrics reset successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to reset usage metrics');
    }
  }

  async clearCache(request: Request): Promise<Response> {
    try {
      this.aiService.clearCache();

      return new Response(JSON.stringify({
        success: true,
        message: 'Cache cleared successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to clear cache');
    }
  }

  // Validation Methods
  private validateGenerationRequest(request: ContentGenerationRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.type) {
      errors.push('Content type is required');
    } else if (!['article', 'social_post', 'headline', 'description', 'script', 'email'].includes(request.type)) {
      errors.push('Invalid content type');
    }

    if (!request.topic || request.topic.trim().length === 0) {
      errors.push('Topic is required');
    } else if (request.topic.length > 500) {
      errors.push('Topic must be less than 500 characters');
    }

    if (!request.tone) {
      errors.push('Tone is required');
    } else if (!['professional', 'casual', 'humorous', 'urgent', 'inspiring', 'educational'].includes(request.tone)) {
      errors.push('Invalid tone');
    }

    if (!request.audience) {
      errors.push('Audience is required');
    } else if (!['general', 'professionals', 'students', 'seniors', 'teenagers'].includes(request.audience)) {
      errors.push('Invalid audience');
    }

    if (!request.length) {
      errors.push('Length is required');
    } else if (!['short', 'medium', 'long'].includes(request.length)) {
      errors.push('Invalid length');
    }

    if (request.keywords && request.keywords.length > 20) {
      errors.push('Maximum 20 keywords allowed');
    }

    if (request.context && request.context.length > 2000) {
      errors.push('Context must be less than 2000 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateAnalysisRequest(request: ContentAnalysisRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.content || request.content.trim().length === 0) {
      errors.push('Content is required');
    } else if (request.content.length > 50000) {
      errors.push('Content must be less than 50,000 characters');
    }

    if (!request.type) {
      errors.push('Content type is required');
    } else if (!['article', 'social_post', 'headline', 'description'].includes(request.type)) {
      errors.push('Invalid content type');
    }

    if (request.targetKeywords && request.targetKeywords.length > 50) {
      errors.push('Maximum 50 target keywords allowed');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private handleError(error: unknown, defaultMessage: string): Response {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;

    console.error('AI Controller Error:', {
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