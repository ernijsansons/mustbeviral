/**
 * Universal Platform Agent Interface
 * Defines the contract for all specialized social media platform agents
 * Maximum capability interface for advanced AI reasoning and content generation
 */

export interface PlatformMetrics {
  engagement: number;
  reach: number;
  viralPotential: number;
  algorithmScore: number;
  conversionRate: number;
}

export interface AlgorithmFactors {
  primaryRankingFactors: string[];
  engagementWeights: Record<string, number>;
  contentFormatPreferences: string[];
  optimalTimingPatterns: string[];
  penaltyFactors: string[];
}

export interface ViralMechanics {
  emotionalTriggers: string[];
  sharingPsychology: string[];
  trendingFactors: string[];
  communityEngagement: string[];
  timingStrategies: string[];
}

export interface ContentSpecification {
  format: string;
  maxLength: number;
  minLength: number;
  optimalLength: number;
  requiredElements: string[];
  forbiddenElements: string[];
  hashtagLimit: number;
  mentionLimit: number;
}

export interface ContentOptimization {
  content: string;
  title?: string;
  description?: string;
  hashtags: string[];
  mentions: string[];
  callToAction: string;
  postingSchedule?: {
    optimalTime: string;
    timezone: string;
    frequency: string;
  };
}

export interface ReasoningChain {
  step: number;
  reasoning: string;
  confidence: number;
  algorithmFactors: string[];
  viralPotential: number;
}

export interface AdvancedAnalysis {
  platformScore: number;
  algorithmAlignment: number;
  viralPrediction: number;
  engagementForecast: number;
  competitiveAdvantage: number;
  reasoningChain: ReasoningChain[];
  optimizationSuggestions: string[];
  riskFactors: string[];
  opportunityAreas: string[];
}

export interface ContentGenerationRequest {
  topic: string;
  tone: 'professional' | 'casual' | 'humorous' | 'inspiring' | 'educational' | 'controversial' | 'emotional';
  targetAudience: string;
  contentType: string;
  goals: ('awareness' | 'engagement' | 'conversion' | 'viral' | 'community')[];
  keywords?: string[];
  competitorAnalysis?: boolean;
  trendAnalysis?: boolean;
  maxTokens?: number;
}

export interface BatchGenerationRequest {
  requests: ContentGenerationRequest[];
  crossPlatformOptimization: boolean;
  generateVariations: number;
  includePerformancePrediction: boolean;
}

export interface TrendAnalysis {
  currentTrends: Array<{
    trend: string;
    momentum: number;
    peakPrediction: string;
    relevanceScore: number;
    competitionLevel: number;
  }>;
  emergingTopics: string[];
  decliningTrends: string[];
  seasonalPatterns: string[];
  viralOpportunities: string[];
}

export interface CompetitorInsights {
  topPerformers: Array<{
    content: string;
    metrics: PlatformMetrics;
    successFactors: string[];
  }>;
  contentGaps: string[];
  opportunityAreas: string[];
  benchmarkScores: PlatformMetrics;
}

export interface IPlatformAgent {
  readonly platformName: string;
  readonly algorithmVersion: string;
  readonly maxTokenOutput: number;
  readonly supportedContentTypes: string[];

  // Core Algorithm Knowledge
  getAlgorithmFactors(): AlgorithmFactors;
  getViralMechanics(): ViralMechanics;
  getContentSpecifications(contentType: string): ContentSpecification;

  // Advanced Content Generation (Maximum Token Output)
  generateContent(request: ContentGenerationRequest): Promise<{
    content: string;
    optimization: ContentOptimization;
    analysis: AdvancedAnalysis;
    metadata: {
      tokensUsed: number;
      generationTime: number;
      modelUsed: string;
      confidenceScore: number;
    };
  }>;

  // Batch Processing for Maximum Efficiency
  generateBatch(request: BatchGenerationRequest): Promise<Array<{
    content: string;
    optimization: ContentOptimization;
    analysis: AdvancedAnalysis;
    platformVariations?: Record<string, string>;
  }>>;

  // Maximum Reasoning Capabilities
  analyzeContent(content: string): Promise<AdvancedAnalysis>;
  optimizeForAlgorithm(content: string): Promise<ContentOptimization>;
  predictViralPotential(content: string): Promise<{
    score: number;
    factors: string[];
    improvements: string[];
    reasoningChain: ReasoningChain[];
  }>;

  // Advanced Analytics and Intelligence
  analyzeTrends(): Promise<TrendAnalysis>;
  getCompetitorInsights(topic: string): Promise<CompetitorInsights>;
  forecastPerformance(content: string): Promise<{
    predictedMetrics: PlatformMetrics;
    confidence: number;
    timeframe: string;
    factors: string[];
  }>;

  // Real-time Optimization
  realTimeOptimize(content: string, currentMetrics?: PlatformMetrics): Promise<{
    optimizedContent: string;
    changes: Array<{
      type: string;
      original: string;
      optimized: string;
      reasoning: string;
      expectedImpact: number;
    }>;
    emergencyFixes: string[];
  }>;

  // Cross-platform Intelligence
  adaptForPlatform(content: string, sourcePlatform: string): Promise<{
    adaptedContent: string;
    adaptationStrategy: string[];
    retainedElements: string[];
    modifiedElements: string[];
    platformSpecificEnhancements: string[];
  }>;

  // Advanced A/B Testing
  generateTestVariations(content: string, variationCount: number): Promise<Array<{
    variation: string;
    testHypothesis: string;
    expectedOutcome: string;
    successMetrics: string[];
    riskLevel: number;
  }>>;

  // Maximum Token Utilization
  generateLongFormContent(request: ContentGenerationRequest & {
    sections: string[];
    targetWordCount: number;
  }): Promise<{
    fullContent: string;
    sections: Record<string, string>;
    executiveSummary: string;
    keyTakeaways: string[];
    optimization: ContentOptimization;
    distributionStrategy: {
      primaryPost: string;
      followUpPosts: string[];
      crossPromotionPosts: string[];
    };
  }>;

  // Intelligence Metrics
  getAgentCapabilities(): {
    maxReasoningDepth: number;
    supportedAnalysisTypes: string[];
    algorithmKnowledgeScope: string[];
    viralMechanicsExpertise: string[];
    contentOptimizationCapabilities: string[];
    realTimeAdaptationSpeed: number;
    crossPlatformIntelligence: boolean;
    competitorAnalysisDepth: number;
    trendPredictionAccuracy: number;
  };

  // Error Handling and Fallbacks
  handleGenerationFailure(error: Error, request: ContentGenerationRequest): Promise<{
    fallbackContent: string;
    errorAnalysis: string;
    retryStrategy: string;
    preventionMeasures: string[];
  }>;

  // Performance Monitoring
  getPerformanceMetrics(): {
    averageResponseTime: number;
    successRate: number;
    averageTokenUtilization: number;
    algorithmAccuracy: number;
    viralPredictionAccuracy: number;
    contentQualityScore: number;
  };
}

export interface PlatformAgentConfig {
  maxTokens: number;
  enableRealTimeOptimization: boolean;
  enableCompetitorAnalysis: boolean;
  enableTrendAnalysis: boolean;
  enableCrossPlatformAdaptation: boolean;
  performanceMonitoring: boolean;
  errorRecoveryEnabled: boolean;
  batchProcessingEnabled: boolean;
  advancedReasoningEnabled: boolean;
}

export interface AgentFactory {
  createAgent(platform: string, config: PlatformAgentConfig): IPlatformAgent;
  getSupportedPlatforms(): string[];
  getAgentCapabilities(platform: string): ReturnType<IPlatformAgent['getAgentCapabilities']>;
}