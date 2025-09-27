// Content Enhancement and Suggestion Engine
import { ContentGenerationRequest, ContentGenerationResult } from '../contentGenerator';
import { ContentAnalyzer } from '../analysis/ContentAnalyzer';
import { ViralOptimizer } from '../optimization/ViralOptimizer';

export class ContentEnhancer {
  private analyzer: ContentAnalyzer;
  private viralOptimizer: ViralOptimizer;

  constructor(ai: any) {
    this.analyzer = new ContentAnalyzer(ai);
    this.viralOptimizer = new ViralOptimizer();
  }

  async enhance(content: string, request: ContentGenerationRequest, model: string): Promise<ContentGenerationResult> {
    const analysis = await this.analyzer.analyze(content, request.keywords);
    const viralAnalysis = this.viralOptimizer.analyzeViralPotential(content);

    const suggestions = this.generateSuggestions(content, request, analysis.metadata.keywordDensity);

    return {
      content,
      tags: analysis.tags,
      metadata: {
        wordCount: analysis.metadata.wordCount,
        readingTime: analysis.metadata.readingTime,
        sentiment: analysis.sentiment.label,
        confidence: analysis.sentiment.confidence,
        model,
        tokensUsed: Math.ceil(analysis.metadata.wordCount * 1.3)
      },
      suggestions: {
        improvements: suggestions.improvements,
        seoTips: suggestions.seoTips,
        hashtags: suggestions.hashtags,
        ...(viralAnalysis.score > 0 && {
          viralScore: viralAnalysis.score,
          viralFactors: viralAnalysis.factors,
          viralTips: viralAnalysis.tips
        })
      } as any
    };
  }

  private generateSuggestions(content: string, request: ContentGenerationRequest, keywordDensity: number) {
    const improvements: string[] = [];
    const seoTips: string[] = [];
    const hashtags: string[] = [];

    // Content quality suggestions
    if (content.length < 100) {
      improvements.push('Consider expanding the content for better engagement');
    }

    if (!content.includes('?')) {
      improvements.push('Add questions to increase engagement');
    }

    // SEO optimization suggestions
    if (request.keywords?.length) {
      if (keywordDensity < 0.01) {
        seoTips.push('Increase keyword density for better SEO');
      } else if (keywordDensity > 0.03) {
        seoTips.push('Reduce keyword density to avoid over-optimization');
      }
    }

    // Generate hashtags from keywords and content
    if (request.keywords) {
      hashtags.push(...request.keywords.slice(0, 5).map(tag => `#${tag.replace(/\s+/g, '')}`));
    }

    return { improvements, seoTips, hashtags };
  }
}