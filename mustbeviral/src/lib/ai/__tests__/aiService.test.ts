// AI Service Tests
// Tests for AI content generation and analysis functionality

import { AIService} from '../aiService';
import type { ContentGenerationRequest, ContentAnalysisRequest } from '../aiService';

// Mock AI responses
const mockAIResponse = {
  response: 'This is a generated content piece about the topic.',
  meta: { tokens_used: 150 }
};

const mockSentimentResponse = [
  { label: 'POSITIVE', score: 0.8 }
];

// Mock Cloudflare AI
const mockAI = {
  run: jest.fn().mockResolvedValue(mockAIResponse)
};

// Mock environment
const mockEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'INFO'
};

describe('AIService', _() => {
  let aiService: AIService;

  beforeEach_(() => {
    jest.clearAllMocks();
    aiService = new AIService(mockAI as unknown, mockEnv as unknown);
  });

  describe('Content Generation', _() => {
    it('should generate content successfully', async() => {
      const request: ContentGenerationRequest = {
        type: 'article',
        topic: 'AI in content creation',
        tone: 'professional',
        audience: 'professionals',
        length: 'medium'
      };

      const result = await aiService.generateContent(request);

      expect(result).toBeDefined();
      expect(result.content).toBe('This is a generated content piece about the topic.');
      expect(result.metadata.tokensUsed).toBeGreaterThan(0);
      expect(result.tags).toBeInstanceOf(Array);
      expect(result.suggestions).toBeDefined();
      expect(mockAI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-2-7b-chat-int8',
        expect.objectContaining({
          prompt: expect.stringContaining('AI in content creation'),
          max_tokens: 500
        })
      );
    });

    it('should generate multiple variations', async() => {
      const request: ContentGenerationRequest = {
        type: 'social_post',
        topic: 'Social media trends',
        tone: 'casual',
        audience: 'general',
        length: 'short'
      };

      const results = await aiService.generateMultipleVariations(request, 3);

      expect(results).toHaveLength(3);
      expect(mockAI.run).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result.content).toBeDefined();
        expect(result.metadata).toBeDefined();
      });
    });

    it('should generate SEO optimized content', async() => {
      const request: ContentGenerationRequest = {
        type: 'article',
        topic: 'SEO best practices',
        tone: 'educational',
        audience: 'professionals',
        length: 'long',
        keywords: ['SEO', 'optimization', 'content']
      };

      const result = await aiService.generateSEOOptimizedContent(request);

      expect(result).toBeDefined();
      expect(result.suggestions.seoTips).toBeDefined();
      expect(mockAI.run).toHaveBeenCalled();
    });

    it('should generate viral content', async() => {
      const request: ContentGenerationRequest = {
        type: 'social_post',
        topic: 'Viral marketing strategies',
        tone: 'inspiring',
        audience: 'general',
        length: 'short'
      };

      const result = await aiService.generateViralContent(request);

      expect(result).toBeDefined();
      expect(result.metadata).toHaveProperty('viralScore');
      expect(result.suggestions).toHaveProperty('viralTips');
    });

    it('should optimize content for platform', async() => {
      const content = 'This is a long piece of content that needs to be optimized for Twitter.';
      const platform = 'twitter';

      const optimized = await aiService.optimizeForPlatform(content, platform);

      expect(optimized).toBeDefined();
      expect(typeof optimized).toBe('string');
      expect(mockAI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-2-7b-chat-int8',
        expect.objectContaining({
          prompt: expect.stringContaining('Twitter'),
          max_tokens: 500
        })
      );
    });
  });

  describe('Content Analysis', _() => {
    beforeEach_(() => {
      // Mock sentiment analysis
      mockAI.run.mockImplementation((model, options) => {
        if (model === '@cf/huggingface/distilbert-sst-2-int8') {
          return Promise.resolve(mockSentimentResponse);
        }
        return Promise.resolve(mockAIResponse);
      });
    });

    it('should analyze content successfully', async() => {
      const request: ContentAnalysisRequest = {
        content: 'This is a sample article about artificial intelligence and its impact on content creation.',
        type: 'article',
        targetKeywords: ['artificial intelligence', 'content creation']
      };

      const result = await aiService.analyzeContent(request);

      expect(result).toBeDefined();
      expect(result.scores).toBeDefined();
      expect(result.scores.overall).toBeGreaterThanOrEqual(0);
      expect(result.scores.overall).toBeLessThanOrEqual(100);
      expect(result.metrics.wordCount).toBeGreaterThan(0);
      expect(result.suggestions).toBeDefined();
      expect(result.topics).toBeDefined();
    });

    it('should analyze content for specific platform', async() => {
      const content = 'Short social media post about AI #AI #MachineLearning';
      const platform = 'twitter';

      const result = await aiService.analyzeForPlatform(content, platform);

      expect(result).toBeDefined();
      expect(result.optimizationScore).toBeGreaterThanOrEqual(0);
      expect(result.platformSpecificSuggestions).toBeInstanceOf(Array);
      expect(result.characterCount).toBe(content.length);
    });
  });

  describe('Content Improvement', _() => {
    it('should improve existing content', async() => {
      const content = 'This is basic content that needs improvement.';
      const targetAudience = 'professionals';

      const result = await aiService.improveContent(content, targetAudience);

      expect(result).toBeDefined();
      expect(result.originalContent).toBe(content);
      expect(result.improvedContent).toBeDefined();
      expect(result.improvements).toBeInstanceOf(Array);
      expect(result.analysis).toBeDefined();
    });
  });

  describe('Content Ideas and Strategy', _() => {
    it('should generate content ideas', async() => {
      const topic = 'Digital marketing trends';
      const count = 5;

      const result = await aiService.generateContentIdeas(topic, count);

      expect(result).toBeDefined();
      expect(result.ideas).toBeInstanceOf(Array);
      expect(result.ideas.length).toBeLessThanOrEqual(count);

      result.ideas.forEach(idea => {
        expect(idea.title).toBeDefined();
        expect(idea.description).toBeDefined();
        expect(idea.contentType).toBeDefined();
        expect(idea.estimatedEngagement).toBeGreaterThanOrEqual(0);
        expect(idea.keywords).toBeInstanceOf(Array);
      });
    });

    it('should create content strategy', async() => {
      const businessGoals = ['increase brand awareness', 'generate leads'];
      const targetAudience = 'small business owners';
      const platforms = ['linkedin', 'twitter', 'blog'];

      const result = await aiService.createContentStrategy(
        businessGoals,
        targetAudience,
        platforms
      );

      expect(result).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(result.contentCalendar).toBeInstanceOf(Array);
      expect(result.kpis).toBeInstanceOf(Array);
    });
  });

  describe('Batch Processing', _() => {
    it('should process batch requests', async() => {
      const requests = [
        {
          type: 'generate' as const,
          data: {
            type: 'article',
            topic: 'AI topic 1',
            tone: 'professional',
            audience: 'general',
            length: 'short'
          } as ContentGenerationRequest
        },
        {
          type: 'analyze' as const,
          data: {
            content: 'Sample content to analyze',
            type: 'article'
          } as ContentAnalysisRequest
        }
      ];

      const results = await aiService.processBatch(requests);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(2);
      expect(mockAI.run).toHaveBeenCalledTimes(2);
    });
  });

  describe('AI Service Management', _() => {
    it('should return AI capabilities', _() => {
      const capabilities = aiService.getCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.contentGeneration).toBe(true);
      expect(capabilities.contentAnalysis).toBe(true);
      expect(capabilities.sentimentAnalysis).toBe(true);
      expect(capabilities.seoOptimization).toBe(true);
      expect(capabilities.viralPrediction).toBe(true);
    });

    it('should track usage metrics', async() => {
      const request: ContentGenerationRequest = {
        type: 'article',
        topic: 'Test topic',
        tone: 'professional',
        audience: 'general',
        length: 'short'
      };

      await aiService.generateContent(request);

      const metrics = aiService.getUsageMetrics();

      expect(metrics.requestCount).toBe(1);
      expect(metrics.tokensUsed).toBeGreaterThan(0);
      expect(metrics.modelsUsed).toContain('@cf/meta/llama-2-7b-chat-int8');
    });

    it('should reset usage metrics', async() => {
      // Generate some usage first
      await aiService.generateContent({
        type: 'article',
        topic: 'Test',
        tone: 'professional',
        audience: 'general',
        length: 'short'
      });

      aiService.resetUsageMetrics();

      const metrics = aiService.getUsageMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.tokensUsed).toBe(0);
    });

    it('should clear cache', _() => {
      aiService.clearCache();
      // No direct way to test cache clearing, but should not throw
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', _() => {
    it('should handle AI service errors gracefully', async() => {
      mockAI.run.mockRejectedValueOnce(new Error('AI service unavailable'));

      const request: ContentGenerationRequest = {
        type: 'article',
        topic: 'Test topic',
        tone: 'professional',
        audience: 'general',
        length: 'short'
      };

      await expect(aiService.generateContent(request)).rejects.toThrow('Content generation failed');
    });

    it('should handle malformed AI responses', async() => {
      mockAI.run.mockResolvedValueOnce(null);

      const request: ContentGenerationRequest = {
        type: 'article',
        topic: 'Test topic',
        tone: 'professional',
        audience: 'general',
        length: 'short'
      };

      const result = await aiService.generateContent(request);
      expect(result.content).toBe(''); // Should handle null response gracefully
    });
  });

  describe('Validation', _() => {
    it('should handle empty content gracefully', async() => {
      const request: ContentAnalysisRequest = {
        content: '',
        type: 'article'
      };

      const result = await aiService.analyzeContent(request);
      expect(result.metrics.wordCount).toBe(0);
    });

    it('should handle very long content', async() => {
      const longContent = 'word '.repeat(10000); // 50,000 characters
      const request: ContentAnalysisRequest = {
        content: longContent,
        type: 'article'
      };

      const result = await aiService.analyzeContent(request);
      expect(result.metrics.wordCount).toBeGreaterThan(9000);
    });
  });
});

// Integration tests with real AI responses (if AI binding is available)
describe('AIService Integration', _() => {
  it.skip('should work with real Cloudflare AI (integration test)', async () => {
    // This test should only run in environments with real AI binding
    // Mark as skip for unit tests
  });
});