import { ContentFeatures } from '../FeatureExtractor';
import { ViralPrediction, SocialPlatform } from '../ViralPredictionEngine';

export interface TwitterFeatures extends ContentFeatures {
  // Twitter-specific features
  thread_potential: number;
  retweet_likelihood: number;
  quote_tweet_appeal: number;
  trending_hashtag_alignment: number;
  character_efficiency: number;
  link_click_potential: number;
  reply_engagement_score: number;
  twitter_community_relevance: number;
  real_time_event_relevance: number;
  influencer_mention_score: number;
}

export interface TwitterMetrics {
  impressions: number;
  engagements: number;
  retweets: number;
  likes: number;
  replies: number;
  quotes: number;
  linkClicks: number;
  profileClicks: number;
  hashtagClicks: number;
  mediaViews: number;
  videoViews?: number;
  videoCompletionRate?: number;
}

export interface TwitterModelConfig {
  modelVersion: string;
  weights: {
    textFeatures: number;
    socialSignals: number;
    timing: number;
    engagement: number;
    virality: number;
  };
  thresholds: {
    viral: number; // 1M+ impressions
    trending: number; // 100K+ impressions
    popular: number; // 10K+ impressions
    moderate: number; // 1K+ impressions
  };
  contextFactors: {
    breakingNews: number;
    trendingTopics: number;
    influencerBoost: number;
    communityEngagement: number;
  };
}

export class TwitterModel {
  private config: TwitterModelConfig;
  private platform: SocialPlatform = 'twitter';

  constructor() {
    this.config = {
      modelVersion: '2.1.0',
      weights: {
        textFeatures: 0.25,
        socialSignals: 0.30,
        timing: 0.15,
        engagement: 0.20,
        virality: 0.10
      },
      thresholds: {
        viral: 95,
        trending: 80,
        popular: 65,
        moderate: 45
      },
      contextFactors: {
        breakingNews: 1.5,
        trendingTopics: 1.3,
        influencerBoost: 1.4,
        communityEngagement: 1.2
      }
    };
  }

  /**
   * Predict viral potential specifically for Twitter
   */
  async predict(features: ContentFeatures): Promise<{
    viralScore: number;
    confidence: number;
    predictions: TwitterMetrics;
    breakdown: {
      textScore: number;
      socialScore: number;
      timingScore: number;
      engagementScore: number;
      viralityScore: number;
    };
  }> {
    const twitterFeatures = await this.enhanceWithTwitterFeatures(features);

    // Calculate component scores
    const textScore = this.calculateTextScore(twitterFeatures);
    const socialScore = this.calculateSocialScore(twitterFeatures);
    const timingScore = this.calculateTimingScore(twitterFeatures);
    const engagementScore = this.calculateEngagementScore(twitterFeatures);
    const viralityScore = this.calculateViralityScore(twitterFeatures);

    // Weighted final score
    const rawScore =
      textScore * this.config.weights.textFeatures +
      socialScore * this.config.weights.socialSignals +
      timingScore * this.config.weights.timing +
      engagementScore * this.config.weights.engagement +
      viralityScore * this.config.weights.virality;

    // Apply context multipliers
    const contextMultiplier = this.calculateContextMultiplier(twitterFeatures);
    const finalScore = Math.min(100, rawScore * contextMultiplier);

    // Calculate confidence based on feature quality
    const confidence = this.calculateConfidence(twitterFeatures);

    // Predict engagement metrics
    const predictions = this.predictEngagementMetrics(twitterFeatures, finalScore);

    return {
      viralScore: finalScore,
      confidence,
      predictions,
      breakdown: {
        textScore,
        socialScore,
        timingScore,
        engagementScore,
        viralityScore
      }
    };
  }

  /**
   * Analyze tweet thread potential
   */
  async analyzeThreadPotential(tweets: string[]): Promise<{
    threadViralScore: number;
    individualScores: number[];
    optimalOrder: number[];
    recommendations: string[];
  }> {
    const individualScores: number[] = [];

    for (const tweet of tweets) {
      const features = await this.extractBasicFeatures(tweet);
      const prediction = await this.predict(features);
      individualScores.push(prediction.viralScore);
    }

    // Calculate thread cohesion score
    const threadCohesion = this.calculateThreadCohesion(tweets);

    // Thread viral score considers both individual strength and cohesion
    const threadViralScore = Math.min(100,
      (individualScores.reduce((sum, score) => sum + score, 0) / tweets.length) *
      (1 + threadCohesion * 0.3)
    );

    // Suggest optimal order (strongest tweets first and last)
    const optimalOrder = this.optimizeThreadOrder(individualScores);

    // Generate thread-specific recommendations
    const recommendations = this.generateThreadRecommendations(tweets, individualScores);

    return {
      threadViralScore,
      individualScores,
      optimalOrder,
      recommendations
    };
  }

  /**
   * Optimize tweet for maximum viral potential
   */
  async optimizeTweet(originalTweet: string): Promise<{
    optimizedTweet: string;
    improvements: string[];
    scoreImprovement: number;
    variants: {
      text: string;
      score: number;
      focus: string;
    }[];
  }> {
    const originalFeatures = await this.extractBasicFeatures(originalTweet);
    const originalPrediction = await this.predict(originalFeatures);

    // Generate optimized variants
    const variants = await this.generateOptimizedVariants(originalTweet);

    // Select best variant
    const bestVariant = variants.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // Generate improvement suggestions
    const improvements = this.generateOptimizationSuggestions(
      originalFeatures,
      await this.extractBasicFeatures(bestVariant.text)
    );

    return {
      optimizedTweet: bestVariant.text,
      improvements,
      scoreImprovement: bestVariant.score - originalPrediction.viralScore,
      variants
    };
  }

  /**
   * Predict optimal posting schedule
   */
  async predictOptimalSchedule(
    tweets: string[],
    timezone: string = 'UTC',
    duration: number = 7 // days
  ): Promise<{
    schedule: {
      tweet: string;
      optimalTime: Date;
      expectedEngagement: number;
      confidence: number;
    }[];
    overallStrategy: {
      peakHours: number[];
      avoidHours: number[];
      bestDays: string[];
      frequency: number; // tweets per day
    };
  }> {
    const schedule = [];
    const now = new Date();

    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      const features = await this.extractBasicFeatures(tweet);

      // Find optimal time for this specific tweet
      const optimalTime = await this.findOptimalPostingTime(features, now, duration);
      const prediction = await this.predict(features);

      schedule.push({
        tweet,
        optimalTime,
        expectedEngagement: this.estimateEngagement(prediction.viralScore),
        confidence: prediction.confidence
      });
    }

    // Generate overall strategy
    const overallStrategy = {
      peakHours: [9, 12, 15, 18], // EST peak hours for Twitter
      avoidHours: [2, 3, 4, 5, 6], // Low engagement hours
      bestDays: ['Tuesday', 'Wednesday', 'Thursday'], // Best days for engagement
      frequency: Math.min(5, tweets.length / duration) // Optimal posting frequency
    };

    return { schedule, overallStrategy };
  }

  /**
   * Analyze competitor performance and suggest improvements
   */
  async analyzeCompetitors(
    competitorTweets: string[],
    ourContent: string
  ): Promise<{
    competitorAnalysis: {
      averageScore: number;
      strongestElements: string[];
      weaknesses: string[];
      trendingStrategies: string[];
    };
    competitiveAdvantage: {
      ourScore: number;
      gaps: string[];
      opportunities: string[];
      recommendations: string[];
    };
  }> {
    // Analyze competitor tweets
    const competitorScores = [];
    const competitorFeatures = [];

    for (const tweet of competitorTweets) {
      const features = await this.extractBasicFeatures(tweet);
      const prediction = await this.predict(features);
      competitorScores.push(prediction.viralScore);
      competitorFeatures.push(features);
    }

    const averageCompetitorScore = competitorScores.reduce((sum, score) => sum + score, 0) / competitorScores.length;

    // Analyze our content
    const ourFeatures = await this.extractBasicFeatures(ourContent);
    const ourPrediction = await this.predict(ourFeatures);

    // Identify competitor strengths and weaknesses
    const competitorAnalysis = this.analyzeCompetitorPatterns(competitorFeatures, competitorScores);

    // Identify opportunities for improvement
    const competitiveAdvantage = this.identifyCompetitiveOpportunities(
      ourFeatures,
      ourPrediction.viralScore,
      competitorFeatures,
      averageCompetitorScore
    );

    return {
      competitorAnalysis: {
        averageScore: averageCompetitorScore,
        strongestElements: competitorAnalysis.strengths,
        weaknesses: competitorAnalysis.weaknesses,
        trendingStrategies: competitorAnalysis.strategies
      },
      competitiveAdvantage: {
        ourScore: ourPrediction.viralScore,
        gaps: competitiveAdvantage.gaps,
        opportunities: competitiveAdvantage.opportunities,
        recommendations: competitiveAdvantage.recommendations
      }
    };
  }

  // Private methods for Twitter-specific calculations

  private async enhanceWithTwitterFeatures(features: ContentFeatures): Promise<TwitterFeatures> {
    return {
      ...features,
      thread_potential: this.calculateThreadPotential(features),
      retweet_likelihood: this.calculateRetweetLikelihood(features),
      quote_tweet_appeal: this.calculateQuoteTweetAppeal(features),
      trending_hashtag_alignment: this.calculateTrendingHashtagAlignment(features),
      character_efficiency: this.calculateCharacterEfficiency(features),
      link_click_potential: this.calculateLinkClickPotential(features),
      reply_engagement_score: this.calculateReplyEngagementScore(features),
      twitter_community_relevance: this.calculateCommunityRelevance(features),
      real_time_event_relevance: this.calculateRealTimeEventRelevance(features),
      influencer_mention_score: this.calculateInfluencerMentionScore(features)
    };
  }

  private calculateTextScore(features: TwitterFeatures): number {
    let score = 50; // Base score

    // Length optimization (Twitter sweet spot: 71-100 characters)
    if (features.text_length >= 71 && features.text_length <= 100) {
      score += 20;
    } else if (features.text_length <= 140) {
      score += 10;
    }

    // Character efficiency
    score += features.character_efficiency * 15;

    // Readability
    score += (features.readability_score / 100) * 10;

    // Sentiment bonus
    if (features.sentiment_score > 0.2) {
      score += 5;
    }

    return Math.min(100, score);
  }

  private calculateSocialScore(features: TwitterFeatures): number {
    let score = 40; // Base score

    // Hashtag optimization (1-2 hashtags optimal for Twitter)
    if (features.hashtag_count === 1 || features.hashtag_count === 2) {
      score += 20;
    } else if (features.hashtag_count === 0) {
      score += 5; // Some penalty but not severe
    }

    // Trending hashtag alignment
    score += features.trending_hashtag_alignment * 25;

    // Mention strategy
    if (features.mention_count === 1) {
      score += 10; // One mention is good
    } else if (features.mention_count > 3) {
      score -= 5; // Too many mentions can hurt
    }

    // Influencer mention boost
    score += features.influencer_mention_score * 15;

    return Math.min(100, score);
  }

  private calculateTimingScore(features: TwitterFeatures): number {
    let score = features.optimal_timing_score * 60 + 20; // Base from timing features

    // Real-time event relevance boost
    score += features.real_time_event_relevance * 20;

    // Day of week and hour optimization
    score += features.day_of_week_score * 10;
    score += features.hour_of_day_score * 10;

    return Math.min(100, score);
  }

  private calculateEngagementScore(features: TwitterFeatures): number {
    let score = 30; // Base score

    // Call to action
    score += features.call_to_action_score * 20;

    // Question engagement
    score += features.question_count * 10;

    // Reply engagement potential
    score += features.reply_engagement_score * 25;

    // Emotional engagement
    score += features.emotion_scores * 15;

    // Controversy can drive engagement (but risky)
    score += features.controversy_score * 5;

    return Math.min(100, score);
  }

  private calculateViralityScore(features: TwitterFeatures): number {
    let score = 25; // Base score

    // Retweet likelihood
    score += features.retweet_likelihood * 30;

    // Quote tweet appeal
    score += features.quote_tweet_appeal * 20;

    // Thread potential
    score += features.thread_potential * 15;

    // Novelty factor
    score += features.novelty_score * 10;

    return Math.min(100, score);
  }

  private calculateContextMultiplier(features: TwitterFeatures): number {
    let multiplier = 1.0;

    // Breaking news boost
    if (features.real_time_event_relevance > 0.8) {
      multiplier *= this.config.contextFactors.breakingNews;
    }

    // Trending topics boost
    if (features.trending_topics_score > 0.6) {
      multiplier *= this.config.contextFactors.trendingTopics;
    }

    // Influencer mention boost
    if (features.influencer_mention_score > 0.7) {
      multiplier *= this.config.contextFactors.influencerBoost;
    }

    // Community relevance boost
    if (features.twitter_community_relevance > 0.8) {
      multiplier *= this.config.contextFactors.communityEngagement;
    }

    return Math.min(2.0, multiplier); // Cap at 2x boost
  }

  private calculateConfidence(features: TwitterFeatures): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence with more data points
    if (features.creator_influence_score !== undefined) confidence += 0.1;
    if (features.hashtag_count > 0) confidence += 0.1;
    if (features.trending_topics_score > 0.3) confidence += 0.15;
    if (features.optimal_timing_score > 0.7) confidence += 0.1;
    if (features.text_length > 20) confidence += 0.05; // Enough content to analyze

    return Math.min(0.95, confidence);
  }

  private predictEngagementMetrics(features: TwitterFeatures, viralScore: number): TwitterMetrics {
    // Base metrics scaled by viral score and follower count
    const baseImpressions = (features.creator_influence_score || 0.1) * 10000;
    const scoreMultiplier = viralScore / 50; // 50 is average score

    const impressions = Math.floor(baseImpressions * scoreMultiplier);
    const engagementRate = Math.min(0.1, (viralScore / 100) * 0.05); // 5% max engagement rate

    return {
      impressions,
      engagements: Math.floor(impressions * engagementRate),
      retweets: Math.floor(impressions * engagementRate * 0.2),
      likes: Math.floor(impressions * engagementRate * 0.6),
      replies: Math.floor(impressions * engagementRate * 0.15),
      quotes: Math.floor(impressions * engagementRate * 0.05),
      linkClicks: features.url_count > 0 ? Math.floor(impressions * 0.02) : 0,
      profileClicks: Math.floor(impressions * 0.01),
      hashtagClicks: features.hashtag_count > 0 ? Math.floor(impressions * 0.005) : 0,
      mediaViews: features.has_media ? Math.floor(impressions * 0.8) : 0,
      videoViews: features.media_count > 0 ? Math.floor(impressions * 0.7) : undefined,
      videoCompletionRate: features.has_media ? Math.min(1, viralScore / 200 + 0.3) : undefined
    };
  }

  // Twitter-specific feature calculations

  private calculateThreadPotential(features: ContentFeatures): number {
    let potential = 0.3; // Base potential

    if (features.text_length > 200) potential += 0.3; // Long content benefits from threading
    if (features.question_count > 0) potential += 0.2; // Questions invite continuation
    if (features.information_density > 0.7) potential += 0.2; // Dense info can be split

    return Math.min(1, potential);
  }

  private calculateRetweetLikelihood(features: ContentFeatures): number {
    let likelihood = 0.2; // Base likelihood

    likelihood += features.sentiment_score > 0 ? features.sentiment_score * 0.3 : 0;
    likelihood += features.emotion_scores * 0.3;
    likelihood += features.call_to_action_score * 0.2;
    likelihood += features.trending_topics_score * 0.3;

    return Math.min(1, likelihood);
  }

  private calculateQuoteTweetAppeal(features: ContentFeatures): number {
    let appeal = 0.15; // Base appeal

    appeal += features.controversy_score * 0.4; // Controversial content gets quoted
    appeal += features.novelty_score * 0.3; // Novel ideas get quoted
    appeal += features.question_count > 0 ? 0.2 : 0; // Questions invite quotes with answers
    appeal += features.entertainment_value * 0.1;

    return Math.min(1, appeal);
  }

  private calculateTrendingHashtagAlignment(features: ContentFeatures): number {
    // This would check against real trending hashtags
    // For now, use hashtag trending score as proxy
    return features.hashtag_trending_score || 0;
  }

  private calculateCharacterEfficiency(features: ContentFeatures): number {
    if (features.text_length === 0) return 0;

    // Efficiency = information density / character count
    const efficiency = features.information_density / (features.text_length / 100);
    return Math.min(1, efficiency);
  }

  private calculateLinkClickPotential(features: ContentFeatures): number {
    if (features.url_count === 0) return 0;

    let potential = 0.3; // Base potential for having a link

    potential += features.call_to_action_score * 0.4;
    potential += features.curiosity_score * 0.3; // Would need to implement curiosity detection

    return Math.min(1, potential);
  }

  private calculateReplyEngagementScore(features: ContentFeatures): number {
    let score = 0.2; // Base score

    score += features.question_count * 0.3;
    score += features.personal_connection_score * 0.2;
    score += features.controversy_score * 0.3;
    score += features.educational_value * 0.2;

    return Math.min(1, score);
  }

  private calculateCommunityRelevance(features: ContentFeatures): number {
    // This would analyze community-specific language and topics
    // For now, use a combination of factors
    let relevance = 0.4; // Base relevance

    relevance += features.trending_topics_score * 0.3;
    relevance += features.hashtag_count > 0 ? 0.2 : 0;
    relevance += features.mention_count > 0 ? 0.1 : 0;

    return Math.min(1, relevance);
  }

  private calculateRealTimeEventRelevance(features: ContentFeatures): number {
    // This would integrate with real-time event detection
    return features.current_events_relevance || 0;
  }

  private calculateInfluencerMentionScore(features: ContentFeatures): number {
    if (features.mention_count === 0) return 0;

    // This would check if mentions are of actual influencers
    // For now, assume some mentions are influential
    return Math.min(1, features.mention_count * 0.3);
  }

  // Helper methods for advanced features

  private async extractBasicFeatures(text: string): Promise<ContentFeatures> {
    // Basic feature extraction for text-only analysis
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    return {
      text_length: text.length,
      word_count: words.length,
      sentence_count: sentences.length,
      avg_word_length: words.reduce((sum, word) => sum + word.length, 0) / words.length,
      readability_score: 60, // Default
      sentiment_score: 0, // Would be calculated
      emotion_scores: 0.5, // Would be calculated
      emotional_intensity: 0.5,
      subjectivity_score: 0.5,
      exclamation_count: (text.match(/!/g) || []).length,
      question_count: (text.match(/\?/g) || []).length,
      caps_ratio: 0, // Would be calculated
      emoji_count: 0, // Would be calculated
      emoji_diversity: 0,
      hashtag_count: (text.match(/#\w+/g) || []).length,
      mention_count: (text.match(/@\w+/g) || []).length,
      url_count: (text.match(/https?:\/\/[^\s]+/g) || []).length,
      hashtag_trending_score: 0,
      mention_influence_score: 0,
      call_to_action_score: 0,
      urgency_score: 0,
      personal_connection_score: 0,
      controversy_score: 0,
      novelty_score: 0,
      platform_optimization_score: 0.7, // Default for Twitter
      optimal_length_score: 0,
      format_suitability_score: 0.8, // Default for Twitter
      trending_topics_score: 0,
      seasonality_score: 0,
      current_events_relevance: 0,
      competitive_landscape_score: 0,
      optimal_timing_score: 0.5,
      day_of_week_score: 0.7,
      hour_of_day_score: 0.6,
      time_zone_advantage: 0.5,
      has_media: false,
      media_count: 0,
      media_type_score: 0,
      media_quality_score: 0,
      media_trending_score: 0,
      uniqueness_score: 0.5,
      information_density: 0.6,
      entertainment_value: 0.3,
      educational_value: 0.2,
      inspirational_value: 0.2,
      toDict: function() {
        const dict: Record<string, unknown> = {};
        Object.keys(this).forEach(key => {
          if (key !== 'toDict' && typeof this[key] !== 'function') {
            dict[key] = this[key];
          }
        });
        return dict;
      }
    };
  }

  private calculateThreadCohesion(tweets: string[]): number {
    // Simplified cohesion calculation based on common themes
    let cohesion = 0.5; // Base cohesion

    // Check for consistent hashtags
    const allHashtags = tweets.flatMap(tweet => tweet.match(/#\w+/g) || []);
    const uniqueHashtags = new Set(allHashtags);
    if (uniqueHashtags.size > 0) {
      cohesion += (allHashtags.length / uniqueHashtags.size - 1) * 0.1;
    }

    // Check for thematic consistency (simplified)
    const allWords = tweets.join(' ').toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    allWords.forEach(word => {
      if (word.length > 4) { // Skip short words
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    const repeatedWords = Array.from(wordFreq.values()).filter(count => count > 1);
    cohesion += (repeatedWords.length / tweets.length) * 0.2;

    return Math.min(1, cohesion);
  }

  private optimizeThreadOrder(scores: number[]): number[] {
    // Optimal thread order: strongest first and last, weaker in middle
    const indexed = scores.map((score, index) => ({ score, index }));
    indexed.sort((a, b) => b.score - a.score);

    const optimalOrder: number[] = [];

    // Place strongest first
    optimalOrder.push(indexed[0].index);

    // Place weaker tweets in middle
    for (let i = indexed.length - 1; i >= 2; i--) {
      optimalOrder.push(indexed[i].index);
    }

    // Place second strongest last (if exists)
    if (indexed.length > 1) {
      optimalOrder.push(indexed[1].index);
    }

    return optimalOrder;
  }

  private generateThreadRecommendations(tweets: string[], scores: number[]): string[] {
    const recommendations: string[] = [];

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    if (avgScore < 60) {
      recommendations.push('Consider strengthening weaker tweets with more engaging content');
    }

    const weakTweets = scores.filter(score => score < avgScore - 10).length;
    if (weakTweets > tweets.length / 2) {
      recommendations.push('More than half the tweets are below average - consider rewriting');
    }

    if (tweets.length > 10) {
      recommendations.push('Consider breaking into multiple shorter threads for better engagement');
    }

    return recommendations;
  }

  private async generateOptimizedVariants(originalTweet: string): Promise<{
    text: string;
    score: number;
    focus: string;
  }[]> {
    // Generate variants focusing on different aspects
    const variants = [];

    // Engagement-focused variant
    const engagementVariant = await this.optimizeForEngagement(originalTweet);
    variants.push({
      text: engagementVariant,
      score: (await this.predict(await this.extractBasicFeatures(engagementVariant))).viralScore,
      focus: 'engagement'
    });

    // Viral-focused variant
    const viralVariant = await this.optimizeForVirality(originalTweet);
    variants.push({
      text: viralVariant,
      score: (await this.predict(await this.extractBasicFeatures(viralVariant))).viralScore,
      focus: 'virality'
    });

    // Clarity-focused variant
    const clarityVariant = await this.optimizeForClarity(originalTweet);
    variants.push({
      text: clarityVariant,
      score: (await this.predict(await this.extractBasicFeatures(clarityVariant))).viralScore,
      focus: 'clarity'
    });

    return variants;
  }

  private async optimizeForEngagement(tweet: string): Promise<string> {
    // Add question or call to action
    if (!tweet.includes('?')) {
      return tweet + ' What do you think?';
    }
    return tweet;
  }

  private async optimizeForVirality(tweet: string): Promise<string> {
    // Add trending elements or emotional language
    if (!tweet.includes('🔥') && tweet.length < 250) {
      return '🔥 ' + tweet;
    }
    return tweet;
  }

  private async optimizeForClarity(tweet: string): Promise<string> {
    // Simplify language and structure
    return tweet.replace(/,/g, '.').replace(/;/g, '.');
  }

  private generateOptimizationSuggestions(
    original: ContentFeatures,
    optimized: ContentFeatures
  ): string[] {
    const suggestions: string[] = [];

    if (optimized.hashtag_count > original.hashtag_count) {
      suggestions.push('Added relevant hashtags for better discoverability');
    }

    if (optimized.call_to_action_score > original.call_to_action_score) {
      suggestions.push('Included call-to-action to encourage engagement');
    }

    if (optimized.question_count > original.question_count) {
      suggestions.push('Added questions to stimulate replies');
    }

    return suggestions;
  }

  private async findOptimalPostingTime(
    features: ContentFeatures,
    baseDate: Date,
    duration: number
  ): Promise<Date> {
    // Find optimal time within the duration period
    const optimalHours = [9, 12, 15, 18]; // EST peak hours
    const baseHour = baseDate.getHours();

    const nextOptimalHour = optimalHours.find(hour => hour > baseHour) || optimalHours[0];

    const optimalTime = new Date(baseDate);
    optimalTime.setHours(nextOptimalHour, 0, 0, 0);

    if (optimalTime <= baseDate) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }

    return optimalTime;
  }

  private estimateEngagement(viralScore: number): number {
    // Estimate engagement based on viral score
    return Math.min(10000, viralScore * 100);
  }

  private analyzeCompetitorPatterns(
    features: ContentFeatures[],
    scores: number[]
  ): {
    strengths: string[];
    weaknesses: string[];
    strategies: string[];
  } {
    // Analyze what makes competitors successful
    const highPerformers = features.filter((_, i) => scores[i] > 70);

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const strategies: string[] = [];

    // Analyze high performer patterns
    if (highPerformers.length > 0) {
      const avgHashtags = highPerformers.reduce((sum, f) => sum + f.hashtag_count, 0) / highPerformers.length;
      if (avgHashtags > 2) {
        strengths.push('Effective hashtag usage');
        strategies.push('Use 2-3 relevant hashtags per tweet');
      }

      const avgCTA = highPerformers.reduce((sum, f) => sum + f.call_to_action_score, 0) / highPerformers.length;
      if (avgCTA > 0.5) {
        strengths.push('Strong call-to-action presence');
        strategies.push('Include clear calls-to-action in tweets');
      }
    }

    return { strengths, weaknesses, strategies };
  }

  private identifyCompetitiveOpportunities(
    ourFeatures: ContentFeatures,
    ourScore: number,
    competitorFeatures: ContentFeatures[],
    competitorAvg: number
  ): {
    gaps: string[];
    opportunities: string[];
    recommendations: string[];
  } {
    const gaps: string[] = [];
    const opportunities: string[] = [];
    const recommendations: string[] = [];

    // Identify areas where we're behind
    const avgCompetitorHashtags = competitorFeatures.reduce((sum, f) => sum + f.hashtag_count, 0) / competitorFeatures.length;
    if (ourFeatures.hashtag_count < avgCompetitorHashtags) {
      gaps.push('Hashtag usage below competitor average');
      recommendations.push(`Increase hashtag usage to ${Math.ceil(avgCompetitorHashtags)} per tweet`);
    }

    // Identify opportunities where competitors are weak
    const avgCompetitorCTA = competitorFeatures.reduce((sum, f) => sum + f.call_to_action_score, 0) / competitorFeatures.length;
    if (avgCompetitorCTA < 0.3) {
      opportunities.push('Competitors have weak call-to-action strategy');
      recommendations.push('Leverage strong calls-to-action for competitive advantage');
    }

    return { gaps, opportunities, recommendations };
  }
}