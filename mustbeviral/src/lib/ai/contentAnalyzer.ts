// AI Content Analyzer
// Analyzes content for quality, sentiment, SEO, and viral potential

import { logger} from '../monitoring/logger';

export interface ContentAnalysisRequest {
  content: string;
  type: 'article' | 'social_post' | 'headline' | 'description';
  targetKeywords?: string[];
  targetAudience?: string;
  platform?: string;
}

export interface ContentAnalysisResult {
  scores: {
    overall: number;
    readability: number;
    seo: number;
    engagement: number;
    viralPotential: number;
    sentiment: {
      label: 'positive' | 'neutral' | 'negative';
      confidence: number;
    };
  };
  metrics: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    avgWordsPerSentence: number;
    readingTime: number;
    keywordDensity: Record<string, number>;
    fleschScore: number;
  };
  suggestions: {
    improvements: string[];
    seoOptimizations: string[];
    engagementTips: string[];
    viralEnhancements: string[];
  };
  topics: {
    primaryTopics: string[];
    entities: string[];
    themes: string[];
  };
  plagiarismCheck?: {
    isOriginal: boolean;
    similarityScore: number;
    sources?: string[];
  };
}

export interface CompetitorAnalysis {
  content: string;
  source: string;
  metrics: {
    engagement: number;
    shares: number;
    viralScore: number;
  };
  insights: string[];
}

interface AIService {
  run(model: string, input: Record<string, any>): Promise<any>;
}

interface VectorizeService {
  query(embedding: number[], options: { topK: number; returnMetadata: boolean }): Promise<{
    matches: Array<{ id: string; score: number; metadata?: { content?: string } }>;
  }>;
}

export class ContentAnalyzer {
  private ai: AIService;
  private env: Record<string, any>;
  private vectorize?: VectorizeService;

  constructor(ai: AIService, env: Record<string, any>, vectorize?: VectorizeService) {
    this.ai = ai;
    this.env = env;
    this.vectorize = vectorize;
  }

  async analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult> {
    const { content} = request;

    // Parallel analysis for better performance
    const [
      readabilityScore,
      seoScore,
      engagementScore,
      viralScore,
      sentiment,
      metrics,
      topics,
      suggestions
    ] = await Promise.all([
      this.calculateReadabilityScore(content),
      this.calculateSEOScore(content, request.targetKeywords),
      this.calculateEngagementScore(content, request.type),
      this.calculateViralPotential(content),
      this.analyzeSentiment(content),
      this.calculateMetrics(content),
      this.extractTopics(content),
      this.generateSuggestions(content, request)
    ]);

    const overallScore = Math.round(
      (readabilityScore + seoScore + engagementScore + viralScore) / 4
    );

    return {
      scores: {
        overall: overallScore,
        readability: readabilityScore,
        seo: seoScore,
        engagement: engagementScore,
        viralPotential: viralScore,
        sentiment
      },
      metrics,
      suggestions,
      topics
    };
  }

  async compareWithCompetitors(content: string, competitors: CompetitorAnalysis[]): Promise<{
    position: number;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  }> {
    const contentAnalysis = await this.analyzeContent({ content, type: 'article' });

    // Sort competitors by overall performance
    const sortedCompetitors = competitors
      .map(comp => ({
        ...comp,
        overallScore: (comp.metrics.engagement + comp.metrics.viralScore) / 2
      }))
      .sort((a, b) => b.overallScore - a.overallScore);

    const position = sortedCompetitors.findIndex(comp =>
      comp.overallScore < contentAnalysis.scores.overall
    ) + 1;

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];

    // Compare against top performer
    const topPerformer = sortedCompetitors[0];
    if (contentAnalysis.scores.readability > 80) {
      strengths.push('High readability score');
    }
    if (contentAnalysis.scores.seo > 70) {
      strengths.push('Strong SEO optimization');
    }

    if (contentAnalysis.scores.engagement < topPerformer?.metrics.engagement) {
      weaknesses.push('Lower engagement potential');
      opportunities.push('Improve call-to-actions and interactive elements');
    }

    if (contentAnalysis.scores.viralPotential < topPerformer?.metrics.viralScore) {
      weaknesses.push('Limited viral potential');
      opportunities.push('Add emotional triggers and shareability factors');
    }

    return { position, strengths, weaknesses, opportunities };
  }

  async analyzeForPlatform(content: string, platform: string): Promise<{
    optimizationScore: number;
    platformSpecificSuggestions: string[];
    characterCount: number;
    optimalLength: { min: number; max: number };
  }> {
    const platformRequirements = {
      twitter: { min: 50, max: 280, optimalHashtags: 2 },
      linkedin: { min: 150, max: 1300, optimalHashtags: 3 },
      facebook: { min: 100, max: 500, optimalHashtags: 2 },
      instagram: { min: 125, max: 300, optimalHashtags: 10 },
      tiktok: { min: 50, max: 150, optimalHashtags: 5 },
      youtube: { min: 200, max: 1000, optimalHashtags: 3 }
    };

    const requirements = platformRequirements[platform as keyof typeof platformRequirements];
    if (!requirements) {
      throw new Error(`Platform ${platform} not supported`);
    }

    const characterCount = content.length;
    let optimizationScore = 50;

    const suggestions: string[] = [];

    // Length optimization
    if (characterCount >= requirements.min && characterCount <= requirements.max) {
      optimizationScore += 20;
    } else if (characterCount < requirements.min) {
      suggestions.push(`Content is too short. Recommended minimum: ${requirements.min} characters`);
    } else {
      suggestions.push(`Content is too long. Recommended maximum: ${requirements.max} characters`);
    }

    // Platform-specific analysis
    const hashtagCount = (content.match(/#\w+/g) ?? []).length;
    if (hashtagCount === requirements.optimalHashtags) {
      optimizationScore += 15;
    } else if (hashtagCount < requirements.optimalHashtags) {
      suggestions.push(`Add ${requirements.optimalHashtags - hashtagCount} more hashtags for optimal reach`);
    } else {
      suggestions.push(`Reduce hashtags to ${requirements.optimalHashtags} for better engagement`);
    }

    // Platform-specific content analysis
    switch (platform) {
      case 'twitter':
        if (!content.includes('@')) {
          suggestions.push('Consider mentioning relevant accounts with @mentions');
        }
        break;
      case 'linkedin':
        if (!content.includes('?')) {
          suggestions.push('Add thought-provoking questions to increase engagement');
        }
        break;
      case 'instagram':
        if (!content.toLowerCase().includes('story')) {
          suggestions.push('Consider storytelling elements for Instagram audience');
        }
        break;
    }

    return {
      optimizationScore: Math.min(optimizationScore, 100),
      platformSpecificSuggestions: suggestions,
      characterCount,
      optimalLength: { min: requirements.min, max: requirements.max }
    };
  }

  async generateContentEmbedding(content: string): Promise<number[]> {
    try {
      if (this.vectorize) {
        // Use Cloudflare Vectorize for embeddings
        const embedding = await this.ai.run('@cf/baai/bge-base-en-v1.5', {
          text: content
        });
        return embedding.data ?? embedding;
      }
    } catch (error: unknown) {
      logger.warn('Vectorize embedding failed, using fallback', {
        component: 'ContentAnalyzer',
        action: 'generateContentEmbedding'
      }, error instanceof Error ? error : new Error(String(error)));
    }

    // Fallback: simple hash-based embedding
    return this.createSimpleEmbedding(content);
  }

  async findSimilarContent(content: string, threshold: number = 0.8): Promise<{
    similarContent: Array<{
      id: string;
      content: string;
      similarity: number;
    }>;
    isDuplicate: boolean;
  }> {
    if (!this.vectorize) {
      return { similarContent: [], isDuplicate: false };
    }

    try {
      const embedding = await this.generateContentEmbedding(content);

      const results = await this.vectorize.query(embedding, {
        topK: 10,
        returnMetadata: true
      });

      const similarContent = results.matches
        .filter(match => match.score >= threshold)
        .map(match => ({
          id: match.id,
          content: match.metadata?.content ?? '',
          similarity: match.score
        }));

      const isDuplicate = similarContent.some(item => item.similarity > 0.95);

      return { similarContent, isDuplicate };
    } catch (error: unknown) {
      logger.error('Similarity search failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'ContentAnalyzer',
        action: 'findSimilarContent'
      });
      return { similarContent: [], isDuplicate: false };
    }
  }

  private async calculateReadabilityScore(content: string): Promise<number> {
    const fleschScore = this.calculateFleschReadingEase(content);

    // Convert Flesch score to 0-100 scale
    if (fleschScore >= 90) {
    return 100;
  }
    if (fleschScore >= 80) {
    return 90;
  }
    if (fleschScore >= 70) {
    return 80;
  }
    if (fleschScore >= 60) {
    return 70;
  }
    if (fleschScore >= 50) {
    return 60;
  }
    if (fleschScore >= 30) {
    return 50;
  }
    return 30;
  }

  private calculateFleschReadingEase(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = content.split(/\s+/).filter(w => w.length > 0).length;
    const syllables = this.countSyllables(content);

    if (sentences === 0 ?? words === 0) {
    return 0;
  }

    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    return 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let syllableCount = 0;

    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (cleanWord.length === 0) {
    continue;
  }

      const vowels = cleanWord.match(/[aeiouy]+/g);
      let count = vowels ? vowels.length : 0;

      // Adjust for silent e
      if (cleanWord.endsWith('e') && count > 1) {count--;}

      // Every word has at least one syllable
      if (count === 0) {count = 1;}

      syllableCount += count;
    }

    return syllableCount;
  }

  private async calculateSEOScore(content: string, keywords?: string[]): Promise<number> {
    let score = 50;

    if (!keywords ?? keywords.length === 0) {
    return score;
  }

    // Keyword density analysis
    for (const keyword of keywords) {
      const density = this.calculateKeywordDensity(content, keyword);
      if (density >= 0.005 && density <= 0.03) {
        score += 10;
      } else if (density > 0) {
        score += 5;
      }
    }

    // Title and heading optimization (assuming structured content)
    const hasHeadings = /#{1,6}\s/.test(content)  ?? /<h[1-6]>/i.test(content);
    if (hasHeadings) {score += 10;}

    // Meta description length (if present)
    if (content.length >= 150 && content.length <= 160) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateKeywordDensity(content: string, keyword: string): number {
    const contentLower = content.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    const keywordCount = (contentLower.match(new RegExp(keywordLower, 'g'))  ?? []).length;
    const totalWords = content.split(/\s+/).length;

    return keywordCount / totalWords;
  }

  private async calculateEngagementScore(content: string, type: string): Promise<number> {
    let score = 50;

    // Question count
    const questionCount = (content.match(/\?/g)  ?? []).length;
    score += Math.min(questionCount * 5, 20);

    // Call-to-action presence
    const ctaWords = ['share', 'comment', 'like', 'subscribe', 'follow', 'click', 'join'];
    const ctaCount = ctaWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;
    score += Math.min(ctaCount * 5, 15);

    // Emotional words
    const emotionalWords = ['amazing', 'incredible', 'shocking', 'exclusive', 'secret', 'love', 'hate'];
    const emotionalCount = emotionalWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;
    score += Math.min(emotionalCount * 3, 15);

    // Personal pronouns
    const personalPronouns = ['you', 'your', 'we', 'our', 'i', 'my'];
    const pronounCount = personalPronouns.filter(pronoun =>
      content.toLowerCase().includes(pronoun)
    ).length;
    score += Math.min(pronounCount * 2, 10);

    return Math.min(score, 100);
  }

  private async calculateViralPotential(content: string): Promise<number> {
    let score = 30;

    // Emotional triggers
    const viralTriggers = [
      'exclusive', 'secret', 'amazing', 'shocking', 'unbelievable',
      'mind-blowing', 'incredible', 'surprising', 'controversial'
    ];

    const triggerCount = viralTriggers.filter(trigger =>
      content.toLowerCase().includes(trigger)
    ).length;
    score += Math.min(triggerCount * 8, 25);

    // Shareability elements
    const shareWords = ['share', 'tell', 'spread', 'everyone should know'];
    const shareCount = shareWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;
    score += Math.min(shareCount * 10, 20);

    // Curiosity gaps
    const curiosityWords = ['why', 'how', 'what', 'secret', 'revealed', 'truth'];
    const curiosityCount = curiosityWords.filter(word =>
      content.toLowerCase().includes(word)
    ).length;
    score += Math.min(curiosityCount * 5, 15);

    // Optimal length for sharing
    if (content.length >= 100 && content.length <= 300) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private async analyzeSentiment(content: string): Promise<{
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  }> {
    try {
      const result = await this.ai.run('@cf/huggingface/distilbert-sst-2-int8', {
        text: content
      });

      if (result?.[0]) {
        return {
          label: result[0].label.toLowerCase() as 'positive' | 'neutral' | 'negative',
          confidence: result[0].score
        };
      }
    } catch (error: unknown) {
      // Fallback sentiment analysis
    }

    return this.simpleSentimentAnalysis(content);
  }

  private simpleSentimentAnalysis(content: string): {
    label: 'positive' | 'neutral' | 'negative';
    confidence: number;
  } {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing'];

    const contentLower = content.toLowerCase();
    const positiveCount = positiveWords.filter(word => contentLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => contentLower.includes(word)).length;

    if (positiveCount > negativeCount) {
      return { label: 'positive', confidence: Math.min(positiveCount / 10, 0.9) };
    } else if (negativeCount > positiveCount) {
      return { label: 'negative', confidence: Math.min(negativeCount / 10, 0.9) };
    } else {
      return { label: 'neutral', confidence: 0.5 };
    }
  }

  private calculateMetrics(content: string): {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    avgWordsPerSentence: number;
    readingTime: number;
    keywordDensity: Record<string, number>;
    fleschScore: number;
  } {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
      readingTime: Math.ceil(words.length / 200),
      keywordDensity: {}, // Populated when target keywords provided
      fleschScore: this.calculateFleschReadingEase(content)
    };
  }

  private async extractTopics(content: string): Promise<{
    primaryTopics: string[];
    entities: string[];
    themes: string[];
  }> {
    // Simple topic extraction (in production, use more sophisticated NLP)
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word)  ?? 0) + 1);
    });

    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return {
      primaryTopics: sortedWords.slice(0, 5),
      entities: [], // Would use NER in production
      themes: sortedWords.slice(5, 10)
    };
  }

  private async generateSuggestions(content: string, request: ContentAnalysisRequest): Promise<{
    improvements: string[];
    seoOptimizations: string[];
    engagementTips: string[];
    viralEnhancements: string[];
  }> {
    const improvements: string[] = [];
    const seoOptimizations: string[] = [];
    const engagementTips: string[] = [];
    const viralEnhancements: string[] = [];

    const metrics = this.calculateMetrics(content);

    // Readability improvements
    if (metrics.avgWordsPerSentence > 20) {
      improvements.push('Break down long sentences for better readability');
    }

    if (metrics.paragraphCount < 3 && metrics.wordCount > 200) {
      improvements.push('Break content into more paragraphs');
    }

    // SEO optimizations
    if (request.targetKeywords) {
      for (const keyword of request.targetKeywords) {
        const density = this.calculateKeywordDensity(content, keyword);
        if (density < 0.005) {
          seoOptimizations.push(`Include "${keyword}" more frequently (current density: ${(density * 100).toFixed(2)}%)`);
        }
      }
    }

    // Engagement tips
    if (!content.includes('?')) {
      engagementTips.push('Add questions to encourage reader interaction');
    }

    const ctaWords = ['share', 'comment', 'like'];
    const hasCTA = ctaWords.some(word => content.toLowerCase().includes(word));
    if (!hasCTA) {
      engagementTips.push('Include a clear call-to-action');
    }

    // Viral enhancements
    const emotionalWords = ['amazing', 'incredible', 'shocking'];
    const hasEmotional = emotionalWords.some(word => content.toLowerCase().includes(word));
    if (!hasEmotional) {
      viralEnhancements.push('Add emotional triggers to increase shareability');
    }

    if (!content.toLowerCase().includes('share')) {
      viralEnhancements.push('Include encouragement to share');
    }

    return {
      improvements,
      seoOptimizations,
      engagementTips,
      viralEnhancements
    };
  }

  private createSimpleEmbedding(content: string): number[] {
    // Simple hash-based embedding for fallback
    const hash = this.simpleHash(content);
    const embedding = new Array(384).fill(0);

    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = Math.sin(hash * (i + 1)) * 0.5;
    }

    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}