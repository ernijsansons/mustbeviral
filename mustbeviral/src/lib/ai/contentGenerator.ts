// AI Content Generator - Orchestrates modular content generation pipeline
import { AIModelSelector, ContentType, ContentLength } from './core/AIModelSelector';
import { PromptBuilder } from './core/PromptBuilder';
import { ContentEnhancer } from './enhancement/ContentEnhancer';

export interface ContentGenerationRequest {
  type: 'article' | 'social_post' | 'headline' | 'description' | 'script' | 'email';
  topic: string;
  tone: 'professional' | 'casual' | 'humorous' | 'urgent' | 'inspiring' | 'educational';
  audience: 'general' | 'professionals' | 'students' | 'seniors' | 'teenagers';
  keywords?: string[];
  length: 'short' | 'medium' | 'long';
  platform?: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'youtube';
  context?: string;
  style?: string;
}

export interface ContentGenerationResult {
  content: string;
  title?: string;
  description?: string;
  tags: string[];
  metadata: {
    wordCount: number;
    readingTime: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    model: string;
    tokensUsed: number;
  };
  suggestions: {
    improvements: string[];
    seoTips: string[];
    hashtags: string[];
  };
}

export interface AIModel {
  name: string;
  description: string;
  maxTokens: number;
  costPerToken: number;
  capabilities: string[];
}

interface AIService {
  run(model: string, input: Record<string, any>): Promise<any>;
}

export class ContentGenerator {
  private ai: AIService;
  private env: Record<string, any>;
  private modelSelector: AIModelSelector;
  private promptBuilder: PromptBuilder;
  private contentEnhancer: ContentEnhancer;

  constructor(ai: AIService, env: Record<string, any>) {
    this.ai = ai;
    this.env = env;
    this.modelSelector = new AIModelSelector();
    this.promptBuilder = new PromptBuilder();
    this.contentEnhancer = new ContentEnhancer(ai);
  }

  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    try {
      const prompt = this.promptBuilder.build(request);
      const model = this.modelSelector.selectModel(request.type);
      const maxTokens = this.modelSelector.getMaxTokens(request.length);

      let result: unknown;
      if (model.startsWith('@cf/')) {
        result = await this.ai.run(model, { prompt, max_tokens: maxTokens });
      } else {
        result = await this.callExternalAI(model, prompt, request);
      }

      const content = this.extractContent(result);
      return await this.contentEnhancer.enhance(content, request, model);
    } catch (error: unknown) {
      throw new Error(`Content generation failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async generateMultipleVariations(request: ContentGenerationRequest, count: number = 3): Promise<ContentGenerationResult[]> {
    const variations: ContentGenerationResult[] = [];

    // Generate multiple variations with different approaches
    const variationPromises = Array.from({ length: count }, async(_, index) => {
      const modifiedRequest = {
        ...request,
        context: `${request.context ?? ''} [Variation ${index + 1}: Focus on ${this.getVariationFocus(index)}]`
      };

      return this.generateContent(modifiedRequest);
    });

    const results = await Promise.allSettled(variationPromises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        variations.push(result.value);
      }
    }

    return variations;
  }

  async optimizeForPlatform(content: string, platform: string): Promise<string> {
    const optimizationPrompts = {
      twitter: 'Optimize this content for Twitter: keep it under 280 characters, use engaging language, add relevant hashtags',
      linkedin: 'Optimize this content for LinkedIn: professional tone, thought leadership, industry insights',
      facebook: 'Optimize this content for Facebook: engaging, conversational, community-focused',
      instagram: 'Optimize this content for Instagram: visual storytelling, lifestyle-focused, hashtag-friendly',
      tiktok: 'Optimize this content for TikTok: short, catchy, trend-aware, youth-oriented',
      youtube: 'Optimize this content for YouTube: engaging hook, structured content, call-to-action'
    };

    const prompt = `${optimizationPrompts[platform as keyof typeof optimizationPrompts]  ?? optimizationPrompts.facebook}

Original content:
${content}

Optimized content:`;

    const result = await this.ai.run('@cf/meta/llama-2-7b-chat-int8', {
      prompt,
      max_tokens: 500
    });

    return this.extractContent(result);
  }

  async generateSEOOptimizedContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    // Enhanced request with SEO focus
    const seoRequest = {
      ...request,
      context: `${request.context ?? ''} [SEO Focus: Include target keywords naturally, create engaging meta descriptions, optimize for search intent]`
    };

    const content = await this.generateContent(seoRequest);

    // Generate additional SEO elements
    const seoEnhancements = await this.generateSEOEnhancements(content.content, request.keywords ?? []);

    return {
      ...content,
      suggestions: {
        ...content.suggestions,
        seoTips: seoEnhancements.seoTips,
        improvements: [...content.suggestions.improvements, ...seoEnhancements.improvements]
      }
    };
  }

  async generateViralContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    // Enhanced request with viral elements
    const viralRequest = {
      ...request,
      context: `${request.context ?? ''} [Viral Content Strategy: Include emotional hooks, trending topics, shareable elements, controversy or surprise]`
    };

    const content = await this.generateContent(viralRequest);

    // Analyze viral potential
    const viralScore = await this.analyzeViralPotential(content.content);

    return {
      ...content,
      metadata: {
        ...content.metadata,
        viralScore,
        viralFactors: this.identifyViralFactors(content.content)
      } as any,
      suggestions: {
        ...content.suggestions,
        viralTips: await this.generateViralTips(content.content)
      } as any
    };
  }

  // Removed: buildPrompt, selectModel, getMaxTokens - moved to AIModelSelector and PromptBuilder

  private async callExternalAI(model: string, prompt: string, request: ContentGenerationRequest): Promise<unknown> {
    // Placeholder for external AI service calls (OpenAI, Anthropic, etc.)
    // This would require API keys and specific implementations
    throw new Error('External AI services not implemented yet');
  }

  private extractContent(result: unknown): string {
    if (typeof result === 'string') {
      return result.trim();
    }

    if (typeof result === 'object' && result !== null) {
      if ('response' in result && typeof result.response === 'string') {
        return result.response.trim();
      }
      if ('content' in result && typeof result.content === 'string') {
        return result.content.trim();
      }
      if ('text' in result && typeof result.text === 'string') {
        return result.text.trim();
      }
    }

    return String(result).trim();
  }

  private async enhanceContent(content: string, request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    // Calculate metadata
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(content);

    // Extract tags
    const tags = await this.extractTags(content, request.keywords);

    // Generate suggestions
    const suggestions = await this.generateSuggestions(content, request);

    return {
      content,
      tags,
      metadata: {
        wordCount,
        readingTime,
        sentiment: sentiment.label,
        confidence: sentiment.confidence,
        model: this.selectModel(request),
        tokensUsed: Math.ceil(wordCount * 1.3) // Rough estimate
      },
      suggestions
    };
  }

  private async analyzeSentiment(content: string): Promise<{ label: 'positive' | 'neutral' | 'negative'; confidence: number }> {
    try {
      const result = await this.ai.run('@cf/huggingface/distilbert-sst-2-int8', {
        text: content
      });

      if (result?.[0]) {
        const sentiment = result[0];
        return {
          label: sentiment.label.toLowerCase() as 'positive' | 'neutral' | 'negative',
          confidence: sentiment.score
        };
      }
    } catch(error: unknown) {
      // Fallback to simple sentiment analysis
    }

    return { label: 'neutral', confidence: 0.5 };
  }

  private async extractTags(content: string, keywords?: string[]): Promise<string[]> {
    const tags: Set<string> = new Set();

    // Add provided keywords
    if (keywords) {
      keywords.forEach(keyword => tags.add(keyword.toLowerCase()));
    }

    // Simple keyword extraction (in production, use more sophisticated NLP)
    const words = content.toLowerCase().match(/\b\w{4,}\b/g)  ?? [];
    const wordFreq = new Map<string, number>();

    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word)  ?? 0) + 1);
    });

    // Get most frequent words as tags
    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    sortedWords.forEach(word => tags.add(word));

    return Array.from(tags).slice(0, 15);
  }

  private async generateSuggestions(content: string, request: ContentGenerationRequest): Promise<{
    improvements: string[];
    seoTips: string[];
    hashtags: string[];
  }> {
    const improvements: string[] = [];
    const seoTips: string[] = [];
    const hashtags: string[] = [];

    // Basic content analysis and suggestions
    if (content.length < 100) {
      improvements.push('Consider expanding the content for better engagement');
    }

    if (!content.includes('?')) {
      improvements.push('Add questions to increase engagement');
    }

    if (request.keywords && request.keywords.length > 0) {
      const keywordDensity = this.calculateKeywordDensity(content, request.keywords);
      if (keywordDensity < 0.01) {
        seoTips.push('Increase keyword density for better SEO');
      }
    }

    // Generate hashtags
    const tags = await this.extractTags(content, request.keywords);
    hashtags.push(...tags.slice(0, 5).map(tag => `#${tag.replace(/s+/g, '')}`));

    return { improvements, seoTips, hashtags };
  }

  private calculateKeywordDensity(content: string, keywords: string[]): number {
    const words = content.toLowerCase().split(/\s+/);
    const keywordCount = keywords.reduce((count, keyword) => {
      return count + (content.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g'))  ?? []).length;
    }, 0);

    return keywordCount / words.length;
  }

  private async generateSEOEnhancements(content: string, keywords: string[]): Promise<{
    seoTips: string[];
    improvements: string[];
  }> {
    const seoTips: string[] = [];
    const improvements: string[] = [];

    // Analyze content structure
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = content.length / sentences.length;

    if (avgSentenceLength > 25) {
      seoTips.push('Consider shorter sentences for better readability');
    }

    if (keywords.length > 0) {
      const keywordDensity = this.calculateKeywordDensity(content, keywords);
      if (keywordDensity < 0.005) {
        seoTips.push('Increase keyword usage naturally throughout the content');
      } else if (keywordDensity > 0.03) {
        seoTips.push('Reduce keyword density to avoid over-optimization');
      }
    }

    return { seoTips, improvements };
  }

  private async analyzeViralPotential(content: string): Promise<number> {
    let score = 0;

    // Emotional words
    const emotionalWords = ['amazing', 'incredible', 'shocking', 'unbelievable', 'exclusive', 'secret'];
    const emotionalCount = emotionalWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;
    score += emotionalCount * 10;

    // Questions and engagement
    const questionCount = (content.match(/\?/g)  ?? []).length;
    score += questionCount * 5;

    // Call to action
    const ctaWords = ['share', 'comment', 'like', 'subscribe', 'follow'];
    const ctaCount = ctaWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;
    score += ctaCount * 8;

    // Length optimization
    if (content.length >= 100 && content.length <= 500) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private identifyViralFactors(content: string): string[] {
    const factors: string[] = [];

    if (content.toLowerCase().includes('exclusive')  ?? content.toLowerCase().includes('secret')) {
      factors.push('Exclusivity');
    }

    if ((content.match(/\?/g)  ?? []).length > 0) {
      factors.push('Engaging Questions');
    }

    if (content.toLowerCase().includes('you')  ?? content.toLowerCase().includes('your')) {
      factors.push('Personal Connection');
    }

    const urgentWords = ['now', 'today', 'urgent', 'limited time'];
    if (urgentWords.some(word => content.toLowerCase().includes(word))) {
      factors.push('Urgency');
    }

    return factors;
  }

  private async generateViralTips(content: string): Promise<string[]> {
    const tips: string[] = [];

    if (!content.includes('?')) {
      tips.push('Add engaging questions to encourage interaction');
    }

    if (!content.toLowerCase().includes('share')) {
      tips.push('Include a clear call-to-action to share');
    }

    if (content.length > 500) {
      tips.push('Consider shortening for better social media performance');
    }

    return tips;
  }

  private getVariationFocus(index: number): string {
    const focuses = [
      'emotional appeal',
      'practical benefits',
      'storytelling approach',
      'data and statistics',
      'controversy and debate'
    ];

    return focuses[index % focuses.length];
  }

  // Batch processing for multiple content pieces
  async generateBatch(requests: ContentGenerationRequest[]): Promise<ContentGenerationResult[]> {
    const batchSize = 5; // Process in batches to avoid rate limits
    const results: ContentGenerationResult[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.generateContent(request));

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}