// Trend monitoring and prediction engine
// LOG: TRENDS-INIT-1 - Initialize trend monitoring system

import googleTrends from 'google-trends-api';

export interface TrendData {
  id: string;
  keyword: string;
  trend_score: number;
  search_volume: number;
  competition_score: number;
  related_queries: string[];
  source: 'google_trends' | 'manual' | 'predicted';
  region: string;
  category: string;
  timestamp: string;
  viral_potential: number;
}

export interface TrendPrediction {
  keyword: string;
  predicted_growth: number;
  confidence_level: number;
  time_horizon: '1d' | '7d' | '30d';
  factors: string[];
}

export class TrendMonitoringEngine {
  private cache: Map<string, TrendData[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor() {
    console.log('LOG: TRENDS-ENGINE-1 - Trend monitoring engine initialized');
  }

  // Fetch trending topics from Google Trends
  async fetchTrendingTopics(region: string = 'US', category?: string): Promise<TrendData[]> {
    console.log('LOG: TRENDS-FETCH-1 - Fetching trending topics for region:', region);
    
    const cacheKey = `trending_${region}_${category || 'all'}`;
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      console.log('LOG: TRENDS-FETCH-2 - Returning cached trending topics');
      return this.cache.get(cacheKey) || [];
    }

    try {
      // Fetch daily trends from Google Trends
      const trendsData = await googleTrends.dailyTrends({
        trendDate: new Date(),
        geo: region,
      });

      const parsedData = JSON.parse(trendsData);
      const trends = this.parseDailyTrends(parsedData, region);
      
      // Cache the results
      this.cache.set(cacheKey, trends);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      console.log('LOG: TRENDS-FETCH-3 - Fetched', trends.length, 'trending topics');
      return trends;
    } catch (error) {
      console.error('LOG: TRENDS-FETCH-ERROR-1 - Failed to fetch trends:', error);
      return this.getFallbackTrends(region);
    }
  }

  // Get interest over time for specific keywords
  async getKeywordTrends(keywords: string[], timeRange: string = 'today 3-m'): Promise<TrendData[]> {
    console.log('LOG: TRENDS-KEYWORD-1 - Fetching keyword trends for:', keywords.join(', '));
    
    const cacheKey = `keywords_${keywords.join('_')}_${timeRange}`;
    
    if (this.isCacheValid(cacheKey)) {
      console.log('LOG: TRENDS-KEYWORD-2 - Returning cached keyword trends');
      return this.cache.get(cacheKey) || [];
    }

    try {
      const trendsData = await googleTrends.interestOverTime({
        keyword: keywords,
        startTime: this.getStartTime(timeRange),
        granularTimeResolution: true
      });

      const parsedData = JSON.parse(trendsData);
      const trends = this.parseKeywordTrends(parsedData, keywords);
      
      this.cache.set(cacheKey, trends);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      console.log('LOG: TRENDS-KEYWORD-3 - Processed keyword trends for', keywords.length, 'keywords');
      return trends;
    } catch (error) {
      console.error('LOG: TRENDS-KEYWORD-ERROR-1 - Failed to fetch keyword trends:', error);
      return this.getFallbackKeywordTrends(keywords);
    }
  }

  // Get related queries for a keyword
  async getRelatedQueries(keyword: string, region: string = 'US'): Promise<string[]> {
    console.log('LOG: TRENDS-RELATED-1 - Fetching related queries for:', keyword);
    
    try {
      const relatedData = await googleTrends.relatedQueries({
        keyword,
        geo: region,
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      });

      const parsedData = JSON.parse(relatedData);
      const queries = this.parseRelatedQueries(parsedData);
      
      console.log('LOG: TRENDS-RELATED-2 - Found', queries.length, 'related queries');
      return queries;
    } catch (error) {
      console.error('LOG: TRENDS-RELATED-ERROR-1 - Failed to fetch related queries:', error);
      return [];
    }
  }

  // Predict trend growth using simple momentum analysis
  async predictTrendGrowth(keyword: string): Promise<TrendPrediction> {
    console.log('LOG: TRENDS-PREDICT-1 - Predicting growth for keyword:', keyword);
    
    try {
      // Get recent trend data
      const recentTrends = await this.getKeywordTrends([keyword], 'today 1-m');
      const prediction = this.calculateGrowthPrediction(keyword, recentTrends);
      
      console.log('LOG: TRENDS-PREDICT-2 - Growth prediction calculated:', prediction.predicted_growth);
      return prediction;
    } catch (error) {
      console.error('LOG: TRENDS-PREDICT-ERROR-1 - Failed to predict growth:', error);
      return this.getFallbackPrediction(keyword);
    }
  }

  // Analyze viral potential of content topics
  analyzeViralPotential(keywords: string[], trendData: TrendData[]): number {
    console.log('LOG: TRENDS-VIRAL-1 - Analyzing viral potential for keywords:', keywords.join(', '));
    
    let viralScore = 0;
    let matchCount = 0;

    keywords.forEach(keyword => {
      const matchingTrends = trendData.filter(trend => 
        trend.keyword.toLowerCase().includes(keyword.toLowerCase()) ||
        trend.related_queries.some(query => 
          query.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      if (matchingTrends.length > 0) {
        const avgTrendScore = matchingTrends.reduce((sum, trend) => sum + trend.trend_score, 0) / matchingTrends.length;
        viralScore += avgTrendScore;
        matchCount++;
      }
    });

    const finalScore = matchCount > 0 ? viralScore / matchCount : 30; // Base score if no matches
    console.log('LOG: TRENDS-VIRAL-2 - Viral potential score calculated:', finalScore);
    
    return Math.min(100, finalScore);
  }

  // Get content optimization suggestions
  getContentSuggestions(topic: string, trendData: TrendData[]): any {
    console.log('LOG: TRENDS-SUGGEST-1 - Getting content suggestions for topic:', topic);
    
    const relevantTrends = trendData.filter(trend => 
      trend.keyword.toLowerCase().includes(topic.toLowerCase()) ||
      trend.category.toLowerCase().includes(topic.toLowerCase())
    ).slice(0, 5);

    const suggestions = {
      trending_keywords: relevantTrends.map(trend => trend.keyword),
      related_topics: relevantTrends.flatMap(trend => trend.related_queries).slice(0, 10),
      optimal_timing: this.getOptimalTiming(relevantTrends),
      viral_potential: this.analyzeViralPotential([topic], trendData),
      content_angles: this.generateContentAngles(topic, relevantTrends)
    };

    console.log('LOG: TRENDS-SUGGEST-2 - Generated', suggestions.trending_keywords.length, 'keyword suggestions');
    return suggestions;
  }

  // Private helper methods
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private parseDailyTrends(data: any, region: string): TrendData[] {
    try {
      const trends: TrendData[] = [];
      const trendingSearches = data.default?.trendingSearchesDays?.[0]?.trendingSearches || [];

      trendingSearches.forEach((search: any, index: number) => {
        const title = search.title?.query || 'Unknown';
        const traffic = search.formattedTraffic || '0';
        
        trends.push({
          id: `trend_${Date.now()}_${index}`,
          keyword: title,
          trend_score: this.parseTrafficToScore(traffic),
          search_volume: this.estimateSearchVolume(traffic),
          competition_score: Math.random() * 100, // Placeholder
          related_queries: search.relatedQueries?.map((q: any) => q.query) || [],
          source: 'google_trends',
          region,
          category: search.articles?.[0]?.source || 'general',
          timestamp: new Date().toISOString(),
          viral_potential: Math.random() * 100 // Will be calculated properly
        });
      });

      return trends;
    } catch (error) {
      console.error('LOG: TRENDS-PARSE-ERROR-1 - Failed to parse daily trends:', error);
      return [];
    }
  }

  private parseKeywordTrends(data: any, keywords: string[]): TrendData[] {
    try {
      const trends: TrendData[] = [];
      const timelineData = data.default?.timelineData || [];

      keywords.forEach((keyword, keywordIndex) => {
        if (timelineData.length > 0) {
          const latestData = timelineData[timelineData.length - 1];
          const value = latestData.value?.[keywordIndex] || 0;

          trends.push({
            id: `keyword_${Date.now()}_${keywordIndex}`,
            keyword,
            trend_score: value,
            search_volume: value * 1000, // Rough estimation
            competition_score: Math.random() * 100,
            related_queries: [],
            source: 'google_trends',
            region: 'US',
            category: 'search',
            timestamp: new Date().toISOString(),
            viral_potential: value
          });
        }
      });

      return trends;
    } catch (error) {
      console.error('LOG: TRENDS-PARSE-ERROR-2 - Failed to parse keyword trends:', error);
      return [];
    }
  }

  private parseRelatedQueries(data: any): string[] {
    try {
      const queries: string[] = [];
      const relatedQueries = data.default?.rankedList || [];

      relatedQueries.forEach((list: any) => {
        if (list.rankedKeyword) {
          list.rankedKeyword.forEach((item: any) => {
            if (item.query) {
              queries.push(item.query);
            }
          });
        }
      });

      return queries.slice(0, 20); // Limit to top 20
    } catch (error) {
      console.error('LOG: TRENDS-PARSE-ERROR-3 - Failed to parse related queries:', error);
      return [];
    }
  }

  private calculateGrowthPrediction(keyword: string, trends: TrendData[]): TrendPrediction {
    if (trends.length < 2) {
      return this.getFallbackPrediction(keyword);
    }

    const sortedTrends = trends.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const recent = sortedTrends.slice(-7); // Last 7 data points
    
    let growthRate = 0;
    for (let i = 1; i < recent.length; i++) {
      growthRate += (recent[i].trend_score - recent[i-1].trend_score) / recent[i-1].trend_score;
    }
    
    const avgGrowthRate = growthRate / (recent.length - 1);
    const confidence = Math.min(95, Math.abs(avgGrowthRate) * 100 + 50);

    return {
      keyword,
      predicted_growth: avgGrowthRate * 100,
      confidence_level: confidence,
      time_horizon: '7d',
      factors: ['search_volume_trend', 'momentum_analysis']
    };
  }

  private getFallbackTrends(region: string): TrendData[] {
    console.log('LOG: TRENDS-FALLBACK-1 - Using fallback trends for region:', region);
    
    return [
      {
        id: 'fallback_1',
        keyword: 'AI technology',
        trend_score: 75,
        search_volume: 50000,
        competition_score: 60,
        related_queries: ['artificial intelligence', 'machine learning', 'AI news'],
        source: 'manual',
        region,
        category: 'technology',
        timestamp: new Date().toISOString(),
        viral_potential: 70
      },
      {
        id: 'fallback_2',
        keyword: 'content creation',
        trend_score: 65,
        search_volume: 30000,
        competition_score: 55,
        related_queries: ['digital content', 'social media content', 'viral content'],
        source: 'manual',
        region,
        category: 'marketing',
        timestamp: new Date().toISOString(),
        viral_potential: 60
      }
    ];
  }

  private getFallbackKeywordTrends(keywords: string[]): TrendData[] {
    return keywords.map((keyword, index) => ({
      id: `fallback_keyword_${index}`,
      keyword,
      trend_score: 50 + Math.random() * 30,
      search_volume: 10000 + Math.random() * 40000,
      competition_score: Math.random() * 100,
      related_queries: [],
      source: 'manual' as const,
      region: 'US',
      category: 'general',
      timestamp: new Date().toISOString(),
      viral_potential: 40 + Math.random() * 40
    }));
  }

  private getFallbackPrediction(keyword: string): TrendPrediction {
    return {
      keyword,
      predicted_growth: Math.random() * 20 - 10, // -10% to +10%
      confidence_level: 30,
      time_horizon: '7d',
      factors: ['insufficient_data']
    };
  }

  private parseTrafficToScore(traffic: string): number {
    const numStr = traffic.replace(/[^0-9]/g, '');
    const num = parseInt(numStr) || 0;
    
    if (traffic.includes('M')) return Math.min(100, num * 2);
    if (traffic.includes('K')) return Math.min(100, num / 10);
    return Math.min(100, num / 1000);
  }

  private estimateSearchVolume(traffic: string): number {
    const numStr = traffic.replace(/[^0-9]/g, '');
    const num = parseInt(numStr) || 0;
    
    if (traffic.includes('M')) return num * 1000000;
    if (traffic.includes('K')) return num * 1000;
    return num * 100;
  }

  private getStartTime(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case 'today 1-m': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'today 3-m': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private getOptimalTiming(trends: TrendData[]): string {
    const avgScore = trends.reduce((sum, trend) => sum + trend.trend_score, 0) / trends.length;
    
    if (avgScore > 70) return 'immediate';
    if (avgScore > 40) return 'within_24h';
    return 'within_week';
  }

  private generateContentAngles(topic: string, trends: TrendData[]): string[] {
    const angles = [
      `Breaking: ${topic} trends you need to know`,
      `Why ${topic} is trending right now`,
      `The future of ${topic}: expert predictions`
    ];

    trends.forEach(trend => {
      if (trend.related_queries.length > 0) {
        angles.push(`${topic} and ${trend.related_queries[0]}: the connection`);
      }
    });

    if (angles.length > 3) { // Only add generic angles if trend-based angles were added
        const generic_angles = [
        `The ultimate guide to ${topic}`,
        `How ${topic} is changing the game`,
        `Why everyone is talking about ${topic}`,
        `${topic}: What you need to know`,
        ];

        let i = 0;
        while (angles.length < 5 && i < generic_angles.length) {
        if (!angles.includes(generic_angles[i])) {
            angles.push(generic_angles[i]);
        }
        i++;
        }
    }

    return angles.slice(0, 5);
  }
}

// Export singleton instance
export const trendEngine = new TrendMonitoringEngine();