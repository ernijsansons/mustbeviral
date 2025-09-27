// ML Recommendation Engine
// Provides intelligent content recommendations based on user behavior and content similarity

export interface UserBehavior {
  userId: string;
  contentId: string;
  action: 'view' | 'like' | 'share' | 'comment' | 'save' | 'click';
  duration?: number; // time spent viewing in seconds
  timestamp: number;
  platform?: string;
  deviceType?: string;
}

export interface ContentFeatures {
  contentId: string;
  title: string;
  type: 'article' | 'video' | 'social_post' | 'image' | 'podcast';
  category: string;
  tags: string[];
  authorId: string;
  publishedAt: number;
  readingTime: number;
  engagement: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  viralScore: number;
  qualityScore: number;
  embedding?: number[]; // Content embedding vector
  metadata: Record<string, unknown>;
}

export interface UserProfile {
  userId: string;
  interests: string[];
  preferredContentTypes: string[];
  preferredCategories: string[];
  engagementHistory: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    averageReadingTime: number;
  };
  behaviorVector: number[]; // User behavior embedding
  lastActivity: number;
  demographics?: {
    ageRange?: string;
    location?: string;
    language?: string;
  };
}

export interface RecommendationRequest {
  userId: string;
  limit?: number;
  contentTypes?: string[];
  categories?: string[];
  excludeContentIds?: string[];
  platform?: string;
  contextualFactors?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek?: 'weekday' | 'weekend';
    deviceType?: 'mobile' | 'desktop' | 'tablet';
  };
}

export interface RecommendationResult {
  contentId: string;
  score: number;
  confidence: number;
  reason: string;
  features: ContentFeatures;
  explanation: {
    primary: string;
    factors: string[];
  };
}

export interface TrendingContent {
  contentId: string;
  trendScore: number;
  growthRate: number;
  timeWindow: '1h' | '6h' | '24h' | '7d';
  category: string;
  region?: string;
}

export class RecommendationEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private contentFeatures: Map<string, ContentFeatures> = new Map();
  private behaviorHistory: UserBehavior[] = [];
  private trendingContent: TrendingContent[] = [];

  constructor(
    private vectorize?: unknown,
    private kv?: unknown,
    private env?: unknown
  ) {}

  // Core recommendation methods
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResult[]> {
    const userProfile = await this.getUserProfile(request.userId);
    const availableContent = await this.getAvailableContent(request);

    // Get recommendations from multiple algorithms
    const [
      collaborativeRecs,
      contentBasedRecs,
      trendingRecs,
      personalizedRecs
    ] = await Promise.all([
      this.getCollaborativeRecommendations(userProfile, availableContent, request.limit ?? 10),
      this.getContentBasedRecommendations(userProfile, availableContent, request.limit ?? 10),
      this.getTrendingRecommendations(request),
      this.getPersonalizedRecommendations(userProfile, availableContent, request)
    ]);

    // Combine and rank recommendations
    const combinedRecs = this.combineRecommendations([
      { recs: collaborativeRecs, weight: 0.3, source: 'collaborative' },
      { recs: contentBasedRecs, weight: 0.3, source: 'content-based' },
      { recs: trendingRecs, weight: 0.2, source: 'trending' },
      { recs: personalizedRecs, weight: 0.2, source: 'personalized' }
    ]);

    // Apply contextual filters
    const contextualRecs = await this.applyContextualFilters(combinedRecs, request);

    // Sort by score and return top results
    return contextualRecs
      .sort((a, b) => b.score - a.score)
      .slice(0, request.limit ?? 10);
  }

  async getSimilarContent(contentId: string, limit: number = 5): Promise<RecommendationResult[]> {
    const targetContent = this.contentFeatures.get(contentId);
    if (!targetContent) {
      throw new Error('Content not found');
    }

    // Find similar content using embeddings
    if (targetContent.embedding && this.vectorize) {
      const similarContent = await this.findSimilarByEmbedding(targetContent.embedding, limit);
      return similarContent.filter(content => content.contentId !== contentId);
    }

    // Fallback to feature-based similarity
    return this.findSimilarByFeatures(targetContent, limit);
  }

  async getPersonalizedTrending(userId: string, limit: number = 10): Promise<RecommendationResult[]> {
    const userProfile = await this.getUserProfile(userId);
    const trending = await this.getTrendingContent();

    // Filter trending content based on user preferences
    const personalizedTrending = trending
      .filter(trend => this.matchesUserInterests(trend, userProfile))
      .map(trend => ({
        contentId: trend.contentId,
        score: this.calculatePersonalizedTrendScore(trend, userProfile),
        confidence: 0.8,
        reason: 'Trending in your interests',
        features: this.contentFeatures.get(trend.contentId)!,
        explanation: {
          primary: `Trending ${trend.category} content matching your interests`,
          factors: [
            `${trend.growthRate.toFixed(1)}% growth rate`,
            `High engagement in ${trend.category}`,
            'Matches your viewing history'
          ]
        }
      }))
      .filter(rec => rec.features) // Ensure features exist
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return personalizedTrending;
  }

  // User behavior tracking
  async trackUserBehavior(behavior: UserBehavior): Promise<void> {
    this.behaviorHistory.push(behavior);

    // Update user profile
    await this.updateUserProfile(behavior);

    // Store in persistent storage if available
    if (this.kv) {
      await this.persistBehavior(behavior);
    }

    // Update content engagement metrics
    await this.updateContentEngagement(behavior);

    // Trigger real-time recommendation updates if needed
    if (behavior.action === 'like'  ?? behavior.action === 'share') {
      await this.updateRealtimeRecommendations(behavior.userId);
    }
  }

  async updateUserProfile(behavior: UserBehavior): Promise<void> {
    let profile = this.userProfiles.get(behavior.userId);

    if (!profile) {
      profile = await this.createUserProfile(behavior.userId);
    }

    // Update engagement history
    switch (behavior.action) {
      case 'view':
        profile.engagementHistory.totalViews++;
        if (behavior.duration) {
          profile.engagementHistory.averageReadingTime =
            (profile.engagementHistory.averageReadingTime + behavior.duration) / 2;
        }
        break;
      case 'like':
        profile.engagementHistory.totalLikes++;
        break;
      case 'share':
        profile.engagementHistory.totalShares++;
        break;
    }

    // Update interests based on content interaction
    const content = this.contentFeatures.get(behavior.contentId);
    if (content) {
      this.updateUserInterests(profile, content, behavior.action);
    }

    profile.lastActivity = Date.now();
    this.userProfiles.set(behavior.userId, profile);

    // Persist to storage
    if (this.kv) {
      await this.kv.put(`user_profile:${behavior.userId}`, JSON.stringify(profile), {
        expirationTtl: 30 * 24 * 60 * 60 // 30 days
      });
    }
  }

  // Content management
  async addContent(content: ContentFeatures): Promise<void> {
    this.contentFeatures.set(content.contentId, content);

    // Generate content embedding if vectorize is available
    if (this.vectorize && !content.embedding) {
      content.embedding = await this.generateContentEmbedding(content);

      // Store in vectorize for similarity search
      await this.vectorize.upsert([{
        id: content.contentId,
        values: content.embedding,
        metadata: {
          type: content.type,
          category: content.category,
          tags: content.tags.join(','),
          authorId: content.authorId,
          publishedAt: content.publishedAt
        }
      }]);
    }

    // Update trending calculations
    await this.updateTrendingScores();
  }

  async updateContentEngagement(behavior: UserBehavior): Promise<void> {
    const content = this.contentFeatures.get(behavior.contentId);
    if (!content) {return;}

    switch (behavior.action) {
      case 'view':
        content.engagement.views++;
        break;
      case 'like':
        content.engagement.likes++;
        break;
      case 'share':
        content.engagement.shares++;
        break;
      case 'comment':
        content.engagement.comments++;
        break;
    }

    // Recalculate viral score
    content.viralScore = this.calculateViralScore(content);

    this.contentFeatures.set(behavior.contentId, content);
  }

  // Algorithm implementations
  private async getCollaborativeRecommendations(
    userProfile: UserProfile,
    availableContent: ContentFeatures[],
    limit: number
  ): Promise<RecommendationResult[]> {
    // Find similar users based on behavior
    const similarUsers = await this.findSimilarUsers(userProfile.userId);

    // Get content liked by similar users
    const recommendations: RecommendationResult[] = [];

    for (const similarUser of similarUsers.slice(0, 10)) {
      const userBehaviors = this.behaviorHistory.filter(
        b => b.userId === similarUser.userId &&
            ['like', 'share', 'save'].includes(b.action)
      );

      for (const behavior of userBehaviors) {
        const content = this.contentFeatures.get(behavior.contentId);
        if (!content ?? recommendations.find(r => r.contentId === content.contentId)) {
          continue;
        }

        recommendations.push({
          contentId: content.contentId,
          score: 0.7 * similarUser.similarity,
          confidence: 0.6,
          reason: 'Users with similar interests liked this',
          features: content,
          explanation: {
            primary: 'Recommended based on similar users',
            factors: [
              `${Math.round(similarUser.similarity * 100)}% user similarity`,
              'Positive engagement from similar users',
              `Popular in ${content.category}`
            ]
          }
        });
      }
    }

    return recommendations.slice(0, limit);
  }

  private async getContentBasedRecommendations(
    userProfile: UserProfile,
    availableContent: ContentFeatures[],
    limit: number
  ): Promise<RecommendationResult[]> {
    const recommendations: RecommendationResult[] = [];

    for (const content of availableContent) {
      const score = this.calculateContentScore(content, userProfile);

      if (score > 0.3) {
        recommendations.push({
          contentId: content.contentId,
          score,
          confidence: 0.8,
          reason: 'Matches your interests',
          features: content,
          explanation: {
            primary: 'Based on your content preferences',
            factors: this.explainContentScore(content, userProfile)
          }
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getTrendingRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    const trending = await this.getTrendingContent();

    return trending
      .filter(trend => {
        if (request.contentTypes && !request.contentTypes.includes(trend.category)) {
          return false;
        }
        return true;
      })
      .map(trend => ({
        contentId: trend.contentId,
        score: trend.trendScore,
        confidence: 0.7,
        reason: 'Currently trending',
        features: this.contentFeatures.get(trend.contentId)!,
        explanation: {
          primary: 'Popular content right now',
          factors: [
            `${trend.growthRate.toFixed(1)}% growth in ${trend.timeWindow}`,
            `Trending in ${trend.category}`,
            'High current engagement'
          ]
        }
      }))
      .filter(rec => rec.features)
      .slice(0, request.limit ?? 5);
  }

  private async getPersonalizedRecommendations(
    userProfile: UserProfile,
    availableContent: ContentFeatures[],
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    // Use user's behavior vector to find personalized content
    const recommendations: RecommendationResult[] = [];

    for (const content of availableContent) {
      if (!content.embedding ?? !userProfile.behaviorVector) {
    continue;
  }

      const similarity = this.cosineSimilarity(userProfile.behaviorVector, content.embedding);

      if (similarity > 0.5) {
        recommendations.push({
          contentId: content.contentId,
          score: similarity * 0.9, // High confidence in personalized recs
          confidence: 0.9,
          reason: 'Personalized for you',
          features: content,
          explanation: {
            primary: 'AI-powered personalized recommendation',
            factors: [
              'Matches your unique preferences',
              'Based on your interaction patterns',
              `${Math.round(similarity * 100)}% match score`
            ]
          }
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, request.limit ?? 10);
  }

  // Helper methods
  private combineRecommendations(
    sources: Array<{ recs: RecommendationResult[]; weight: number; source: string }>
  ): RecommendationResult[] {
    const combined = new Map<string, RecommendationResult>();

    for (const { recs, weight, source } of sources) {
      for (const rec of recs) {
        const existing = combined.get(rec.contentId);

        if (existing) {
          // Combine scores with weighted average
          existing.score = (existing.score + rec.score * weight) / 2;
          existing.explanation.factors.push(`Also recommended by ${source}`);
        } else {
          // Add new recommendation with weighted score
          rec.score *= weight;
          rec.explanation.factors.push(`From ${source} algorithm`);
          combined.set(rec.contentId, rec);
        }
      }
    }

    return Array.from(combined.values());
  }

  private async applyContextualFilters(
    recommendations: RecommendationResult[],
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    return recommendations.filter(rec => {
      // Filter by content types
      if (request.contentTypes && !request.contentTypes.includes(rec.features.type)) {
        return false;
      }

      // Filter by categories
      if (request.categories && !request.categories.includes(rec.features.category)) {
        return false;
      }

      // Exclude specific content
      if (request.excludeContentIds?.includes(rec.contentId)) {
        return false;
      }

      // Apply contextual adjustments
      if (request.contextualFactors) {
        rec.score *= this.getContextualMultiplier(rec.features, request.contextualFactors);
      }

      return true;
    });
  }

  private getContextualMultiplier(
    content: ContentFeatures,
    context: NonNullable<RecommendationRequest['contextualFactors']>
  ): number {
    let multiplier = 1.0;

    // Time of day preferences
    if (context.timeOfDay) {
      switch (context.timeOfDay) {
        case 'morning':
          if (content.type === 'article' || content.category === 'news') {multiplier *= 1.2;}
          break;
        case 'evening':
          if (content.type === 'video' || content.category === 'entertainment') {multiplier *= 1.2;}
          break;
      }
    }

    // Device type optimization
    if (context.deviceType) {
      switch (context.deviceType) {
        case 'mobile':
          if (content.readingTime < 5) {multiplier *= 1.1;}
          if (content.type = == 'video' && content.readingTime > 10) {multiplier *= 0.8;}
          break;
        case 'desktop':
          if (content.type === 'article' && content.readingTime > 10) {multiplier *= 1.1;}
          break;
      }
    }

    return multiplier;
  }

  // Utility methods
  private async findSimilarByEmbedding(
    embedding: number[],
    limit: number
  ): Promise<RecommendationResult[]> {
    if (!this.vectorize) {
    return [];
  }

    try {
      const results = await this.vectorize.query(embedding, {
        topK: limit,
        returnMetadata: true
      });

      return results.matches.map((match: unknown) => ({
        contentId: match.id,
        score: match.score,
        confidence: 0.8,
        reason: 'Similar content',
        features: this.contentFeatures.get(match.id)!,
        explanation: {
          primary: 'Content similarity match',
          factors: [
            `${Math.round(match.score * 100)}% similarity`,
            'Based on content analysis',
            'AI-powered matching'
          ]
        }
      })).filter(rec => rec.features);
    } catch (error: unknown) {
      console.error('Vector similarity search failed:', error);
      return [];
    }
  }

  private findSimilarByFeatures(
    targetContent: ContentFeatures,
    limit: number
  ): Promise<RecommendationResult[]> {
    const similar: RecommendationResult[] = [];

    for (const content of this.contentFeatures.values()) {
      if (content.contentId === targetContent.contentId) {
    continue;
  }

      let score = 0;

      // Category match
      if (content.category === targetContent.category) {score += 0.4;}

      // Tag overlap
      const tagOverlap = content.tags.filter(tag =>
        targetContent.tags.includes(tag)
      ).length;
      score += (tagOverlap / Math.max(content.tags.length, targetContent.tags.length)) * 0.3;

      // Type match
      if (content.type === targetContent.type) {score += 0.2;}

      // Author match
      if (content.authorId === targetContent.authorId) {score += 0.1;}

      if (score > 0.3) {
        similar.push({
          contentId: content.contentId,
          score,
          confidence: 0.6,
          reason: 'Similar content features',
          features: content,
          explanation: {
            primary: 'Feature-based similarity',
            factors: [
              content.category === targetContent.category ? 'Same category' : '',
              tagOverlap > 0 ? `${tagOverlap} shared tags` : '',
              content.type === targetContent.type ? 'Same content type' : ''
            ].filter(Boolean)
          }
        });
      }
    }

    return Promise.resolve(
      similar.sort((a, b) => b.score - a.score).slice(0, limit)
    );
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      // Try to load from persistent storage
      if (this.kv) {
        const stored = await this.kv.get(`user_profile:${userId}`, { type: 'json' });
        if (stored) {
          profile = stored;
          this.userProfiles.set(userId, profile);
        }
      }

      // Create new profile if not found
      if (!profile) {
        profile = await this.createUserProfile(userId);
      }
    }

    return profile;
  }

  private async createUserProfile(userId: string): Promise<UserProfile> {
    const profile: UserProfile = { userId,
      interests: [],
      preferredContentTypes: [],
      preferredCategories: [],
      engagementHistory: {
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        averageReadingTime: 0
      },
      behaviorVector: new Array(384).fill(0), // Initialize behavior vector
      lastActivity: Date.now()
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  private updateUserInterests(
    profile: UserProfile,
    content: ContentFeatures,
    action: string
  ): void {
    const weight = this.getActionWeight(action);

    // Update category preferences
    const categoryIndex = profile.preferredCategories.indexOf(content.category);
    if (categoryIndex === -1) {
      profile.preferredCategories.push(content.category);
    }

    // Update content type preferences
    const typeIndex = profile.preferredContentTypes.indexOf(content.type);
    if (typeIndex === -1) {
      profile.preferredContentTypes.push(content.type);
    }

    // Update interests based on tags
    for (const tag of content.tags) {
      if (!profile.interests.includes(tag)) {
        profile.interests.push(tag);
      }
    }

    // Update behavior vector if content has embedding
    if (content.embedding && profile.behaviorVector.length === content.embedding.length) {
      for (let i = 0; i < profile.behaviorVector.length; i++) {
        profile.behaviorVector[i] =
          (profile.behaviorVector[i] + content.embedding[i] * weight) / 2;
      }
    }
  }

  private getActionWeight(action: string): number {
    const weights = {
      'view': 0.1,
      'like': 0.5,
      'share': 0.8,
      'comment': 0.6,
      'save': 0.7,
      'click': 0.3
    };

    return weights[action as keyof typeof weights]  ?? 0.1;
  }

  private calculateContentScore(content: ContentFeatures, userProfile: UserProfile): number {
    let score = 0;

    // Category preference
    if (userProfile.preferredCategories.includes(content.category)) {
      score += 0.3;
    }

    // Content type preference
    if (userProfile.preferredContentTypes.includes(content.type)) {
      score += 0.2;
    }

    // Interest overlap
    const interestOverlap = content.tags.filter(tag =>
      userProfile.interests.includes(tag)
    ).length;
    score += (interestOverlap / Math.max(content.tags.length, 1)) * 0.3;

    // Quality score
    score += content.qualityScore * 0.1;

    // Viral score
    score += content.viralScore * 0.1;

    return Math.min(score, 1.0);
  }

  private explainContentScore(content: ContentFeatures, userProfile: UserProfile): string[] {
    const factors: string[] = [];

    if (userProfile.preferredCategories.includes(content.category)) {
      factors.push(`You like ${content.category} content`);
    }

    if (userProfile.preferredContentTypes.includes(content.type)) {
      factors.push(`You prefer ${content.type} format`);
    }

    const interestOverlap = content.tags.filter(tag =>
      userProfile.interests.includes(tag)
    );
    if (interestOverlap.length > 0) {
      factors.push(`Matches interests: ${interestOverlap.slice(0, 3).join(', ')}`);
    }

    if (content.qualityScore > 0.7) {
      factors.push('High quality content');
    }

    if (content.viralScore > 0.5) {
      factors.push('Popular content');
    }

    return factors;
  }

  private calculateViralScore(content: ContentFeatures): number {
    const { views, likes, shares, comments} = content.engagement;

    if (views === 0) {
    return 0;
  }

    const engagementRate = (likes + shares + comments) / views;
    const shareRate = shares / views;
    const commentRate = comments / views;

    // Weighted viral score
    return Math.min(
      (engagementRate * 0.4 + shareRate * 0.4 + commentRate * 0.2) * 10,
      1.0
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
    return 0;
  }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private async generateContentEmbedding(content: ContentFeatures): Promise<number[]> {
    // Combine title, category, and tags for embedding
    const text = `${content.title} ${content.category} ${content.tags.join(' ')}`;

    // Use AI service to generate embedding if available
    if (this.env?.AI) {
      try {
        const result = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: text
        });
        return result.data ?? result;
      } catch (error: unknown) {
        console.error('Failed to generate embedding:', error);
      }
    }

    // Fallback to simple hash-based embedding
    return this.createSimpleEmbedding(text);
  }

  private createSimpleEmbedding(text: string): number[] {
    const hash = this.simpleHash(text);
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
      hash = hash & hash;
    }
    return hash;
  }

  // Placeholder methods (would be implemented with real data sources)
  private async getAvailableContent(request: RecommendationRequest): Promise<ContentFeatures[]> {
    return Array.from(this.contentFeatures.values());
  }

  private async findSimilarUsers(userId: string): Promise<Array<{ userId: string; similarity: number }>> {
    // Placeholder - would implement user similarity calculation
    return [];
  }

  private async getTrendingContent(): Promise<TrendingContent[]> {
    return this.trendingContent;
  }

  private matchesUserInterests(trend: TrendingContent, userProfile: UserProfile): boolean {
    return userProfile.preferredCategories.includes(trend.category)  ?? userProfile.interests.some(interest => trend.category.includes(interest));
  }

  private calculatePersonalizedTrendScore(trend: TrendingContent, userProfile: UserProfile): number {
    let score = trend.trendScore;

    if (userProfile.preferredCategories.includes(trend.category)) {
      score *= 1.5;
    }

    return Math.min(score, 1.0);
  }

  private async persistBehavior(behavior: UserBehavior): Promise<void> {
    if (!this.kv) {return;}

    const key = `behavior:${behavior.userId}:${behavior.timestamp}`;
    await this.kv.put(key, JSON.stringify(behavior), {
      expirationTtl: 7 * 24 * 60 * 60 // 7 days
    });
  }

  private async updateTrendingScores(): Promise<void> {
    // Placeholder - would implement trending calculation
  }

  private async updateRealtimeRecommendations(userId: string): Promise<void> {
    // Placeholder - would trigger real-time recommendation updates
  }
}