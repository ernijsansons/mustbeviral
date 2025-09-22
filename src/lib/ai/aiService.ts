// AI Service Manager
// Coordinates all AI functionality and provides unified interface

import { _ContentGenerator, ContentGenerationRequest, ContentGenerationResult } from './contentGenerator';
import { _ContentAnalyzer, ContentAnalysisRequest, ContentAnalysisResult } from './contentAnalyzer';

export interface AICapabilities {
  contentGeneration: boolean;
  contentAnalysis: boolean;
  sentimentAnalysis: boolean;
  seoOptimization: boolean;
  viralPrediction: boolean;
  plagiarismDetection: boolean;
  languageTranslation: boolean;
  imageGeneration: boolean;
}

export interface AIUsageMetrics {
  tokensUsed: number;
  requestCount: number;
  costCents: number;
  modelsUsed: string[];
  averageResponseTime: number;
}

export interface AIServiceConfig {
  maxTokensPerRequest: number;
  maxRequestsPerMinute: number;
  enableCaching: boolean;
  defaultModel: string;
  fallbackModel: string;
  enableLogging: boolean;
}

export class AIService {
  private contentGenerator: ContentGenerator;
  private contentAnalyzer: ContentAnalyzer;
  private config: AIServiceConfig;
  private usage: AIUsageMetrics;
  private cache: Map<string, unknown> = new Map();

  constructor(
    private ai: unknown,
    private env: unknown,
    private vectorize?: unknown,
    config?: Partial<AIServiceConfig>
  ) {
    this.config = {
      maxTokensPerRequest: 2000,
      maxRequestsPerMinute: 60,
      enableCaching: true,
      defaultModel: '@cf/meta/llama-2-7b-chat-int8',
      fallbackModel: '@cf/microsoft/phi-2',
      enableLogging: true,
      ...config
    };

    this.usage = {
      tokensUsed: 0,
      requestCount: 0,
      costCents: 0,
      modelsUsed: [],
      averageResponseTime: 0
    };

    this.contentGenerator = new ContentGenerator(ai, env);
    this.contentAnalyzer = new ContentAnalyzer(ai, env, vectorize);
  }

  // Content Generation Methods
  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.createCacheKey('generate', request);
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Rate limiting check
      await this.checkRateLimit();

      // Generate content
      const result = await this.contentGenerator.generateContent(request);

      // Update usage metrics
      this.updateUsageMetrics(startTime, result.metadata.tokensUsed, result.metadata.model);

      // Cache result
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, result);
      }

      return result;

    } catch (error: unknown) {
      this.handleError('Content generation failed', error);
      throw error;
    }
  }

  async generateMultipleVariations(
    request: ContentGenerationRequest,
    count: number = 3
  ): Promise<ContentGenerationResult[]> {
    return this.contentGenerator.generateMultipleVariations(request, count);
  }

  async optimizeForPlatform(content: string, platform: string): Promise<string> {
    return this.contentGenerator.optimizeForPlatform(content, platform);
  }

  async generateSEOOptimizedContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    return this.contentGenerator.generateSEOOptimizedContent(request);
  }

  async generateViralContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    return this.contentGenerator.generateViralContent(request);
  }

  // Content Analysis Methods
  async analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.createCacheKey('analyze', request);
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Analyze content
      const result = await this.contentAnalyzer.analyzeContent(request);

      // Update usage metrics
      this.updateUsageMetrics(startTime, 100, 'content-analyzer'); // Estimate tokens

      // Cache result
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, result);
      }

      return result;

    } catch (error: unknown) {
      this.handleError('Content analysis failed', error);
      throw error;
    }
  }

  async analyzeForPlatform(content: string, platform: string) {
    return this.contentAnalyzer.analyzeForPlatform(content, platform);
  }

  async findSimilarContent(content: string, threshold: number = 0.8) {
    return this.contentAnalyzer.findSimilarContent(content, threshold);
  }

  // Combined AI Operations
  async improveContent(content: string, targetAudience?: string): Promise<{
    originalContent: string;
    improvedContent: string;
    improvements: string[];
    analysis: ContentAnalysisResult;
  }> {
    // First analyze the existing content
    const analysis = await this.analyzeContent({ _content,
      type: 'article',
      targetAudience
    });

    // Generate improved version based on analysis
    const improvementRequest: ContentGenerationRequest = {
      type: 'article',
      topic: content.substring(0, 100), // Use first part as topic
      tone: analysis.scores.sentiment.label === 'positive' ? 'inspiring' : 'professional',
      audience: (targetAudience as unknown) || 'general',
      length: content.length > 500 ? 'long' : 'medium',
      context: `Improve this content based on analysis. Current scores - Overall: ${analysis.scores.overall}, SEO: ${analysis.scores.seo}, Engagement: ${analysis.scores.engagement}.

Original content: ${content}

Focus on: ${analysis.suggestions.improvements.join(', ')}`
    };

    const improved = await this.generateContent(improvementRequest);

    return {
      originalContent: content,
      improvedContent: improved.content,
      improvements: analysis.suggestions.improvements,
      analysis
    };
  }

  async generateContentIdeas(topic: string, count: number = 5): Promise<{
    ideas: Array<{
      title: string;
      description: string;
      contentType: string;
      estimatedEngagement: number;
      keywords: string[];
    }>;
  }> {
    const request: ContentGenerationRequest = {
      type: 'article',
      topic: `Generate ${count} creative content ideas about ${topic}`,
      tone: 'inspiring',
      audience: 'general',
      length: 'medium',
      context: 'Generate diverse content ideas with titles, descriptions, and suggested content types'
    };

    const result = await this.generateContent(request);

    // Parse the generated ideas (in production, use structured output)
    const ideas = this.parseContentIdeas(result.content, count);

    return { ideas };
  }

  async createContentStrategy(
    businessGoals: string[],
    targetAudience: string,
    platforms: string[]
  ): Promise<{
    strategy: string;
    contentCalendar: Array<{
      date: string;
      contentType: string;
      topic: string;
      platform: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    kpis: string[];
  }> {
    const request: ContentGenerationRequest = {
      type: 'article',
      topic: 'Content Strategy Development',
      tone: 'professional',
      audience: 'professionals',
      length: 'long',
      context: `Create a comprehensive content strategy for:
        Business Goals: ${businessGoals.join(', ')}
        Target Audience: ${targetAudience}
        Platforms: ${platforms.join(', ')}

        Include strategy overview, content calendar suggestions, and KPIs.`
    };

    const result = await this.generateContent(request);

    // Parse strategy components
    const strategy = result.content;
    const contentCalendar = this.parseContentCalendar(result.content);
    const kpis = this.extractKPIs(result.content);

    return { _strategy, contentCalendar, kpis };
  }

  // Batch Processing
  async processBatch(requests: Array<{
    type: 'generate' | 'analyze';
    data: ContentGenerationRequest | ContentAnalysisRequest;
  }>): Promise<Array<ContentGenerationResult | ContentAnalysisResult>> {
    const results: unknown[] = [];
    const batchSize = 5;

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(async (_req) => {
        if (req.type === 'generate') {
          return this.generateContent(req.data as ContentGenerationRequest);
        } else {
          return this.analyzeContent(req.data as ContentAnalysisRequest);
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ error: result.reason });
        }
      }

      // Rate limiting delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Utility Methods
  getCapabilities(): AICapabilities {
    return {
      contentGeneration: true,
      contentAnalysis: true,
      sentimentAnalysis: true,
      seoOptimization: true,
      viralPrediction: true,
      plagiarismDetection: !!this.vectorize,
      languageTranslation: true,
      imageGeneration: false // Would require additional setup
    };
  }

  getUsageMetrics(): AIUsageMetrics {
    return { ...this.usage };
  }

  clearCache(): void {
    this.cache.clear();
  }

  resetUsageMetrics(): void {
    this.usage = {
      tokensUsed: 0,
      requestCount: 0,
      costCents: 0,
      modelsUsed: [],
      averageResponseTime: 0
    };
  }

  // Private Methods
  private createCacheKey(operation: string, data: unknown): string {
    const hash = this.simpleHash(JSON.stringify(data));
    return `${operation}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private async checkRateLimit(): Promise<void> {
    // Simple rate limiting implementation
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // In production, use more sophisticated rate limiting with persistent storage
    if (this.usage.requestCount > this.config.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded');
    }
  }

  private updateUsageMetrics(startTime: number, tokensUsed: number, model: string): void {
    const responseTime = Date.now() - startTime;

    this.usage.tokensUsed += tokensUsed;
    this.usage.requestCount += 1;
    this.usage.costCents += this.calculateCost(tokensUsed, model);

    if (!this.usage.modelsUsed.includes(model)) {
      this.usage.modelsUsed.push(model);
    }

    // Update average response time
    this.usage.averageResponseTime = (
      (this.usage.averageResponseTime * (this.usage.requestCount - 1) + responseTime) /
      this.usage.requestCount
    );
  }

  private calculateCost(tokensUsed: number, model: string): number {
    // Cloudflare AI pricing (example rates)
    const pricing = {
      '@cf/meta/llama-2-7b-chat-int8': 0.001, // per 1000 tokens
      '@cf/mistral/mistral-7b-instruct-v0.1': 0.002,
      '@cf/microsoft/phi-2': 0.0005,
      'default': 0.001
    };

    const rate = pricing[model as keyof typeof pricing] || pricing.default;
    return (tokensUsed / 1000) * rate * 100; // Convert to cents
  }

  private handleError(message: string, error: unknown): void {
    if (this.config.enableLogging) {
      console.error(`AI Service Error: ${message}`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }

  private parseContentIdeas(content: string, count: number): Array<{
    title: string;
    description: string;
    contentType: string;
    estimatedEngagement: number;
    keywords: string[];
  }> {
    // Simple parsing - in production, use structured AI output
    const ideas = [];
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    for (let i = 0; i < Math.min(count, lines.length); i++) {
      const line = lines[i];
      ideas.push({
        title: line.replace(/^\d+\.\s*/, '').split(':')[0] || `Idea ${i + 1}`,
        description: line.split(':')[1]?.trim() || 'Content idea description',
        contentType: 'article',
        estimatedEngagement: Math.floor(Math.random() * 40) + 60, // 60-100%
        keywords: this.extractKeywords(line)
      });
    }

    return ideas;
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    return [...new Set(words)].slice(0, 5);
  }

  private parseContentCalendar(content: string): Array<{
    date: string;
    contentType: string;
    topic: string;
    platform: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    // Simplified parsing - in production, use structured output
    const calendar = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      calendar.push({
        date: date.toISOString().split('T')[0],
        contentType: ['article', 'social_post', 'video'][i % 3],
        topic: `Content topic ${i + 1}`,
        platform: ['linkedin', 'twitter', 'instagram'][i % 3],
        priority: (['high', 'medium', 'low'] as const)[i % 3]
      });
    }

    return calendar;
  }

  private extractKPIs(content: string): string[] {
    const defaultKPIs = [
      'Content engagement rate',
      'Social media reach',
      'Website traffic from content',
      'Lead generation',
      'Brand awareness metrics',
      'Content conversion rate'
    ];

    // In production, extract KPIs from the generated strategy
    return defaultKPIs;
  }
}