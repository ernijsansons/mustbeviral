import { ViralRequest, SocialPlatform } from './ViralPredictionEngine';

export interface ContentFeatures {
  // Text Features
  text_length: number;
  word_count: number;
  sentence_count: number;
  avg_word_length: number;
  readability_score: number;

  // Sentiment & Emotion
  sentiment_score: number; // -1 to 1
  emotion_scores: number; // 0 to 1 (composite of joy, excitement, surprise)
  emotional_intensity: number;
  subjectivity_score: number;

  // Linguistic Features
  exclamation_count: number;
  question_count: number;
  caps_ratio: number;
  emoji_count: number;
  emoji_diversity: number;

  // Social Features
  hashtag_count: number;
  mention_count: number;
  url_count: number;
  hashtag_trending_score: number;
  mention_influence_score: number;

  // Engagement Predictors
  call_to_action_score: number;
  urgency_score: number;
  personal_connection_score: number;
  controversy_score: number;
  novelty_score: number;

  // Platform-Specific
  platform_optimization_score: number;
  optimal_length_score: number;
  format_suitability_score: number;

  // Trending & Context
  trending_topics_score: number;
  seasonality_score: number;
  current_events_relevance: number;
  competitive_landscape_score: number;

  // Creator Features
  creator_influence_score?: number;
  creator_niche_alignment?: number;
  creator_engagement_history?: number;

  // Timing Features
  optimal_timing_score: number;
  day_of_week_score: number;
  hour_of_day_score: number;
  time_zone_advantage: number;

  // Media Features
  has_media: boolean;
  media_count: number;
  media_type_score: number;
  media_quality_score: number;
  media_trending_score: number;

  // Content Quality
  uniqueness_score: number;
  information_density: number;
  entertainment_value: number;
  educational_value: number;
  inspirational_value: number;

  toDict(): Record<string, unknown>;
}

export interface TrendingTopic {
  topic: string;
  score: number;
  platform: SocialPlatform;
  region: string;
  volume: number;
  momentum: number;
}

export interface EmotionAnalysis {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  excitement: number;
  anticipation: number;
}

export interface SentimentAnalysis {
  polarity: number; // -1 to 1
  subjectivity: number; // 0 to 1
  confidence: number;
  aspects: {
    aspect: string;
    sentiment: number;
  }[];
}

export interface LinguisticFeatures {
  readability: {
    fleschKincaid: number;
    gunningFog: number;
    automatedReadability: number;
    colemanLiau: number;
    smog: number;
  };
  complexity: {
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
    lexicalDiversity: number;
    syntacticComplexity: number;
  };
  style: {
    formalityScore: number;
    personalityTraits: string[];
    writingStyle: string;
    tone: string;
  };
}

export class FeatureExtractor {
  private trendingTopics: Map<SocialPlatform, TrendingTopic[]> = new Map();
  private emotionModel: any; // Would be actual ML model
  private sentimentModel: any; // Would be actual ML model
  private readabilityCache: Map<string, number> = new Map();

  constructor() {
    this.initializeModels();
    this.updateTrendingTopics();
  }

  /**
   * Extract comprehensive features from viral request
   */
  async extractFeatures(request: ViralRequest): Promise<ContentFeatures> {
    const text = request.content.text;
    const platform = request.platform;

    // Parallel feature extraction for performance
    const [
      textFeatures,
      sentimentData,
      emotionData,
      linguisticData,
      socialFeatures,
      engagementFeatures,
      platformFeatures,
      trendingFeatures,
      timingFeatures,
      mediaFeatures,
      qualityFeatures
    ] = await Promise.all([
      this.extractTextFeatures(text),
      this.analyzeSentiment(text),
      this.analyzeEmotions(text),
      this.analyzeLinguistics(text),
      this.extractSocialFeatures(request.content),
      this.extractEngagementFeatures(text),
      this.extractPlatformFeatures(request),
      this.extractTrendingFeatures(request),
      this.extractTimingFeatures(request),
      this.extractMediaFeatures(request.content),
      this.extractQualityFeatures(text)
    ]);

    // Creator features (optional)
    const creatorFeatures = request.creator
      ? await this.extractCreatorFeatures(request.creator, platform)
      : {};

    // Combine all features
    const features: ContentFeatures = {
      // Text Features
      text_length: textFeatures.length,
      word_count: textFeatures.wordCount,
      sentence_count: textFeatures.sentenceCount,
      avg_word_length: textFeatures.avgWordLength,
      readability_score: linguisticData.readability.fleschKincaid,

      // Sentiment & Emotion
      sentiment_score: sentimentData.polarity,
      emotion_scores: this.calculateCompositeEmotionScore(emotionData),
      emotional_intensity: this.calculateEmotionalIntensity(emotionData),
      subjectivity_score: sentimentData.subjectivity,

      // Linguistic Features
      exclamation_count: this.countExclamations(text),
      question_count: this.countQuestions(text),
      caps_ratio: this.calculateCapsRatio(text),
      emoji_count: this.countEmojis(text),
      emoji_diversity: this.calculateEmojiDiversity(text),

      // Social Features
      hashtag_count: socialFeatures.hashtagCount,
      mention_count: socialFeatures.mentionCount,
      url_count: socialFeatures.urlCount,
      hashtag_trending_score: socialFeatures.hashtagTrendingScore,
      mention_influence_score: socialFeatures.mentionInfluenceScore,

      // Engagement Predictors
      call_to_action_score: engagementFeatures.callToActionScore,
      urgency_score: engagementFeatures.urgencyScore,
      personal_connection_score: engagementFeatures.personalConnectionScore,
      controversy_score: engagementFeatures.controversyScore,
      novelty_score: engagementFeatures.noveltyScore,

      // Platform-Specific
      platform_optimization_score: platformFeatures.optimizationScore,
      optimal_length_score: platformFeatures.optimalLengthScore,
      format_suitability_score: platformFeatures.formatSuitabilityScore,

      // Trending & Context
      trending_topics_score: trendingFeatures.topicsScore,
      seasonality_score: trendingFeatures.seasonalityScore,
      current_events_relevance: trendingFeatures.currentEventsRelevance,
      competitive_landscape_score: trendingFeatures.competitiveScore,

      // Creator Features (optional)
      creator_influence_score: creatorFeatures.influenceScore,
      creator_niche_alignment: creatorFeatures.nicheAlignment,
      creator_engagement_history: creatorFeatures.engagementHistory,

      // Timing Features
      optimal_timing_score: timingFeatures.optimalTimingScore,
      day_of_week_score: timingFeatures.dayOfWeekScore,
      hour_of_day_score: timingFeatures.hourOfDayScore,
      time_zone_advantage: timingFeatures.timeZoneAdvantage,

      // Media Features
      has_media: mediaFeatures.hasMedia,
      media_count: mediaFeatures.mediaCount,
      media_type_score: mediaFeatures.typeScore,
      media_quality_score: mediaFeatures.qualityScore,
      media_trending_score: mediaFeatures.trendingScore,

      // Content Quality
      uniqueness_score: qualityFeatures.uniquenessScore,
      information_density: qualityFeatures.informationDensity,
      entertainment_value: qualityFeatures.entertainmentValue,
      educational_value: qualityFeatures.educationalValue,
      inspirational_value: qualityFeatures.inspirationalValue,

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

    return features;
  }

  /**
   * Extract features for batch processing
   */
  async batchExtractFeatures(requests: ViralRequest[]): Promise<ContentFeatures[]> {
    // Process in chunks to avoid overwhelming the system
    const chunkSize = 10;
    const results: ContentFeatures[] = [];

    for (let i = 0; i < requests.length; i += chunkSize) {
      const chunk = requests.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(request => this.extractFeatures(request))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Extract trending-aware features
   */
  async extractTrendingFeatures(request: ViralRequest): Promise<{
    topicsScore: number;
    seasonalityScore: number;
    currentEventsRelevance: number;
    competitiveScore: number;
  }> {
    const text = request.content.text.toLowerCase();
    const platform = request.platform;
    const trends = this.trendingTopics.get(platform) || [];

    // Calculate trending topics alignment
    let topicsScore = 0;
    for (const trend of trends) {
      if (text.includes(trend.topic.toLowerCase())) {
        topicsScore += trend.score * trend.momentum;
      }
    }
    topicsScore = Math.min(1, topicsScore / 10); // Normalize

    // Seasonality score based on current season/holidays
    const seasonalityScore = this.calculateSeasonalityScore(text, new Date());

    // Current events relevance
    const currentEventsRelevance = await this.calculateCurrentEventsRelevance(text);

    // Competitive landscape score
    const competitiveScore = request.context?.competitors?.length
      ? this.calculateCompetitiveAdvantage(text, request.context.competitors)
      : 0.5;

    return {
      topicsScore,
      seasonalityScore,
      currentEventsRelevance,
      competitiveScore
    };
  }

  /**
   * Real-time feature extraction for live content analysis
   */
  async extractRealTimeFeatures(
    text: string,
    platform: SocialPlatform
  ): Promise<Partial<ContentFeatures>> {
    // Extract only the most critical features for real-time analysis
    const [textFeatures, sentimentData, socialFeatures] = await Promise.all([
      this.extractTextFeatures(text),
      this.analyzeSentiment(text),
      this.extractSocialFeatures({ text })
    ]);

    return {
      text_length: textFeatures.length,
      word_count: textFeatures.wordCount,
      sentiment_score: sentimentData.polarity,
      hashtag_count: socialFeatures.hashtagCount,
      mention_count: socialFeatures.mentionCount,
      call_to_action_score: this.calculateCallToActionScore(text),
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

  // Private feature extraction methods

  private async extractTextFeatures(text: string): Promise<{
    length: number;
    wordCount: number;
    sentenceCount: number;
    avgWordLength: number;
  }> {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);

    return {
      length: text.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length || 0
    };
  }

  private async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    // Cache to avoid repeated analysis
    const cacheKey = `sentiment_${text.slice(0, 50)}`;

    // In production, this would use actual sentiment analysis models
    // For now, implementing a simplified version
    const positiveWords = ['great', 'amazing', 'love', 'awesome', 'fantastic', 'excellent', 'perfect', 'wonderful'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'horrible', 'disgusting', 'worst', 'stupid'];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const totalSentimentWords = positiveCount + negativeCount;
    const polarity = totalSentimentWords > 0
      ? (positiveCount - negativeCount) / totalSentimentWords
      : 0;

    // Subjectivity based on personal pronouns and opinion words
    const personalPronouns = ['i', 'me', 'my', 'mine', 'you', 'your', 'we', 'our'];
    const opinionWords = ['think', 'feel', 'believe', 'opinion', 'seems', 'appears'];

    const personalCount = words.filter(word => personalPronouns.includes(word)).length;
    const opinionCount = words.filter(word => opinionWords.includes(word)).length;
    const subjectivity = Math.min(1, (personalCount + opinionCount) / words.length * 5);

    return {
      polarity,
      subjectivity,
      confidence: Math.min(1, totalSentimentWords / words.length * 10),
      aspects: [] // Would be implemented with more sophisticated NLP
    };
  }

  private async analyzeEmotions(text: string): Promise<EmotionAnalysis> {
    // Simplified emotion analysis based on keywords
    const emotionKeywords = {
      joy: ['happy', 'joy', 'excited', 'thrilled', 'delighted', 'cheerful'],
      sadness: ['sad', 'depressed', 'disappointed', 'gloomy', 'melancholy'],
      anger: ['angry', 'furious', 'rage', 'mad', 'irritated', 'frustrated'],
      fear: ['scared', 'afraid', 'worried', 'anxious', 'terrified', 'nervous'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned'],
      disgust: ['disgusted', 'revolted', 'sick', 'gross', 'repulsed'],
      excitement: ['exciting', 'thrilling', 'exhilarating', 'electrifying'],
      anticipation: ['waiting', 'expecting', 'looking forward', 'anticipating']
    };

    const words = text.toLowerCase().split(/\s+/);
    const emotions: EmotionAnalysis = {
      joy: 0, sadness: 0, anger: 0, fear: 0,
      surprise: 0, disgust: 0, excitement: 0, anticipation: 0
    };

    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      const count = words.filter(word => keywords.some(keyword => word.includes(keyword))).length;
      emotions[emotion as keyof EmotionAnalysis] = Math.min(1, count / words.length * 20);
    });

    return emotions;
  }

  private async analyzeLinguistics(text: string): Promise<LinguisticFeatures> {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);

    // Simplified readability calculations
    const avgWordsPerSentence = words.length / sentences.length || 0;
    const avgSyllablesPerWord = this.estimateSyllables(words);

    // Flesch-Kincaid Grade Level
    const fleschKincaid = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    return {
      readability: {
        fleschKincaid: Math.max(0, Math.min(100, 100 - fleschKincaid * 10)),
        gunningFog: Math.max(0, Math.min(100, 100 - (avgWordsPerSentence + avgSyllablesPerWord) * 5)),
        automatedReadability: Math.max(0, Math.min(100, 100 - fleschKincaid)),
        colemanLiau: Math.max(0, Math.min(100, 100 - fleschKincaid)),
        smog: Math.max(0, Math.min(100, 100 - avgSyllablesPerWord * 10))
      },
      complexity: {
        avgWordsPerSentence,
        avgSyllablesPerWord,
        lexicalDiversity: new Set(words.map(w => w.toLowerCase())).size / words.length,
        syntacticComplexity: this.calculateSyntacticComplexity(text)
      },
      style: {
        formalityScore: this.calculateFormalityScore(text),
        personalityTraits: this.detectPersonalityTraits(text),
        writingStyle: this.detectWritingStyle(text),
        tone: this.detectTone(text)
      }
    };
  }

  private extractSocialFeatures(content: ViralRequest['content']): {
    hashtagCount: number;
    mentionCount: number;
    urlCount: number;
    hashtagTrendingScore: number;
    mentionInfluenceScore: number;
  } {
    const text = content.text;

    const hashtagCount = (text.match(/#\w+/g) || []).length;
    const mentionCount = (text.match(/@\w+/g) || []).length;
    const urlCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;

    // Calculate hashtag trending score
    const hashtags = content.hashtags || [];
    const hashtagTrendingScore = this.calculateHashtagTrendingScore(hashtags);

    // Calculate mention influence score (would use real influence data)
    const mentionInfluenceScore = mentionCount > 0 ? Math.random() * 0.5 + 0.3 : 0;

    return {
      hashtagCount,
      mentionCount,
      urlCount,
      hashtagTrendingScore,
      mentionInfluenceScore
    };
  }

  private extractEngagementFeatures(text: string): {
    callToActionScore: number;
    urgencyScore: number;
    personalConnectionScore: number;
    controversyScore: number;
    noveltyScore: number;
  } {
    return {
      callToActionScore: this.calculateCallToActionScore(text),
      urgencyScore: this.calculateUrgencyScore(text),
      personalConnectionScore: this.calculatePersonalConnectionScore(text),
      controversyScore: this.calculateControversyScore(text),
      noveltyScore: this.calculateNoveltyScore(text)
    };
  }

  private extractPlatformFeatures(request: ViralRequest): {
    optimizationScore: number;
    optimalLengthScore: number;
    formatSuitabilityScore: number;
  } {
    const text = request.content.text;
    const platform = request.platform;

    const platformOptimalLengths = {
      twitter: { min: 71, max: 100, optimal: 80 },
      instagram: { min: 125, max: 300, optimal: 200 },
      tiktok: { min: 50, max: 150, optimal: 100 },
      facebook: { min: 100, max: 400, optimal: 250 },
      linkedin: { min: 150, max: 600, optimal: 300 },
      youtube: { min: 200, max: 1000, optimal: 500 }
    };

    const lengthConfig = platformOptimalLengths[platform];
    const optimalLengthScore = this.calculateOptimalLengthScore(text.length, lengthConfig);

    return {
      optimizationScore: this.calculatePlatformOptimizationScore(request),
      optimalLengthScore,
      formatSuitabilityScore: this.calculateFormatSuitabilityScore(request)
    };
  }

  private async extractCreatorFeatures(
    creator: NonNullable<ViralRequest['creator']>,
    platform: SocialPlatform
  ): Promise<{
    influenceScore: number;
    nicheAlignment: number;
    engagementHistory: number;
  }> {
    // Normalize follower count (log scale)
    const influenceScore = Math.min(1, Math.log10(creator.followersCount + 1) / 7);

    // Niche alignment would be calculated based on content analysis
    const nicheAlignment = Math.random() * 0.4 + 0.6; // Placeholder

    // Engagement history based on creator's past performance
    const engagementHistory = Math.min(1, creator.engagementRate * 20);

    return {
      influenceScore,
      nicheAlignment,
      engagementHistory
    };
  }

  private extractTimingFeatures(request: ViralRequest): {
    optimalTimingScore: number;
    dayOfWeekScore: number;
    hourOfDayScore: number;
    timeZoneAdvantage: number;
  } {
    const now = request.timing?.scheduledTime || new Date();
    const platform = request.platform;

    // Platform-specific optimal hours
    const optimalHours = {
      twitter: [9, 12, 15, 18],
      instagram: [11, 13, 17, 19],
      tiktok: [16, 18, 20, 22],
      facebook: [9, 13, 15],
      linkedin: [8, 10, 12, 14, 17],
      youtube: [14, 16, 18, 20]
    };

    const platformOptimalHours = optimalHours[platform] || [12, 15, 18];
    const currentHour = now.getHours();
    const hourScore = this.calculateHourScore(currentHour, platformOptimalHours);

    // Day of week scoring (1 = Monday, 7 = Sunday)
    const dayOfWeek = now.getDay() || 7; // Convert Sunday from 0 to 7
    const dayScore = this.calculateDayScore(dayOfWeek, platform);

    return {
      optimalTimingScore: (hourScore + dayScore) / 2,
      dayOfWeekScore: dayScore,
      hourOfDayScore: hourScore,
      timeZoneAdvantage: this.calculateTimeZoneAdvantage(request.timing?.timezone || 'UTC')
    };
  }

  private extractMediaFeatures(content: ViralRequest['content']): {
    hasMedia: boolean;
    mediaCount: number;
    typeScore: number;
    qualityScore: number;
    trendingScore: number;
  } {
    const media = content.media || [];
    const hasMedia = media.length > 0;

    if (!hasMedia) {
      return {
        hasMedia: false,
        mediaCount: 0,
        typeScore: 0,
        qualityScore: 0,
        trendingScore: 0
      };
    }

    // Score media types based on virality potential
    const typeScores = { video: 1.0, gif: 0.8, image: 0.6 };
    const avgTypeScore = media.reduce((sum, m) => sum + (typeScores[m.type] || 0.5), 0) / media.length;

    // Quality score based on dimensions and duration
    const qualityScore = this.calculateMediaQualityScore(media);

    // Trending score based on current media trends
    const trendingScore = this.calculateMediaTrendingScore(media);

    return {
      hasMedia,
      mediaCount: media.length,
      typeScore: avgTypeScore,
      qualityScore,
      trendingScore
    };
  }

  private extractQualityFeatures(text: string): {
    uniquenessScore: number;
    informationDensity: number;
    entertainmentValue: number;
    educationalValue: number;
    inspirationalValue: number;
  } {
    return {
      uniquenessScore: this.calculateUniquenessScore(text),
      informationDensity: this.calculateInformationDensity(text),
      entertainmentValue: this.calculateEntertainmentValue(text),
      educationalValue: this.calculateEducationalValue(text),
      inspirationalValue: this.calculateInspirationalValue(text)
    };
  }

  // Helper methods for feature calculations

  private calculateCompositeEmotionScore(emotions: EmotionAnalysis): number {
    // Weight positive emotions higher for viral potential
    return (emotions.joy * 0.3 + emotions.excitement * 0.4 + emotions.surprise * 0.3);
  }

  private calculateEmotionalIntensity(emotions: EmotionAnalysis): number {
    return Math.max(...Object.values(emotions));
  }

  private countExclamations(text: string): number {
    return (text.match(/!/g) || []).length;
  }

  private countQuestions(text: string): number {
    return (text.match(/\?/g) || []).length;
  }

  private calculateCapsRatio(text: string): number {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    const caps = text.replace(/[^A-Z]/g, '');
    return letters.length > 0 ? caps.length / letters.length : 0;
  }

  private countEmojis(text: string): number {
    // Simplified emoji counting (Unicode ranges for emojis)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    return (text.match(emojiRegex) || []).length;
  }

  private calculateEmojiDiversity(text: string): number {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    const emojis = text.match(emojiRegex) || [];
    const uniqueEmojis = new Set(emojis);
    return emojis.length > 0 ? uniqueEmojis.size / emojis.length : 0;
  }

  private calculateCallToActionScore(text: string): number {
    const ctaWords = ['share', 'retweet', 'like', 'comment', 'follow', 'subscribe', 'click', 'watch', 'read', 'join'];
    const ctaCount = ctaWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(1, ctaCount / 3); // Normalize to 0-1
  }

  private calculateUrgencyScore(text: string): number {
    const urgentWords = ['now', 'today', 'urgent', 'limited time', 'hurry', 'quick', 'fast', 'immediately'];
    const urgentCount = urgentWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(1, urgentCount / 2);
  }

  private calculatePersonalConnectionScore(text: string): number {
    const personalWords = ['you', 'your', 'we', 'us', 'our', 'together'];
    const personalCount = personalWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(1, personalCount / text.split(/\s+/).length * 10);
  }

  private calculateControversyScore(text: string): number {
    const controversialWords = ['controversial', 'debate', 'argue', 'disagree', 'unpopular opinion'];
    const controversialCount = controversialWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(1, controversialCount / 2);
  }

  private calculateNoveltyScore(text: string): number {
    const noveltyWords = ['new', 'first', 'never', 'discover', 'reveal', 'secret', 'exclusive', 'breakthrough'];
    const noveltyCount = noveltyWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(1, noveltyCount / 3);
  }

  private estimateSyllables(words: string[]): number {
    return words.reduce((total, word) => {
      // Simple syllable estimation
      const vowels = word.toLowerCase().match(/[aeiouy]+/g) || [];
      return total + Math.max(1, vowels.length);
    }, 0) / words.length || 1;
  }

  private calculateSyntacticComplexity(text: string): number {
    // Simplified complexity based on sentence structure indicators
    const complexityIndicators = [',', ';', ':', '(', ')', 'and', 'but', 'however', 'although'];
    const indicators = complexityIndicators.filter(indicator => text.includes(indicator)).length;
    return Math.min(1, indicators / text.split(/\s+/).length * 5);
  }

  private calculateFormalityScore(text: string): number {
    const formalWords = ['therefore', 'however', 'furthermore', 'consequently', 'nevertheless'];
    const informalWords = ['like', 'really', 'super', 'awesome', 'cool', 'lol', 'omg'];

    const formalCount = formalWords.filter(word => text.toLowerCase().includes(word)).length;
    const informalCount = informalWords.filter(word => text.toLowerCase().includes(word)).length;

    if (formalCount + informalCount === 0) return 0.5;
    return formalCount / (formalCount + informalCount);
  }

  private detectPersonalityTraits(text: string): string[] {
    const traits: string[] = [];

    if (this.countExclamations(text) > 2) traits.push('enthusiastic');
    if (this.countQuestions(text) > 1) traits.push('curious');
    if (text.toLowerCase().includes('i think') || text.toLowerCase().includes('in my opinion')) traits.push('analytical');
    if (this.countEmojis(text) > 3) traits.push('expressive');

    return traits;
  }

  private detectWritingStyle(text: string): string {
    const avgSentenceLength = text.split(/[.!?]+/).reduce((sum, sentence) =>
      sum + sentence.split(/\s+/).length, 0) / text.split(/[.!?]+/).length;

    if (avgSentenceLength > 20) return 'academic';
    if (avgSentenceLength < 10) return 'conversational';
    if (this.countEmojis(text) > 2) return 'casual';
    return 'neutral';
  }

  private detectTone(text: string): string {
    const sentiment = this.calculateSentimentScore(text);
    const exclamations = this.countExclamations(text);

    if (sentiment > 0.3 && exclamations > 1) return 'excited';
    if (sentiment > 0.1) return 'positive';
    if (sentiment < -0.1) return 'negative';
    if (this.countQuestions(text) > 1) return 'inquisitive';
    return 'neutral';
  }

  private calculateSentimentScore(text: string): number {
    // Simplified sentiment calculation
    const positiveWords = ['great', 'amazing', 'love', 'awesome', 'fantastic'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'horrible'];

    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;

    return (positiveCount - negativeCount) / words.length * 10;
  }

  private calculateHashtagTrendingScore(hashtags: string[]): number {
    // Would integrate with real trending hashtag APIs
    const trendingHashtags = ['viral', 'trending', 'fyp', 'explore', 'discover'];
    const trendingCount = hashtags.filter(tag =>
      trendingHashtags.includes(tag.toLowerCase().replace('#', ''))
    ).length;
    return Math.min(1, trendingCount / hashtags.length);
  }

  private calculateSeasonalityScore(text: string, date: Date): number {
    const month = date.getMonth();
    const seasonalTerms = {
      winter: ['winter', 'christmas', 'holiday', 'snow', 'cold'],
      spring: ['spring', 'easter', 'fresh', 'new', 'bloom'],
      summer: ['summer', 'vacation', 'beach', 'hot', 'sun'],
      fall: ['fall', 'autumn', 'thanksgiving', 'harvest', 'cozy']
    };

    let relevantTerms: string[] = [];
    if (month >= 11 || month <= 1) relevantTerms = seasonalTerms.winter;
    else if (month >= 2 && month <= 4) relevantTerms = seasonalTerms.spring;
    else if (month >= 5 && month <= 7) relevantTerms = seasonalTerms.summer;
    else relevantTerms = seasonalTerms.fall;

    const matchCount = relevantTerms.filter(term => text.toLowerCase().includes(term)).length;
    return Math.min(1, matchCount / 2);
  }

  private async calculateCurrentEventsRelevance(text: string): Promise<number> {
    // Would integrate with news APIs to check current events relevance
    return Math.random() * 0.3; // Placeholder
  }

  private calculateCompetitiveAdvantage(text: string, competitors: string[]): number {
    // Analyze how content differentiates from competitors
    return Math.random() * 0.4 + 0.4; // Placeholder
  }

  private calculateOptimalLengthScore(
    length: number,
    config: { min: number; max: number; optimal: number }
  ): number {
    if (length >= config.min && length <= config.max) {
      const distance = Math.abs(length - config.optimal);
      const maxDistance = Math.max(config.optimal - config.min, config.max - config.optimal);
      return 1 - (distance / maxDistance);
    }
    return 0.3; // Penalty for being outside optimal range
  }

  private calculatePlatformOptimizationScore(request: ViralRequest): number {
    const platform = request.platform;
    const content = request.content;

    let score = 0.5; // Base score

    // Platform-specific optimizations
    switch (platform) {
      case 'twitter':
        if (content.hashtags && content.hashtags.length <= 2) score += 0.2;
        if (content.text.length <= 280) score += 0.3;
        break;
      case 'instagram':
        if (content.media && content.media.length > 0) score += 0.3;
        if (content.hashtags && content.hashtags.length >= 5) score += 0.2;
        break;
      case 'tiktok':
        if (content.media?.some(m => m.type === 'video')) score += 0.4;
        if (content.hashtags && content.hashtags.length >= 3) score += 0.1;
        break;
    }

    return Math.min(1, score);
  }

  private calculateFormatSuitabilityScore(request: ViralRequest): number {
    const platform = request.platform;
    const content = request.content;

    const formatRequirements = {
      twitter: { prefersText: true, prefersShortForm: true, prefersHashtags: true },
      instagram: { prefersVisual: true, prefersHashtags: true, prefersStories: true },
      tiktok: { prefersVideo: true, prefersShortForm: true, prefersTrending: true },
      youtube: { prefersVideo: true, prefersLongForm: true, prefersEducational: true },
      facebook: { prefersVisual: true, prefersEngagement: true, prefersSharing: true },
      linkedin: { prefersText: true, prefersProfessional: true, prefersEducational: true }
    };

    const requirements = formatRequirements[platform];
    let score = 0.5;

    if (requirements.prefersVisual && content.media?.length) score += 0.2;
    if (requirements.prefersVideo && content.media?.some(m => m.type === 'video')) score += 0.3;
    if (requirements.prefersHashtags && content.hashtags?.length) score += 0.2;
    if (requirements.prefersShortForm && content.text.length < 200) score += 0.2;
    if (requirements.prefersLongForm && content.text.length > 300) score += 0.2;

    return Math.min(1, score);
  }

  private calculateHourScore(hour: number, optimalHours: number[]): number {
    const closest = optimalHours.reduce((prev, curr) =>
      Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev
    );
    const distance = Math.abs(hour - closest);
    return Math.max(0, 1 - distance / 12); // 12-hour max distance
  }

  private calculateDayScore(dayOfWeek: number, platform: SocialPlatform): number {
    const platformOptimalDays = {
      twitter: [2, 3, 4], // Tue, Wed, Thu
      instagram: [3, 4, 5, 6], // Wed, Thu, Fri, Sat
      tiktok: [5, 6, 7], // Fri, Sat, Sun
      facebook: [2, 3, 4, 5], // Tue, Wed, Thu, Fri
      linkedin: [2, 3, 4], // Tue, Wed, Thu
      youtube: [4, 5, 6] // Thu, Fri, Sat
    };

    const optimalDays = platformOptimalDays[platform] || [2, 3, 4];
    return optimalDays.includes(dayOfWeek) ? 1 : 0.6;
  }

  private calculateTimeZoneAdvantage(timezone: string): number {
    // Calculate advantage based on posting in optimal timezone
    // Major markets: EST (US East), PST (US West), GMT (Europe)
    const majorTimezones = ['EST', 'PST', 'GMT', 'UTC'];
    return majorTimezones.includes(timezone) ? 0.8 : 0.5;
  }

  private calculateMediaQualityScore(media: NonNullable<ViralRequest['content']['media']>): number {
    let totalScore = 0;

    media.forEach(item => {
      let itemScore = 0.5; // Base score

      // Resolution scoring
      if (item.dimensions) {
        const resolution = item.dimensions.width * item.dimensions.height;
        if (resolution >= 1920 * 1080) itemScore += 0.3; // HD or better
        else if (resolution >= 1280 * 720) itemScore += 0.2; // 720p
        else if (resolution >= 640 * 480) itemScore += 0.1; // SD
      }

      // Duration scoring for videos
      if (item.type === 'video' && item.duration) {
        if (item.duration >= 15 && item.duration <= 60) itemScore += 0.2; // Optimal length
        else if (item.duration <= 15) itemScore += 0.1; // Short form
      }

      totalScore += itemScore;
    });

    return Math.min(1, totalScore / media.length);
  }

  private calculateMediaTrendingScore(media: NonNullable<ViralRequest['content']['media']>): number {
    // Score based on trending media formats
    let score = 0;

    media.forEach(item => {
      switch (item.type) {
        case 'video':
          score += 0.8; // Video is currently trending
          break;
        case 'gif':
          score += 0.6; // GIFs are moderately trending
          break;
        case 'image':
          score += 0.4; // Images are less trending but stable
          break;
      }
    });

    return Math.min(1, score / media.length);
  }

  private calculateUniquenessScore(text: string): number {
    // Simplified uniqueness based on rare word usage
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const uncommonWords = words.filter(word => !commonWords.includes(word) && word.length > 4);
    return Math.min(1, uncommonWords.length / words.length * 3);
  }

  private calculateInformationDensity(text: string): number {
    // Based on ratio of informative words to total words
    const words = text.split(/\s+/);
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    const informativeWords = words.filter(word => !stopWords.includes(word.toLowerCase()));
    return informativeWords.length / words.length;
  }

  private calculateEntertainmentValue(text: string): number {
    const entertainmentWords = ['funny', 'hilarious', 'joke', 'laugh', 'humor', 'comedy', 'amusing', 'entertaining'];
    const count = entertainmentWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(1, count / 2 + this.countEmojis(text) / 10);
  }

  private calculateEducationalValue(text: string): number {
    const educationalWords = ['learn', 'tutorial', 'how to', 'guide', 'tip', 'advice', 'explain', 'teach'];
    const count = educationalWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(1, count / 3);
  }

  private calculateInspirationalValue(text: string): number {
    const inspirationalWords = ['inspire', 'motivate', 'achieve', 'success', 'dream', 'goal', 'overcome', 'believe'];
    const count = inspirationalWords.filter(word => text.toLowerCase().includes(word)).length;
    return Math.min(1, count / 2);
  }

  private async initializeModels(): Promise<void> {
    // Initialize ML models for sentiment and emotion analysis
    // In production, these would be actual model instances
    this.emotionModel = {}; // Placeholder
    this.sentimentModel = {}; // Placeholder
  }

  private async updateTrendingTopics(): Promise<void> {
    // Update trending topics from various APIs
    const platforms: SocialPlatform[] = ['twitter', 'tiktok', 'instagram', 'youtube', 'facebook', 'linkedin'];

    platforms.forEach(platform => {
      // Mock trending topics - in production, this would fetch from real APIs
      const mockTrends: TrendingTopic[] = [
        { topic: 'AI', score: 0.9, platform, region: 'global', volume: 1000000, momentum: 1.2 },
        { topic: 'sustainability', score: 0.7, platform, region: 'global', volume: 500000, momentum: 1.1 },
        { topic: 'remote work', score: 0.6, platform, region: 'global', volume: 300000, momentum: 0.9 }
      ];

      this.trendingTopics.set(platform, mockTrends);
    });

    // Schedule regular updates
    setTimeout(() => this.updateTrendingTopics(), 30 * 60 * 1000); // Update every 30 minutes
  }
}