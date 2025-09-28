import { ContentFeatures } from '../FeatureExtractor';
import { ViralPrediction, SocialPlatform } from '../ViralPredictionEngine';

export interface TikTokFeatures extends ContentFeatures {
  // TikTok-specific features
  video_quality_score: number;
  audio_engagement_score: number;
  visual_appeal_score: number;
  trend_alignment_score: number;
  dance_potential: number;
  challenge_participation: number;
  fyp_optimization_score: number;
  duet_potential: number;
  stitch_potential: number;
  watch_time_prediction: number;
  completion_rate_prediction: number;
  share_likelihood: number;
  algorithm_friendliness: number;
  generation_appeal: {
    genZ: number;
    genAlpha: number;
    millennial: number;
  };
}

export interface TikTokMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  saves: number;
  duets: number;
  stitches: number;
  watchTime: number; // seconds
  completionRate: number; // 0-1
  engagementRate: number;
  viralVelocity: number; // views per hour in first 24h
  fypProbability: number; // probability of FYP feature
  trendingPotential: number;
}

export interface TikTokModelConfig {
  modelVersion: string;
  weights: {
    visualContent: number;
    audioContent: number;
    textContent: number;
    trendAlignment: number;
    engagement: number;
    timing: number;
    creator: number;
  };
  thresholds: {
    viral: number; // 1M+ views
    trending: number; // 100K+ views
    popular: number; // 10K+ views
    moderate: number; // 1K+ views
  };
  algorithmFactors: {
    completionRate: number;
    engagement: number;
    shareRate: number;
    watchTime: number;
    trendParticipation: number;
  };
}

export class TikTokModel {
  private config: TikTokModelConfig;
  private platform: SocialPlatform = 'tiktok';

  constructor() {
    this.config = {
      modelVersion: '3.0.0',
      weights: {
        visualContent: 0.30,
        audioContent: 0.25,
        textContent: 0.15,
        trendAlignment: 0.15,
        engagement: 0.10,
        timing: 0.03,
        creator: 0.02
      },
      thresholds: {
        viral: 95,
        trending: 85,
        popular: 70,
        moderate: 50
      },
      algorithmFactors: {
        completionRate: 0.35,
        engagement: 0.25,
        shareRate: 0.20,
        watchTime: 0.15,
        trendParticipation: 0.05
      }
    };
  }

  /**
   * Predict viral potential specifically for TikTok
   */
  async predict(features: ContentFeatures, videoMetadata?: {
    duration: number;
    hasAudio: boolean;
    audioType: 'original' | 'trending' | 'custom';
    visualElements: string[];
    effects: string[];
  }): Promise<{
    viralScore: number;
    confidence: number;
    predictions: TikTokMetrics;
    breakdown: {
      visualScore: number;
      audioScore: number;
      textScore: number;
      trendScore: number;
      engagementScore: number;
      timingScore: number;
      creatorScore: number;
    };
    fypRecommendations: string[];
  }> {
    const tiktokFeatures = await this.enhanceWithTikTokFeatures(features, videoMetadata);

    // Calculate component scores
    const visualScore = this.calculateVisualScore(tiktokFeatures, videoMetadata);
    const audioScore = this.calculateAudioScore(tiktokFeatures, videoMetadata);
    const textScore = this.calculateTextScore(tiktokFeatures);
    const trendScore = this.calculateTrendScore(tiktokFeatures);
    const engagementScore = this.calculateEngagementScore(tiktokFeatures);
    const timingScore = this.calculateTimingScore(tiktokFeatures);
    const creatorScore = this.calculateCreatorScore(tiktokFeatures);

    // Weighted final score
    const rawScore =
      visualScore * this.config.weights.visualContent +
      audioScore * this.config.weights.audioContent +
      textScore * this.config.weights.textContent +
      trendScore * this.config.weights.trendAlignment +
      engagementScore * this.config.weights.engagement +
      timingScore * this.config.weights.timing +
      creatorScore * this.config.weights.creator;

    // Apply TikTok algorithm boost
    const algorithmBoost = this.calculateAlgorithmBoost(tiktokFeatures);
    const finalScore = Math.min(100, rawScore * algorithmBoost);

    // Calculate confidence
    const confidence = this.calculateConfidence(tiktokFeatures, videoMetadata);

    // Predict engagement metrics
    const predictions = this.predictEngagementMetrics(tiktokFeatures, finalScore, videoMetadata);

    // Generate FYP optimization recommendations
    const fypRecommendations = this.generateFYPRecommendations(tiktokFeatures, videoMetadata);

    return {
      viralScore: finalScore,
      confidence,
      predictions,
      breakdown: {
        visualScore,
        audioScore,
        textScore,
        trendScore,
        engagementScore,
        timingScore,
        creatorScore
      },
      fypRecommendations
    };
  }

  /**
   * Analyze trending content and suggest participation strategies
   */
  async analyzeTrends(): Promise<{
    currentTrends: {
      hashtags: { tag: string; momentum: number; difficulty: number }[];
      sounds: { id: string; name: string; viralPotential: number; usageCount: number }[];
      effects: { name: string; popularity: number; easyToUse: boolean }[];
      challenges: { name: string; participation: number; originality: number }[];
    };
    recommendations: {
      easyWins: string[];
      growthOpportunities: string[];
      avoidThese: string[];
      timingSuggestions: string[];
    };
  }> {
    // This would integrate with TikTok's API in production
    const currentTrends = {
      hashtags: [
        { tag: '#fyp', momentum: 0.9, difficulty: 0.1 },
        { tag: '#viral', momentum: 0.85, difficulty: 0.2 },
        { tag: '#trending', momentum: 0.8, difficulty: 0.15 },
        { tag: '#foryou', momentum: 0.75, difficulty: 0.1 },
        { tag: '#challenge', momentum: 0.7, difficulty: 0.3 }
      ],
      sounds: [
        { id: 'sound_1', name: 'Viral Beat Drop', viralPotential: 0.9, usageCount: 500000 },
        { id: 'sound_2', name: 'Trending Voice', viralPotential: 0.85, usageCount: 250000 },
        { id: 'sound_3', name: 'Dance Track', viralPotential: 0.8, usageCount: 750000 }
      ],
      effects: [
        { name: 'Green Screen', popularity: 0.9, easyToUse: true },
        { name: 'Time Warp', popularity: 0.85, easyToUse: false },
        { name: 'Beauty Filter', popularity: 0.8, easyToUse: true }
      ],
      challenges: [
        { name: 'Dance Challenge', participation: 0.9, originality: 0.3 },
        { name: 'Transformation Challenge', participation: 0.7, originality: 0.6 },
        { name: 'Educational Challenge', participation: 0.5, originality: 0.8 }
      ]
    };

    const recommendations = {
      easyWins: [
        'Use #fyp and #foryou hashtags for basic discoverability',
        'Apply popular, easy-to-use effects like Green Screen',
        'Post during peak hours (6-10 PM)'
      ],
      growthOpportunities: [
        'Participate in Transformation Challenge for higher originality',
        'Create content with Viral Beat Drop sound',
        'Experiment with Educational Challenge format'
      ],
      avoidThese: [
        'Avoid overused sounds with 1M+ uses unless adding unique twist',
        'Skip complex effects if not confident in execution',
        'Don\'t force participation in declining trends'
      ],
      timingSuggestions: [
        'Post new challenge content on Tuesday-Thursday',
        'Use trending sounds within 48 hours of discovery',
        'Time uploads for 6-10 PM in target audience timezone'
      ]
    };

    return { currentTrends, recommendations };
  }

  /**
   * Optimize video for TikTok algorithm
   */
  async optimizeForAlgorithm(
    content: {
      text: string;
      duration: number;
      hasAudio: boolean;
      visualElements: string[];
    }
  ): Promise<{
    optimizedContent: {
      text: string;
      recommendedDuration: number;
      suggestedAudio: string[];
      recommendedEffects: string[];
      hashtagStrategy: string[];
    };
    algorithmScore: number;
    improvements: string[];
  }> {
    const features = await this.extractBasicFeatures(content.text);
    const tiktokFeatures = await this.enhanceWithTikTokFeatures(features, {
      duration: content.duration,
      hasAudio: content.hasAudio,
      audioType: 'custom',
      visualElements: content.visualElements,
      effects: []
    });

    // Optimize each component
    const textOptimization = this.optimizeText(content.text);
    const durationOptimization = this.optimizeDuration(content.duration);
    const audioOptimization = this.optimizeAudio(content.hasAudio);
    const hashtagOptimization = this.optimizeHashtags(features);

    const algorithmScore = this.calculateAlgorithmBoost(tiktokFeatures) * 100;

    return {
      optimizedContent: {
        text: textOptimization.optimizedText,
        recommendedDuration: durationOptimization.optimalDuration,
        suggestedAudio: audioOptimization.suggestions,
        recommendedEffects: ['Trending Filter', 'Engagement Boost', 'FYP Optimizer'],
        hashtagStrategy: hashtagOptimization.strategy
      },
      algorithmScore,
      improvements: [
        ...textOptimization.improvements,
        ...durationOptimization.improvements,
        ...audioOptimization.improvements,
        ...hashtagOptimization.improvements
      ]
    };
  }

  /**
   * Predict generation-specific appeal
   */
  async analyzeGenerationAppeal(
    features: ContentFeatures,
    videoMetadata?: any
  ): Promise<{
    genZ: { score: number; reasons: string[] };
    genAlpha: { score: number; reasons: string[] };
    millennial: { score: number; reasons: string[] };
    overall: { primaryAudience: string; crossGenerationalAppeal: number };
  }> {
    const tiktokFeatures = await this.enhanceWithTikTokFeatures(features, videoMetadata);

    const genZ = this.calculateGenZAppeal(tiktokFeatures);
    const genAlpha = this.calculateGenAlphaAppeal(tiktokFeatures);
    const millennial = this.calculateMillennialAppeal(tiktokFeatures);

    const scores = { genZ: genZ.score, genAlpha: genAlpha.score, millennial: millennial.score };
    const primaryAudience = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
    const crossGenerationalAppeal = Object.values(scores).reduce((sum, score) => sum + score, 0) / 3;

    return {
      genZ,
      genAlpha,
      millennial,
      overall: {
        primaryAudience,
        crossGenerationalAppeal
      }
    };
  }

  /**
   * Predict optimal posting schedule for TikTok
   */
  async predictOptimalSchedule(
    videos: string[],
    targetAudience: 'genZ' | 'genAlpha' | 'millennial' | 'all',
    duration: number = 7
  ): Promise<{
    schedule: {
      video: string;
      optimalTime: Date;
      expectedViews: number;
      fypProbability: number;
    }[];
    strategy: {
      postingFrequency: number; // posts per day
      bestHours: number[];
      bestDays: string[];
      audienceActiveTime: string;
    };
  }> {
    const schedule = [];
    const now = new Date();

    // TikTok optimal posting times by audience
    const audienceOptimalHours = {
      genZ: [16, 18, 20, 22], // After school/work
      genAlpha: [15, 17, 19], // After school
      millennial: [18, 20, 21], // Evening after work
      all: [18, 20, 22] // General peak times
    };

    const optimalHours = audienceOptimalHours[targetAudience];

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const features = await this.extractBasicFeatures(video);
      const prediction = await this.predict(features);

      const optimalTime = this.findNextOptimalTime(now, optimalHours, i);

      schedule.push({
        video,
        optimalTime,
        expectedViews: prediction.predictions.views,
        fypProbability: prediction.predictions.fypProbability
      });
    }

    const strategy = {
      postingFrequency: Math.min(3, videos.length / duration), // Max 3 posts per day
      bestHours: optimalHours,
      bestDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      audienceActiveTime: this.getAudienceActiveTime(targetAudience)
    };

    return { schedule, strategy };
  }

  // Private methods for TikTok-specific calculations

  private async enhanceWithTikTokFeatures(
    features: ContentFeatures,
    videoMetadata?: any
  ): Promise<TikTokFeatures> {
    return {
      ...features,
      video_quality_score: this.calculateVideoQualityScore(videoMetadata),
      audio_engagement_score: this.calculateAudioEngagementScore(videoMetadata),
      visual_appeal_score: this.calculateVisualAppealScore(features, videoMetadata),
      trend_alignment_score: this.calculateTrendAlignmentScore(features),
      dance_potential: this.calculateDancePotential(features, videoMetadata),
      challenge_participation: this.calculateChallengeParticipation(features),
      fyp_optimization_score: this.calculateFYPOptimizationScore(features),
      duet_potential: this.calculateDuetPotential(features),
      stitch_potential: this.calculateStitchPotential(features),
      watch_time_prediction: this.predictWatchTime(features, videoMetadata),
      completion_rate_prediction: this.predictCompletionRate(features, videoMetadata),
      share_likelihood: this.calculateShareLikelihood(features),
      algorithm_friendliness: this.calculateAlgorithmFriendliness(features, videoMetadata),
      generation_appeal: {
        genZ: this.calculateGenZScore(features),
        genAlpha: this.calculateGenAlphaScore(features),
        millennial: this.calculateMillennialScore(features)
      }
    };
  }

  private calculateVisualScore(features: TikTokFeatures, videoMetadata?: any): number {
    let score = 40; // Base score

    // Video quality
    score += features.video_quality_score * 30;

    // Visual appeal
    score += features.visual_appeal_score * 20;

    // Effects usage
    if (videoMetadata?.effects && videoMetadata.effects.length > 0) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private calculateAudioScore(features: TikTokFeatures, videoMetadata?: any): number {
    let score = 30; // Base score

    // Audio engagement
    score += features.audio_engagement_score * 40;

    // Trending audio bonus
    if (videoMetadata?.audioType === 'trending') {
      score += 20;
    } else if (videoMetadata?.audioType === 'original') {
      score += 10; // Original audio gets some credit
    }

    // Audio presence
    if (videoMetadata?.hasAudio) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private calculateTextScore(features: TikTokFeatures): number {
    let score = 20; // Base score (text less important on TikTok)

    // Optimal text length for TikTok (short and punchy)
    if (features.text_length >= 20 && features.text_length <= 100) {
      score += 30;
    } else if (features.text_length <= 150) {
      score += 20;
    }

    // Engagement elements
    score += features.call_to_action_score * 15;
    score += features.emotion_scores * 20;
    score += features.question_count * 10;

    // Hashtag strategy (TikTok allows more hashtags)
    if (features.hashtag_count >= 3 && features.hashtag_count <= 8) {
      score += 15;
    }

    return Math.min(100, score);
  }

  private calculateTrendScore(features: TikTokFeatures): number {
    let score = 20; // Base score

    // Trend alignment
    score += features.trend_alignment_score * 30;

    // Challenge participation
    score += features.challenge_participation * 25;

    // Dance potential
    score += features.dance_potential * 15;

    // Trending topics
    score += features.trending_topics_score * 10;

    return Math.min(100, score);
  }

  private calculateEngagementScore(features: TikTokFeatures): number {
    let score = 30; // Base score

    // Duet and stitch potential
    score += features.duet_potential * 20;
    score += features.stitch_potential * 15;

    // Share likelihood
    score += features.share_likelihood * 20;

    // Emotional engagement
    score += features.emotion_scores * 15;

    return Math.min(100, score);
  }

  private calculateTimingScore(features: TikTokFeatures): number {
    let score = features.optimal_timing_score * 70 + 15; // Base from timing features

    // Generation-specific timing bonus
    const maxGenerationAppeal = Math.max(
      features.generation_appeal.genZ,
      features.generation_appeal.genAlpha,
      features.generation_appeal.millennial
    );
    score += maxGenerationAppeal * 15;

    return Math.min(100, score);
  }

  private calculateCreatorScore(features: TikTokFeatures): number {
    let score = 40; // Base score

    if (features.creator_influence_score !== undefined) {
      score += features.creator_influence_score * 30;
    }

    if (features.creator_niche_alignment !== undefined) {
      score += features.creator_niche_alignment * 20;
    }

    if (features.creator_engagement_history !== undefined) {
      score += features.creator_engagement_history * 10;
    }

    return Math.min(100, score);
  }

  private calculateAlgorithmBoost(features: TikTokFeatures): number {
    let boost = 1.0;

    // Completion rate is crucial for TikTok
    boost += (features.completion_rate_prediction - 0.5) * this.config.algorithmFactors.completionRate;

    // FYP optimization
    boost += features.fyp_optimization_score * 0.2;

    // Algorithm friendliness
    boost += features.algorithm_friendliness * 0.15;

    // Watch time prediction
    boost += (features.watch_time_prediction / 30) * 0.1; // 30 seconds as baseline

    return Math.max(0.5, Math.min(2.0, boost));
  }

  private calculateConfidence(features: TikTokFeatures, videoMetadata?: any): number {
    let confidence = 0.6; // Base confidence

    // Video metadata available
    if (videoMetadata) confidence += 0.15;

    // Creator data available
    if (features.creator_influence_score !== undefined) confidence += 0.1;

    // Audio data available
    if (videoMetadata?.hasAudio) confidence += 0.1;

    // Trend data available
    if (features.trend_alignment_score > 0.3) confidence += 0.05;

    return Math.min(0.95, confidence);
  }

  private predictEngagementMetrics(
    features: TikTokFeatures,
    viralScore: number,
    videoMetadata?: any
  ): TikTokMetrics {
    const baseViews = (features.creator_influence_score || 0.1) * 50000;
    const scoreMultiplier = viralScore / 50;
    const views = Math.floor(baseViews * scoreMultiplier);

    const engagementRate = Math.min(0.15, (viralScore / 100) * 0.1); // 10% max for TikTok

    return {
      views,
      likes: Math.floor(views * engagementRate * 0.6),
      shares: Math.floor(views * engagementRate * 0.15),
      comments: Math.floor(views * engagementRate * 0.2),
      saves: Math.floor(views * engagementRate * 0.05),
      duets: Math.floor(views * features.duet_potential * 0.02),
      stitches: Math.floor(views * features.stitch_potential * 0.01),
      watchTime: features.watch_time_prediction,
      completionRate: features.completion_rate_prediction,
      engagementRate,
      viralVelocity: views / 24, // views per hour in first day
      fypProbability: Math.min(0.3, features.fyp_optimization_score),
      trendingPotential: viralScore / 100
    };
  }

  // TikTok-specific feature calculations

  private calculateVideoQualityScore(videoMetadata?: any): number {
    if (!videoMetadata) return 0.5;

    let score = 0.5; // Base score

    // Duration optimization (15-60 seconds optimal)
    if (videoMetadata.duration >= 15 && videoMetadata.duration <= 60) {
      score += 0.3;
    } else if (videoMetadata.duration <= 15) {
      score += 0.2; // Short form is okay
    }

    // Visual elements
    if (videoMetadata.visualElements && videoMetadata.visualElements.length > 0) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  private calculateAudioEngagementScore(videoMetadata?: any): number {
    if (!videoMetadata?.hasAudio) return 0.2;

    let score = 0.5; // Base for having audio

    // Trending audio gets higher score
    if (videoMetadata.audioType === 'trending') {
      score += 0.4;
    } else if (videoMetadata.audioType === 'original') {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  private calculateVisualAppealScore(features: ContentFeatures, videoMetadata?: any): number {
    let score = 0.4; // Base score

    // Media presence
    if (features.has_media) {
      score += 0.3;
    }

    // Visual effects
    if (videoMetadata?.effects && videoMetadata.effects.length > 0) {
      score += 0.2;
    }

    // Entertainment value
    score += features.entertainment_value * 0.1;

    return Math.min(1, score);
  }

  private calculateTrendAlignmentScore(features: ContentFeatures): number {
    return features.trending_topics_score || 0.3; // Default moderate alignment
  }

  private calculateDancePotential(features: ContentFeatures, videoMetadata?: any): number {
    let potential = 0.2; // Base potential

    // Check for dance-related keywords
    const danceKeywords = ['dance', 'move', 'rhythm', 'beat', 'choreography'];
    const text = features.text_length > 0 ? 'placeholder_text' : ''; // Would use actual text
    const danceCount = danceKeywords.filter(keyword => text.toLowerCase().includes(keyword)).length;

    potential += (danceCount / danceKeywords.length) * 0.5;

    // Audio type bonus
    if (videoMetadata?.audioType === 'trending') {
      potential += 0.3;
    }

    return Math.min(1, potential);
  }

  private calculateChallengeParticipation(features: ContentFeatures): number {
    let participation = 0.2; // Base participation

    // Challenge hashtags
    if (features.hashtag_count > 0) {
      participation += 0.3;
    }

    // Trending participation
    participation += features.trending_topics_score * 0.5;

    return Math.min(1, participation);
  }

  private calculateFYPOptimizationScore(features: ContentFeatures): number {
    let score = 0.3; // Base score

    // Key FYP factors
    score += features.emotion_scores * 0.2;
    score += features.call_to_action_score * 0.15;
    score += features.trending_topics_score * 0.25;
    score += (features.hashtag_count / 10) * 0.1; // Normalize hashtag count

    return Math.min(1, score);
  }

  private calculateDuetPotential(features: ContentFeatures): number {
    let potential = 0.25; // Base potential

    // Educational content is great for duets
    potential += features.educational_value * 0.3;

    // Question format encourages duets
    potential += features.question_count * 0.2;

    // Controversial content gets dueted
    potential += features.controversy_score * 0.25;

    return Math.min(1, potential);
  }

  private calculateStitchPotential(features: ContentFeatures): number {
    let potential = 0.2; // Base potential

    // Informational content gets stitched
    potential += features.information_density * 0.3;

    // Educational value
    potential += features.educational_value * 0.25;

    // Novelty factor
    potential += features.novelty_score * 0.25;

    return Math.min(1, potential);
  }

  private predictWatchTime(features: ContentFeatures, videoMetadata?: any): number {
    if (!videoMetadata?.duration) return 15; // Default 15 seconds

    let watchTime = videoMetadata.duration * 0.7; // Base 70% watch time

    // Entertainment value increases watch time
    watchTime += features.entertainment_value * 5;

    // Educational value increases watch time
    watchTime += features.educational_value * 3;

    return Math.min(videoMetadata.duration, watchTime);
  }

  private predictCompletionRate(features: ContentFeatures, videoMetadata?: any): number {
    let completionRate = 0.6; // Base 60% completion

    // Entertainment factor
    completionRate += features.entertainment_value * 0.2;

    // Optimal length bonus
    if (videoMetadata?.duration && videoMetadata.duration <= 30) {
      completionRate += 0.1;
    }

    // Emotional engagement
    completionRate += features.emotion_scores * 0.1;

    return Math.min(0.95, completionRate);
  }

  private calculateShareLikelihood(features: ContentFeatures): number {
    let likelihood = 0.15; // Base likelihood

    likelihood += features.entertainment_value * 0.3;
    likelihood += features.emotion_scores * 0.25;
    likelihood += features.novelty_score * 0.2;
    likelihood += features.inspirational_value * 0.1;

    return Math.min(1, likelihood);
  }

  private calculateAlgorithmFriendliness(features: ContentFeatures, videoMetadata?: any): number {
    let friendliness = 0.5; // Base friendliness

    // Completion rate friendly
    if (videoMetadata?.duration && videoMetadata.duration <= 60) {
      friendliness += 0.2;
    }

    // Engagement friendly
    friendliness += features.call_to_action_score * 0.15;

    // Trend friendly
    friendliness += features.trending_topics_score * 0.15;

    return Math.min(1, friendliness);
  }

  // Generation-specific calculations

  private calculateGenZScore(features: ContentFeatures): number {
    let score = 0.4; // Base appeal

    score += features.entertainment_value * 0.25;
    score += features.emotion_scores * 0.2;
    score += features.trending_topics_score * 0.15;

    return Math.min(1, score);
  }

  private calculateGenAlphaScore(features: ContentFeatures): number {
    let score = 0.3; // Base appeal

    score += features.entertainment_value * 0.3;
    score += features.novelty_score * 0.25;
    score += features.media_trending_score * 0.15;

    return Math.min(1, score);
  }

  private calculateMillennialScore(features: ContentFeatures): number {
    let score = 0.35; // Base appeal

    score += features.educational_value * 0.25;
    score += features.inspirational_value * 0.2;
    score += features.information_density * 0.2;

    return Math.min(1, score);
  }

  private calculateGenZAppeal(features: TikTokFeatures): { score: number; reasons: string[] } {
    const score = features.generation_appeal.genZ;
    const reasons: string[] = [];

    if (features.entertainment_value > 0.7) reasons.push('High entertainment value appeals to Gen Z');
    if (features.trending_topics_score > 0.6) reasons.push('Strong trend alignment resonates with Gen Z');
    if (features.emotion_scores > 0.6) reasons.push('Emotional content connects with Gen Z');

    return { score, reasons };
  }

  private calculateGenAlphaAppeal(features: TikTokFeatures): { score: number; reasons: string[] } {
    const score = features.generation_appeal.genAlpha;
    const reasons: string[] = [];

    if (features.novelty_score > 0.7) reasons.push('Novel content captures Gen Alpha attention');
    if (features.visual_appeal_score > 0.8) reasons.push('Strong visual appeal attracts Gen Alpha');
    if (features.dance_potential > 0.6) reasons.push('Dance elements appeal to Gen Alpha');

    return { score, reasons };
  }

  private calculateMillennialAppeal(features: TikTokFeatures): { score: number; reasons: string[] } {
    const score = features.generation_appeal.millennial;
    const reasons: string[] = [];

    if (features.educational_value > 0.6) reasons.push('Educational content appeals to millennials');
    if (features.inspirational_value > 0.5) reasons.push('Inspirational messaging resonates with millennials');
    if (features.information_density > 0.7) reasons.push('Information-rich content valued by millennials');

    return { score, reasons };
  }

  // Optimization methods

  private optimizeText(text: string): { optimizedText: string; improvements: string[] } {
    let optimizedText = text;
    const improvements: string[] = [];

    // Add hook if missing
    if (!text.startsWith('POV') && !text.includes('🔥') && text.length > 20) {
      optimizedText = '🔥 ' + optimizedText;
      improvements.push('Added attention-grabbing emoji');
    }

    // Add call to action if missing
    if (!text.includes('?') && !text.toLowerCase().includes('comment')) {
      optimizedText += ' What do you think?';
      improvements.push('Added engagement question');
    }

    return { optimizedText, improvements };
  }

  private optimizeDuration(duration: number): { optimalDuration: number; improvements: string[] } {
    const improvements: string[] = [];
    let optimalDuration = duration;

    if (duration > 60) {
      optimalDuration = 45;
      improvements.push('Reduced duration to optimal 45 seconds for better completion rate');
    } else if (duration < 15) {
      optimalDuration = 20;
      improvements.push('Increased duration to 20 seconds for better content depth');
    }

    return { optimalDuration, improvements };
  }

  private optimizeAudio(hasAudio: boolean): { suggestions: string[]; improvements: string[] } {
    const suggestions = ['Trending Pop Song', 'Viral Sound Effect', 'Original Audio'];
    const improvements: string[] = [];

    if (!hasAudio) {
      improvements.push('Add trending audio for 40% higher engagement');
    }

    return { suggestions, improvements };
  }

  private optimizeHashtags(features: ContentFeatures): { strategy: string[]; improvements: string[] } {
    const strategy = ['#fyp', '#foryou', '#viral', '#trending'];
    const improvements: string[] = [];

    if (features.hashtag_count < 3) {
      improvements.push('Increase hashtags to 5-8 for better discoverability');
    }

    return { strategy, improvements };
  }

  // Helper methods

  private async extractBasicFeatures(text: string): Promise<ContentFeatures> {
    // Similar to TwitterModel but optimized for TikTok
    const words = text.split(/\s+/);

    return {
      text_length: text.length,
      word_count: words.length,
      sentence_count: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
      avg_word_length: words.reduce((sum, word) => sum + word.length, 0) / words.length,
      readability_score: 70, // TikTok prefers simpler content
      sentiment_score: 0.3, // Slightly positive default
      emotion_scores: 0.6, // Higher emotion default for TikTok
      emotional_intensity: 0.6,
      subjectivity_score: 0.7, // TikTok is more subjective
      exclamation_count: (text.match(/!/g) || []).length,
      question_count: (text.match(/\?/g) || []).length,
      caps_ratio: 0,
      emoji_count: 0,
      emoji_diversity: 0,
      hashtag_count: (text.match(/#\w+/g) || []).length,
      mention_count: (text.match(/@\w+/g) || []).length,
      url_count: (text.match(/https?:\/\/[^\s]+/g) || []).length,
      hashtag_trending_score: 0.5, // Higher default for TikTok
      mention_influence_score: 0,
      call_to_action_score: 0.4, // Higher default
      urgency_score: 0,
      personal_connection_score: 0.6, // TikTok is personal
      controversy_score: 0.2, // Some controversy helps
      novelty_score: 0.5, // Novelty is important
      platform_optimization_score: 0.8, // Assume optimized for TikTok
      optimal_length_score: 0.7,
      format_suitability_score: 0.9, // High for TikTok
      trending_topics_score: 0.4,
      seasonality_score: 0.3,
      current_events_relevance: 0.2,
      competitive_landscape_score: 0.5,
      optimal_timing_score: 0.6,
      day_of_week_score: 0.8, // TikTok performs well most days
      hour_of_day_score: 0.7,
      time_zone_advantage: 0.5,
      has_media: true, // TikTok requires video
      media_count: 1,
      media_type_score: 1.0, // Video is perfect for TikTok
      media_quality_score: 0.7,
      media_trending_score: 0.6,
      uniqueness_score: 0.6,
      information_density: 0.4, // Lower for TikTok
      entertainment_value: 0.8, // High for TikTok
      educational_value: 0.3,
      inspirational_value: 0.4,
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

  private generateFYPRecommendations(features: TikTokFeatures, videoMetadata?: any): string[] {
    const recommendations: string[] = [];

    if (features.fyp_optimization_score < 0.6) {
      recommendations.push('Increase emotional engagement to improve FYP chances');
    }

    if (features.completion_rate_prediction < 0.7) {
      recommendations.push('Optimize video length for higher completion rate');
    }

    if (!videoMetadata?.hasAudio) {
      recommendations.push('Add trending audio to boost FYP algorithm ranking');
    }

    if (features.hashtag_count < 3) {
      recommendations.push('Use 5-8 strategic hashtags including #fyp #foryou');
    }

    return recommendations;
  }

  private findNextOptimalTime(baseDate: Date, optimalHours: number[], index: number): Date {
    const optimalTime = new Date(baseDate);
    const targetHour = optimalHours[index % optimalHours.length];

    optimalTime.setHours(targetHour, 0, 0, 0);
    optimalTime.setDate(optimalTime.getDate() + Math.floor(index / optimalHours.length));

    return optimalTime;
  }

  private getAudienceActiveTime(audience: string): string {
    const activeTimes = {
      genZ: '6-10 PM (after school/work)',
      genAlpha: '3-7 PM (after school)',
      millennial: '7-10 PM (evening)',
      all: '6-10 PM (peak hours)'
    };

    return activeTimes[audience] || activeTimes.all;
  }
}