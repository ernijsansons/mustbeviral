// Visibility & Reputation Boost engine for content seeding and sentiment tracking
// LOG: BOOST-INIT-1 - Initialize boost engine

export interface BrandMention {
  id: string;
  query: string;
  snippet: string;
  url: string;
  source: string;
  sentiment_score: number;
  relevance_score: number;
  timestamp: string;
  content_id?: string;
}

export interface ReputationMetrics {
  overall_sentiment: number;
  mention_count: number;
  positive_mentions: number;
  negative_mentions: number;
  neutral_mentions: number;
  visibility_score: number;
  last_updated: string;
  trending_keywords: string[];
}

export interface ContentSeedingPlan {
  id: string;
  content_id: string;
  target_platforms: string[];
  seeding_strategy: 'viral' | 'reputation_repair' | 'visibility_boost';
  priority: 'high' | 'medium' | 'low';
  estimated_reach: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
  created_at: string;
}

export interface SentimentAnalysisResult {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  score: number; // -1 to 1
  keywords: string[];
}

export class VisibilityBoostEngine {
  private perplexityApiKey: string;
  private brandKeywords: string[];
  private ethicsThreshold: number = 0.7;

  constructor(apiKey?: string, brandKeywords: string[] = ['Must Be Viral']) {
    console.log('LOG: BOOST-ENGINE-1 - Initializing visibility boost engine');
    
    this.perplexityApiKey = apiKey || process.env.PERPLEXITY_API_KEY || '';
    this.brandKeywords = brandKeywords;
    
    if (!this.perplexityApiKey) {
      console.warn('LOG: BOOST-ENGINE-WARN-1 - No Perplexity API key provided');
    }
  }

  // Search for brand mentions using Perplexity API
  async searchBrandMentions(keywords?: string[]): Promise<BrandMention[]> {
    console.log('LOG: BOOST-SEARCH-1 - Searching for brand mentions');
    
    const searchKeywords = keywords || this.brandKeywords;
    const mentions: BrandMention[] = [];

    try {
      for (const keyword of searchKeywords) {
        console.log('LOG: BOOST-SEARCH-2 - Searching for keyword:', keyword);
        
        const results = await this.queryPerplexity(keyword);
        const processedMentions = await this.processMentionResults(results, keyword);
        mentions.push(...processedMentions);
      }

      console.log('LOG: BOOST-SEARCH-3 - Found', mentions.length, 'brand mentions');
      return mentions;
    } catch (error) {
      console.error('LOG: BOOST-SEARCH-ERROR-1 - Failed to search mentions:', error);
      return this.getFallbackMentions();
    }
  }

  // Query Perplexity API for search results
  private async queryPerplexity(query: string): Promise<unknown> {
    console.log('LOG: BOOST-PERPLEXITY-1 - Querying Perplexity API');
    
    if (!this.perplexityApiKey) {
      console.log('LOG: BOOST-PERPLEXITY-2 - Using mock data (no API key)');
      return this.getMockPerplexityResults(query);
    }

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that searches for and summarizes information about brands and companies.'
            },
            {
              role: 'user',
              content: `Search for recent mentions, reviews, and discussions about "${query}". Provide specific quotes and sources.`
            }
          ],
          max_tokens: 1000,
          temperature: 0.2,
          return_citations: true
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('LOG: BOOST-PERPLEXITY-3 - Perplexity API response received');
      return data;
    } catch (error) {
      console.error('LOG: BOOST-PERPLEXITY-ERROR-1 - Perplexity API call failed:', error);
      return this.getMockPerplexityResults(query);
    }
  }

  // Process Perplexity results into structured mentions
  private async processMentionResults(results: any, query: string): Promise<BrandMention[]> {
    console.log('LOG: BOOST-PROCESS-1 - Processing mention results');
    
    try {
      const mentions: BrandMention[] = [];
      const content = results.choices?.[0]?.message?.content || '';
      const citations = results.citations || [];

      // Extract mentions from content
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      for (let i = 0; i < Math.min(sentences.length, 5); i++) {
        const sentence = sentences[i].trim();
        if (sentence.toLowerCase().includes(query.toLowerCase())) {
          const sentiment = await this.analyzeSentiment(sentence);
          
          mentions.push({
            id: this.generateMentionId(),
            query,
            snippet: sentence,
            url: citations[i % citations.length]?.url || `https://perplexity.ai/search?q=${encodeURIComponent(query)}`,
            source: citations[i % citations.length]?.title || 'Perplexity AI',
            sentiment_score: sentiment.score,
            relevance_score: this.calculateRelevance(sentence, query),
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log('LOG: BOOST-PROCESS-2 - Processed', mentions.length, 'mentions');
      return mentions;
    } catch (error) {
      console.error('LOG: BOOST-PROCESS-ERROR-1 - Failed to process results:', error);
      return [];
    }
  }

  // Analyze sentiment using simple rule-based approach (BERT.js would be integrated here)
  async analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
    console.log('LOG: BOOST-SENTIMENT-1 - Analyzing sentiment');
    
    try {
      // Simple rule-based sentiment analysis (placeholder for BERT.js)
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'awesome', 'fantastic'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing'];
      
      const lowerText = text.toLowerCase();
      let positiveCount = 0;
      let negativeCount = 0;
      
      positiveWords.forEach(word => {
        if (lowerText.includes(word)) positiveCount++;
      });
      
      negativeWords.forEach(word => {
        if (lowerText.includes(word)) negativeCount++;
      });
      
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      let score = 0;
      
      if (positiveCount > negativeCount) {
        sentiment = 'positive';
        score = Math.min(0.8, 0.3 + (positiveCount * 0.2));
      } else if (negativeCount > positiveCount) {
        sentiment = 'negative';
        score = Math.max(-0.8, -0.3 - (negativeCount * 0.2));
      }
      
      const confidence = Math.abs(score);
      
      console.log('LOG: BOOST-SENTIMENT-2 - Sentiment analyzed:', sentiment, score);
      
      return {
        text,
        sentiment,
        confidence,
        score,
        keywords: [...positiveWords.filter(w => lowerText.includes(w)), 
                  ...negativeWords.filter(w => lowerText.includes(w))]
      };
    } catch (error) {
      console.error('LOG: BOOST-SENTIMENT-ERROR-1 - Sentiment analysis failed:', error);
      return {
        text,
        sentiment: 'neutral',
        confidence: 0,
        score: 0,
        keywords: []
      };
    }
  }

  // Calculate reputation metrics from mentions
  calculateReputationMetrics(mentions: BrandMention[]): ReputationMetrics {
    console.log('LOG: BOOST-METRICS-1 - Calculating reputation metrics');
    
    if (mentions.length === 0) {
      return {
        overall_sentiment: 0,
        mention_count: 0,
        positive_mentions: 0,
        negative_mentions: 0,
        neutral_mentions: 0,
        visibility_score: 0,
        last_updated: new Date().toISOString(),
        trending_keywords: []
      };
    }

    const positive = mentions.filter(m => m.sentiment_score > 0.1).length;
    const negative = mentions.filter(m => m.sentiment_score < -0.1).length;
    const neutral = mentions.length - positive - negative;
    
    const overallSentiment = mentions.reduce((sum, m) => sum + m.sentiment_score, 0) / mentions.length;
    const visibilityScore = Math.min(100, mentions.length * 10);
    
    // Extract trending keywords
    const allKeywords = mentions.flatMap(m => m.snippet.split(' '))
      .filter(word => word.length > 4)
      .map(word => word.toLowerCase().replace(/[^\w]/g, ''));
    
    const keywordCounts = allKeywords.reduce((acc: any, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
    
    const trendingKeywords = Object.entries(keywordCounts)
      .sort(([,a]: any, [,b]: unknown) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    console.log('LOG: BOOST-METRICS-2 - Metrics calculated:', {
      sentiment: overallSentiment,
      mentions: mentions.length
    });

    return {
      overall_sentiment: overallSentiment,
      mention_count: mentions.length,
      positive_mentions: positive,
      negative_mentions: negative,
      neutral_mentions: neutral,
      visibility_score: visibilityScore,
      last_updated: new Date().toISOString(),
      trending_keywords: trendingKeywords
    };
  }

  // Create content seeding plan based on sentiment and goals
  createSeedingPlan(
    contentId: string, 
    currentMetrics: ReputationMetrics,
    strategy?: 'viral' | 'reputation_repair' | 'visibility_boost'
  ): ContentSeedingPlan {
    console.log('LOG: BOOST-SEEDING-1 - Creating content seeding plan');
    
    // Determine strategy if not provided
    let seedingStrategy = strategy;
    if (!seedingStrategy) {
      if (currentMetrics.overall_sentiment < -0.3) {
        seedingStrategy = 'reputation_repair';
      } else if (currentMetrics.visibility_score < 30) {
        seedingStrategy = 'visibility_boost';
      } else {
        seedingStrategy = 'viral';
      }
    }

    // Ethics check for seeding strategy
    const ethicsCheck = this.performEthicsCheck(seedingStrategy, currentMetrics);
    if (!ethicsCheck.passed) {
      console.warn('LOG: BOOST-SEEDING-WARN-1 - Ethics check failed:', ethicsCheck.reason);
      seedingStrategy = 'visibility_boost'; // Fallback to safer strategy
    }

    const platforms = this.selectTargetPlatforms(seedingStrategy);
    const priority = this.determinePriority(seedingStrategy, currentMetrics);
    const estimatedReach = this.estimateReach(platforms, priority);

    const plan: ContentSeedingPlan = {
      id: this.generatePlanId(),
      content_id: contentId,
      target_platforms: platforms,
      seeding_strategy: seedingStrategy,
      priority,
      estimated_reach: estimatedReach,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('LOG: BOOST-SEEDING-2 - Seeding plan created:', plan.seeding_strategy, plan.priority);
    return plan;
  }

  // Perform ethics check for seeding recommendations
  private performEthicsCheck(strategy: string, metrics: ReputationMetrics): { passed: boolean; reason?: string } {
    console.log('LOG: BOOST-ETHICS-1 - Performing ethics check for strategy:', strategy);
    
    // Check for potential manipulation or bias
    if (strategy === 'reputation_repair' && metrics.negative_mentions > metrics.positive_mentions * 3) {
      return {
        passed: false,
        reason: 'Excessive negative sentiment may indicate legitimate concerns that should be addressed rather than amplified over'
      };
    }

    // Check for artificial amplification
    if (strategy === 'viral' && metrics.visibility_score > 80) {
      return {
        passed: false,
        reason: 'High visibility score suggests potential over-amplification'
      };
    }

    console.log('LOG: BOOST-ETHICS-2 - Ethics check passed');
    return { passed: true };
  }

  // Helper methods
  private selectTargetPlatforms(strategy: string): string[] {
    switch (strategy) {
      case 'reputation_repair':
        return ['LinkedIn', 'Medium', 'Official Blog'];
      case 'visibility_boost':
        return ['Twitter', 'LinkedIn', 'Reddit', 'Medium'];
      case 'viral':
        return ['Twitter', 'TikTok', 'Instagram', 'Reddit'];
      default:
        return ['Twitter', 'LinkedIn'];
    }
  }

  private determinePriority(strategy: string, metrics: ReputationMetrics): 'high' | 'medium' | 'low' {
    if (strategy === 'reputation_repair' && metrics.overall_sentiment < -0.5) {
      return 'high';
    }
    if (strategy === 'visibility_boost' && metrics.visibility_score < 20) {
      return 'high';
    }
    return 'medium';
  }

  private estimateReach(platforms: string[], priority: string): number {
    const basePlatformReach = {
      'Twitter': 10000,
      'LinkedIn': 5000,
      'Instagram': 15000,
      'TikTok': 25000,
      'Reddit': 8000,
      'Medium': 3000,
      'Official Blog': 2000
    };

    const totalReach = platforms.reduce((sum, platform) => {
      return sum + (basePlatformReach[platform as keyof typeof basePlatformReach] || 1000);
    }, 0);

    const priorityMultiplier = priority === 'high' ? 1.5 : priority === 'medium' ? 1.2 : 1.0;
    return Math.round(totalReach * priorityMultiplier);
  }

  private calculateRelevance(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText.includes(lowerQuery)) {
      return 0.9;
    }
    
    const queryWords = lowerQuery.split(' ');
    const matchingWords = queryWords.filter(word => lowerText.includes(word));
    
    return matchingWords.length / queryWords.length;
  }

  private generateMentionId(): string {
    return `mention_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Fallback methods for when APIs are unavailable
  private getFallbackMentions(): BrandMention[] {
    console.log('LOG: BOOST-FALLBACK-1 - Using fallback mentions');
    
    return [
      {
        id: 'fallback_1',
        query: 'Must Be Viral',
        snippet: 'Must Be Viral is an innovative AI-powered content creation platform that helps creators generate engaging content.',
        url: 'https://example.com/review1',
        source: 'Tech Review Blog',
        sentiment_score: 0.7,
        relevance_score: 0.9,
        timestamp: new Date().toISOString()
      },
      {
        id: 'fallback_2',
        query: 'Must Be Viral',
        snippet: 'The platform shows promise but needs improvement in user interface design.',
        url: 'https://example.com/review2',
        source: 'User Feedback Forum',
        sentiment_score: -0.2,
        relevance_score: 0.8,
        timestamp: new Date().toISOString()
      }
    ];
  }

  private getMockPerplexityResults(query: string): any {
    return {
      choices: [{
        message: {
          content: `Recent discussions about ${query} show mixed reactions. Users appreciate the AI-powered features and innovative approach to content creation. Some concerns were raised about pricing and learning curve. Overall, the platform is gaining traction in the content creator community.`
        }
      }],
      citations: [
        { url: 'https://example.com/source1', title: 'Content Creator Review' },
        { url: 'https://example.com/source2', title: 'Tech Blog Analysis' }
      ]
    };
  }
}

// Export singleton instance
export const visibilityBoostEngine = new VisibilityBoostEngine();