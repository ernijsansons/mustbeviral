// Trending Detection System
// Analyzes content engagement patterns to identify trending topics and content

export interface EngagementMetrics {
  contentId: string;
  timestamp: number;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  clickThroughRate: number;
  bounceRate: number;
  timeSpent: number;
  platform: string;
  referralSource?: string;
}

export interface TrendMetrics {
  topic: string;
  contentIds: string[];
  category: string;
  score: number;
  velocity: number; // rate of growth
  acceleration: number; // change in velocity
  volume: number; // total engagement
  timeWindow: '1h' | '6h' | '24h' | '7d';
  region?: string;
  demographics?: {
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    interests: string[];
  };
  platforms: Record<string, number>; // engagement by platform
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  relatedTopics: string[];
  predictedPeak?: number; // predicted timestamp of peak engagement
  sustainabilityScore: number; // how long trend might last
}

export interface ViralPrediction {
  contentId: string;
  currentScore: number;
  predictedScore: number;
  confidence: number;
  timeToViral: number; // estimated hours to go viral
  factors: {
    earlyEngagement: number;
    shareRate: number;
    commentQuality: number;
    influencerAttention: number;
    timingScore: number;
    contentQuality: number;
  };
  recommendations: string[];
}

export interface AnomalyDetection {
  contentId: string;
  type: 'sudden_spike' | 'unusual_drop' | 'bot_activity' | 'viral_breakout';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  description: string;
  timestamp: number;
  metrics: {
    current: number;
    expected: number;
    deviation: number;
  };
}

export class TrendingDetector {
  private engagementHistory: EngagementMetrics[] = [];
  private trendHistory: Map<string, TrendMetrics[]> = new Map();
  private baselineMetrics: Map<string, number[]> = new Map();

  constructor(
    private kv?: unknown,
    private env?: unknown
  ) {}

  // Main trending detection methods
  async detectTrends(timeWindow: '1h' | '6h' | '24h' | '7d' = '24h'): Promise<TrendMetrics[]> {
    const windowMs = this.getTimeWindowMs(timeWindow);
    const cutoffTime = Date.now() - windowMs;

    // Get recent engagement data
    const recentEngagement = this.engagementHistory.filter(
      e => e.timestamp >= cutoffTime
    );

    // Group by topic/category
    const topicGroups = this.groupEngagementByTopic(recentEngagement);

    // Calculate trend metrics for each topic
    const trends: TrendMetrics[] = [];

    for (const [topic, engagements] of topicGroups.entries()) {
      const trendMetric = await this.calculateTrendMetrics(
        topic,
        engagements,
        timeWindow
      );

      if (trendMetric.score > this.getTrendThreshold(timeWindow)) {
        trends.push(trendMetric);
      }
    }

    // Sort by score and return top trends
    const sortedTrends = trends.sort((a, _b) => b.score - a.score);

    // Cache results
    if (this.kv) {
      await this.cacheTrends(sortedTrends, timeWindow);
    }

    return sortedTrends;
  }

  async predictViralContent(contentId: string): Promise<ViralPrediction> {
    const recentEngagement = this.getContentEngagement(contentId, 6 * 60 * 60 * 1000); // 6 hours

    if (recentEngagement.length === 0) {
      throw new Error('Insufficient data for viral prediction');
    }

    // Calculate viral factors
    const factors = this.calculateViralFactors(recentEngagement);

    // Current viral score
    const currentScore = this.calculateCurrentViralScore(recentEngagement);

    // Predict future viral score using growth patterns
    const predictedScore = await this.predictFutureViralScore(recentEngagement, factors);

    // Calculate confidence based on data quality and patterns
    const confidence = this.calculatePredictionConfidence(recentEngagement, factors);

    // Estimate time to viral threshold
    const timeToViral = this.estimateTimeToViral(recentEngagement, factors);

    // Generate recommendations
    const recommendations = this.generateViralRecommendations(factors);

    return { _contentId,
      currentScore,
      predictedScore,
      confidence,
      timeToViral,
      factors,
      recommendations
    };
  }

  async detectAnomalies(contentId?: string): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = Date.now() - windowMs;

    const recentEngagement = contentId
      ? this.getContentEngagement(contentId, windowMs)
      : this.engagementHistory.filter(e => e.timestamp >= cutoffTime);

    // Group by content
    const contentGroups = new Map<string, EngagementMetrics[]>();
    for (const engagement of recentEngagement) {
      const existing = contentGroups.get(engagement.contentId) || [];
      existing.push(engagement);
      contentGroups.set(engagement.contentId, existing);
    }

    // Analyze each content for anomalies
    for (const [cid, engagements] of contentGroups.entries()) {
      const contentAnomalies = await this.analyzeContentAnomalies(cid, engagements);
      anomalies.push(...contentAnomalies);
    }

    return anomalies.sort((a, _b) => b.confidence - a.confidence);
  }

  async addEngagementData(metrics: EngagementMetrics): Promise<void> {
    this.engagementHistory.push(metrics);

    // Update baseline metrics for anomaly detection
    await this.updateBaselines(metrics);

    // Trigger real-time trend detection if high engagement
    if (this.isHighEngagement(metrics)) {
      await this.triggerRealTimeTrendCheck(metrics);
    }

    // Clean old data
    this.cleanOldData();

    // Persist if storage available
    if (this.kv) {
      await this.persistEngagementData(metrics);
    }
  }

  async getTopicTrends(topic: string, timeWindow: '1h' | '6h' | '24h' | '7d' = '24h'): Promise<TrendMetrics | null> {
    const trends = await this.detectTrends(timeWindow);
    return trends.find(t => t.topic.toLowerCase() === topic.toLowerCase()) || null;
  }

  async getEmergingTopics(limit: number = 10): Promise<TrendMetrics[]> {
    // Look for topics with high acceleration (rapid growth)
    const trends = await this.detectTrends('6h');

    return trends
      .filter(t => t.acceleration > 0.5) // High acceleration threshold
      .sort((a, _b) => b.acceleration - a.acceleration)
      .slice(0, limit);
  }

  async getTrendingKeywords(timeWindow: '1h' | '6h' | '24h' | '7d' = '24h'): Promise<Array<{
    keyword: string;
    score: number;
    growth: number;
    contentCount: number;
  }>> {
    const trends = await this.detectTrends(timeWindow);
    const keywordMap = new Map<string, { score: number; growth: number; count: number }>();

    for (const trend of trends) {
      for (const keyword of trend.keywords) {
        const existing = keywordMap.get(keyword) || { score: 0, growth: 0, count: 0 };
        existing.score += trend.score;
        existing.growth += trend.velocity;
        existing.count += trend.contentIds.length;
        keywordMap.set(keyword, existing);
      }
    }

    return Array.from(keywordMap.entries())
      .map(([keyword, data]) => ({ _keyword,
        score: data.score,
        growth: data.growth,
        contentCount: data.count
      }))
      .sort((a, _b) => b.score - a.score);
  }

  // Implementation methods
  private getTimeWindowMs(timeWindow: string): number {
    const windows = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    return windows[timeWindow as keyof typeof windows] || windows['24h'];
  }

  private groupEngagementByTopic(engagements: EngagementMetrics[]): Map<string, EngagementMetrics[]> {
    const groups = new Map<string, EngagementMetrics[]>();

    for (const engagement of engagements) {
      // Extract topic from content ID or use platform as grouping
      const topic = this.extractTopic(engagement);

      const existing = groups.get(topic) || [];
      existing.push(engagement);
      groups.set(topic, existing);
    }

    return groups;
  }

  private extractTopic(engagement: EngagementMetrics): string {
    // Placeholder - in real implementation, would extract topic from content metadata
    return engagement.platform || 'general';
  }

  private async calculateTrendMetrics(
    topic: string,
    engagements: EngagementMetrics[],
    timeWindow: string
  ): Promise<TrendMetrics> {
    const totalEngagements = engagements.length;
    const totalVolume = engagements.reduce(
      (sum, _e) => sum + e.views + e.likes + e.shares + e.comments,
      0
    );

    // Calculate velocity (rate of growth)
    const velocity = this.calculateVelocity(engagements, timeWindow);

    // Calculate acceleration (change in velocity)
    const acceleration = this.calculateAcceleration(topic, velocity);

    // Calculate trend score
    const score = this.calculateTrendScore(velocity, acceleration, totalVolume, totalEngagements);

    // Analyze platforms
    const platforms = this.analyzePlatformDistribution(engagements);

    // Analyze sentiment (placeholder)
    const sentiment = this.analyzeSentiment(engagements);

    // Extract keywords (placeholder)
    const keywords = this.extractKeywords(topic);

    // Calculate sustainability
    const sustainabilityScore = this.calculateSustainabilityScore(engagements, velocity);

    return { _topic,
      contentIds: [...new Set(engagements.map(e => e.contentId))],
      category: this.categorizeContent(topic),
      score,
      velocity,
      acceleration,
      volume: totalVolume,
      timeWindow: timeWindow as unknown,
      platforms,
      sentiment,
      keywords,
      relatedTopics: [], // Would be populated by NLP analysis
      sustainabilityScore
    };
  }

  private calculateVelocity(engagements: EngagementMetrics[], timeWindow: string): number {
    if (engagements.length < 2) return 0;

    // Sort by timestamp
    const sorted = engagements.sort((a, _b) => a.timestamp - b.timestamp);

    // Calculate engagement rate over time
    const timeSpan = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
    const totalEngagement = sorted.reduce(
      (sum, _e) => sum + e.views + e.likes + e.shares + e.comments,
      0
    );

    // Velocity as engagement per hour
    return timeSpan > 0 ? (totalEngagement / timeSpan) * (60 * 60 * 1000) : 0;
  }

  private calculateAcceleration(topic: string, currentVelocity: number): number {
    const history = this.trendHistory.get(topic) || [];
    if (history.length === 0) return 0;

    const previousVelocity = history[history.length - 1].velocity;
    return currentVelocity - previousVelocity;
  }

  private calculateTrendScore(
    velocity: number,
    acceleration: number,
    volume: number,
    engagementCount: number
  ): number {
    // Weighted score combining multiple factors
    const velocityScore = Math.min(velocity / 1000, 1); // Normalize
    const accelerationScore = Math.max(Math.min(acceleration / 500, 1), 0);
    const volumeScore = Math.min(volume / 10000, 1);
    const engagementScore = Math.min(engagementCount / 100, 1);

    return (
      velocityScore * 0.3 +
      accelerationScore * 0.3 +
      volumeScore * 0.2 +
      engagementScore * 0.2
    );
  }

  private analyzePlatformDistribution(engagements: EngagementMetrics[]): Record<string, number> {
    const platforms: Record<string, number> = {};

    for (const engagement of engagements) {
      const platform = engagement.platform;
      platforms[platform] = (platforms[platform] || 0) + 1;
    }

    return platforms;
  }

  private analyzeSentiment(engagements: EngagementMetrics[]): 'positive' | 'neutral' | 'negative' {
    // Simplified sentiment analysis based on engagement patterns
    const avgLikes = engagements.reduce((sum, _e) => sum + e.likes, 0) / engagements.length;
    const avgShares = engagements.reduce((sum, _e) => sum + e.shares, 0) / engagements.length;
    const avgComments = engagements.reduce((sum, _e) => sum + e.comments, 0) / engagements.length;

    const positivityScore = (avgLikes + avgShares) / Math.max(avgComments, 1);

    if (positivityScore > 2) return 'positive';
    if (positivityScore < 0.5) return 'negative';
    return 'neutral';
  }

  private extractKeywords(topic: string): string[] {
    // Placeholder - would use NLP to extract keywords from content
    return topic.split(' ').filter(word => word.length > 3);
  }

  private calculateSustainabilityScore(
    engagements: EngagementMetrics[],
    velocity: number
  ): number {
    // Higher sustainability for consistent engagement over time
    if (engagements.length < 3) return 0.3;

    const timeSpan = Math.max(...engagements.map(e => e.timestamp)) -
                    Math.min(...engagements.map(e => e.timestamp));

    const consistency = this.calculateEngagementConsistency(engagements);
    const diversityScore = this.calculatePlatformDiversity(engagements);

    return Math.min(consistency * 0.6 + diversityScore * 0.4, 1.0);
  }

  private calculateEngagementConsistency(engagements: EngagementMetrics[]): number {
    const values = engagements.map(e => e.views + e.likes + e.shares + e.comments);
    const mean = values.reduce((sum, _v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, _v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation relative to mean indicates higher consistency
    return mean > 0 ? Math.max(1 - (stdDev / mean), 0) : 0;
  }

  private calculatePlatformDiversity(engagements: EngagementMetrics[]): number {
    const platforms = new Set(engagements.map(e => e.platform));
    return Math.min(platforms.size / 5, 1); // Normalize to max 5 platforms
  }

  private categorizeContent(topic: string): string {
    // Simple categorization - would use ML classifier in production
    const categories = {
      'technology': ['tech', 'ai', 'software', 'programming'],
      'entertainment': ['movie', 'music', 'game', 'celebrity'],
      'sports': ['football', 'basketball', 'soccer', 'olympics'],
      'news': ['politics', 'economy', 'world', 'breaking'],
      'lifestyle': ['fashion', 'food', 'travel', 'health']
    };

    const topicLower = topic.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => topicLower.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  private getTrendThreshold(timeWindow: string): number {
    const thresholds = {
      '1h': 0.7,
      '6h': 0.5,
      '24h': 0.3,
      '7d': 0.2
    };

    return thresholds[timeWindow as keyof typeof thresholds] || 0.3;
  }

  private getContentEngagement(contentId: string, windowMs: number): EngagementMetrics[] {
    const cutoffTime = Date.now() - windowMs;
    return this.engagementHistory.filter(
      e => e.contentId === contentId && e.timestamp >= cutoffTime
    );
  }

  private calculateViralFactors(engagements: EngagementMetrics[]): ViralPrediction['factors'] {
    const totalEngagements = engagements.length;
    const totalViews = engagements.reduce((sum, _e) => sum + e.views, 0);
    const totalShares = engagements.reduce((sum, _e) => sum + e.shares, 0);
    const totalComments = engagements.reduce((sum, _e) => sum + e.comments, 0);

    return {
      earlyEngagement: this.calculateEarlyEngagement(engagements),
      shareRate: totalViews > 0 ? totalShares / totalViews : 0,
      commentQuality: this.calculateCommentQuality(engagements),
      influencerAttention: this.calculateInfluencerAttention(engagements),
      timingScore: this.calculateTimingScore(engagements),
      contentQuality: this.calculateContentQuality(engagements)
    };
  }

  private calculateCurrentViralScore(engagements: EngagementMetrics[]): number {
    if (engagements.length === 0) return 0;

    const totalViews = engagements.reduce((sum, _e) => sum + e.views, 0);
    const totalEngagement = engagements.reduce(
      (sum, _e) => sum + e.likes + e.shares + e.comments,
      0
    );

    const engagementRate = totalViews > 0 ? totalEngagement / totalViews : 0;
    return Math.min(engagementRate * 10, 1.0);
  }

  private async predictFutureViralScore(
    engagements: EngagementMetrics[],
    factors: ViralPrediction['factors']
  ): Promise<number> {
    // Simple prediction model - would use ML in production
    const currentScore = this.calculateCurrentViralScore(engagements);
    const velocity = this.calculateVelocity(engagements, '6h');

    const growthPotential = (
      factors.earlyEngagement * 0.3 +
      factors.shareRate * 0.3 +
      factors.influencerAttention * 0.2 +
      factors.timingScore * 0.1 +
      factors.contentQuality * 0.1
    );

    return Math.min(currentScore + (growthPotential * 0.5), 1.0);
  }

  private calculatePredictionConfidence(
    engagements: EngagementMetrics[],
    factors: ViralPrediction['factors']
  ): number {
    // Confidence based on data quality and consistency
    const dataQuality = Math.min(engagements.length / 10, 1); // More data = higher confidence
    const factorConsistency = this.calculateFactorConsistency(factors);

    return dataQuality * 0.6 + factorConsistency * 0.4;
  }

  private estimateTimeToViral(
    engagements: EngagementMetrics[],
    factors: ViralPrediction['factors']
  ): number {
    const velocity = this.calculateVelocity(engagements, '1h');
    const viralThreshold = 0.8; // Threshold for viral status

    if (velocity <= 0) return -1; // Cannot estimate

    const currentScore = this.calculateCurrentViralScore(engagements);
    const scoreNeeded = viralThreshold - currentScore;

    if (scoreNeeded <= 0) return 0; // Already viral

    // Estimate based on current velocity
    return (scoreNeeded / velocity) * 60; // Convert to minutes
  }

  private generateViralRecommendations(factors: ViralPrediction['factors']): string[] {
    const recommendations: string[] = [];

    if (factors.shareRate < 0.05) {
      recommendations.push('Increase shareability with compelling visuals and calls-to-action');
    }

    if (factors.commentQuality < 0.3) {
      recommendations.push('Encourage meaningful discussions with thought-provoking questions');
    }

    if (factors.influencerAttention < 0.2) {
      recommendations.push('Reach out to relevant influencers and communities');
    }

    if (factors.timingScore < 0.4) {
      recommendations.push('Optimize posting time for maximum audience reach');
    }

    if (factors.contentQuality < 0.6) {
      recommendations.push('Improve content quality with better visuals, editing, or information');
    }

    return recommendations;
  }

  // Anomaly detection methods
  private async analyzeContentAnomalies(
    contentId: string,
    engagements: EngagementMetrics[]
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    const baseline = this.getBaseline(contentId);

    if (!baseline) return anomalies;

    // Check for sudden spikes
    const currentEngagement = this.calculateCurrentEngagement(engagements);
    const expectedEngagement = baseline.average;

    if (currentEngagement > expectedEngagement * 3) {
      anomalies.push({ _contentId,
        type: 'sudden_spike',
        severity: 'high',
        confidence: 0.8,
        description: 'Unusual spike in engagement detected',
        timestamp: Date.now(),
        metrics: {
          current: currentEngagement,
          expected: expectedEngagement,
          deviation: (currentEngagement - expectedEngagement) / expectedEngagement
        }
      });
    }

    // Check for unusual drops
    if (currentEngagement < expectedEngagement * 0.3) {
      anomalies.push({ _contentId,
        type: 'unusual_drop',
        severity: 'medium',
        confidence: 0.7,
        description: 'Significant drop in engagement detected',
        timestamp: Date.now(),
        metrics: {
          current: currentEngagement,
          expected: expectedEngagement,
          deviation: (expectedEngagement - currentEngagement) / expectedEngagement
        }
      });
    }

    return anomalies;
  }

  // Helper methods for viral prediction factors
  private calculateEarlyEngagement(engagements: EngagementMetrics[]): number {
    // First hour engagement rate
    const firstHour = engagements.filter(
      e => e.timestamp >= Date.now() - 60 * 60 * 1000
    );

    if (firstHour.length === 0) return 0;

    const totalViews = firstHour.reduce((sum, _e) => sum + e.views, 0);
    const totalEngagement = firstHour.reduce(
      (sum, _e) => sum + e.likes + e.shares + e.comments,
      0
    );

    return totalViews > 0 ? totalEngagement / totalViews : 0;
  }

  private calculateCommentQuality(engagements: EngagementMetrics[]): number {
    // Placeholder - would analyze comment content quality
    const avgComments = engagements.reduce((sum, _e) => sum + e.comments, 0) / engagements.length;
    return Math.min(avgComments / 10, 1);
  }

  private calculateInfluencerAttention(engagements: EngagementMetrics[]): number {
    // Placeholder - would track influencer interactions
    return Math.random() * 0.5; // Simplified for demo
  }

  private calculateTimingScore(engagements: EngagementMetrics[]): number {
    // Score based on optimal posting times
    const optimalHours = [9, 12, 15, 18, 21]; // Peak hours
    const postHour = new Date(engagements[0]?.timestamp || Date.now()).getHours();

    return optimalHours.includes(postHour) ? 0.8 : 0.4;
  }

  private calculateContentQuality(engagements: EngagementMetrics[]): number {
    // Quality based on engagement patterns
    const avgTimeSpent = engagements.reduce((sum, _e) => sum + e.timeSpent, 0) / engagements.length;
    const avgBounceRate = engagements.reduce((sum, _e) => sum + e.bounceRate, 0) / engagements.length;

    const timeScore = Math.min(avgTimeSpent / 60, 1); // Normalize to 1 minute
    const bounceScore = 1 - avgBounceRate;

    return (timeScore + bounceScore) / 2;
  }

  private calculateFactorConsistency(factors: ViralPrediction['factors']): number {
    const values = Object.values(factors);
    const mean = values.reduce((sum, _v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, _v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return 1 - Math.sqrt(variance); // Lower variance = higher consistency
  }

  private calculateCurrentEngagement(engagements: EngagementMetrics[]): number {
    return engagements.reduce(
      (sum, _e) => sum + e.views + e.likes + e.shares + e.comments,
      0
    );
  }

  private getBaseline(contentId: string): { average: number; variance: number } | null {
    const baseline = this.baselineMetrics.get(contentId);
    if (!baseline || baseline.length < 5) return null;

    const average = baseline.reduce((sum, _v) => sum + v, 0) / baseline.length;
    const variance = baseline.reduce((sum, _v) => sum + Math.pow(v - average, 2), 0) / baseline.length;

    return { _average, variance };
  }

  // Utility methods
  private async updateBaselines(metrics: EngagementMetrics): Promise<void> {
    const engagement = metrics.views + metrics.likes + metrics.shares + metrics.comments;
    const existing = this.baselineMetrics.get(metrics.contentId) || [];

    existing.push(engagement);

    // Keep only last 30 data points
    if (existing.length > 30) {
      existing.shift();
    }

    this.baselineMetrics.set(metrics.contentId, existing);
  }

  private isHighEngagement(metrics: EngagementMetrics): boolean {
    const totalEngagement = metrics.views + metrics.likes + metrics.shares + metrics.comments;
    return totalEngagement > 1000; // Threshold for high engagement
  }

  private async triggerRealTimeTrendCheck(metrics: EngagementMetrics): Promise<void> {
    // Placeholder for real-time trend detection
  }

  private cleanOldData(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.engagementHistory = this.engagementHistory.filter(e => e.timestamp >= cutoff);
  }

  private async persistEngagementData(metrics: EngagementMetrics): Promise<void> {
    if (!this.kv) return;

    const key = `engagement:${metrics.contentId}:${metrics.timestamp}`;
    await this.kv.put(key, JSON.stringify(metrics), {
      expirationTtl: 7 * 24 * 60 * 60 // 7 days
    });
  }

  private async cacheTrends(trends: TrendMetrics[], timeWindow: string): Promise<void> {
    if (!this.kv) return;

    const key = `trends:${timeWindow}:${Date.now()}`;
    await this.kv.put(key, JSON.stringify(trends), {
      expirationTtl: this.getTimeWindowMs(timeWindow) / 2 // Cache for half the window
    });
  }
}